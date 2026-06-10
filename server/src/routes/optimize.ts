import { Router } from 'express'
import Groq from 'groq-sdk'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

// ── Constants ─────────────────────────────────────────────────────────────────

const ANTERIOR_MUSCLES = new Set([
  'Pecho', 'Hombros', 'Tríceps', 'Cuádriceps', 'Abdominales', 'Oblicuos',
])
const POSTERIOR_MUSCLES = new Set([
  'Dorsal', 'Espalda', 'Espalda baja', 'Bíceps',
  'Isquios', 'Glúteos', 'Gemelos', 'Sóleos', 'Trapecios',
])

const MUSCLE_TARGETS: Record<string, { min: number; max: number }> = {
  'Pecho':       { min: 10, max: 20 },
  'Hombros':     { min: 12, max: 20 },
  'Tríceps':     { min: 8,  max: 16 },
  'Dorsal':      { min: 10, max: 20 },
  'Espalda':     { min: 10, max: 20 },
  'Espalda baja':{ min: 6,  max: 12 },
  'Bíceps':      { min: 8,  max: 16 },
  'Cuádriceps':  { min: 10, max: 20 },
  'Isquios':     { min: 10, max: 16 },
  'Glúteos':     { min: 10, max: 20 },
  'Gemelos':     { min: 8,  max: 16 },
  'Sóleos':      { min: 6,  max: 12 },
  'Abdominales': { min: 6,  max: 14 },
  'Oblicuos':    { min: 4,  max: 10 },
  'Trapecios':   { min: 6,  max: 14 },
}

// ── Zod schema for LLM response (section 7.4) ──────────────────────────────

const LLMResponseSchema = z.object({
  muscleSummary: z.array(z.object({
    muscle:         z.string(),
    weeklySets:     z.number(),
    status:         z.enum(['low', 'optimal', 'high']),
    minRecommended: z.number(),
    maxRecommended: z.number(),
    recommendation: z.string(),
  })),
  chainBalance: z.object({
    anteriorRatio: z.number().min(0).max(1),
    posteriorRatio: z.number().min(0).max(1),
    status:  z.enum(['balanced', 'anterior_dominant', 'posterior_dominant']),
    comment: z.string(),
  }),
  priorityCoverage: z.array(z.object({
    muscle:     z.string(),
    weeklySets: z.number(),
    covered:    z.boolean(),
  })),
  suggestions: z.array(z.object({
    dayId:             z.string(),
    itemId:            z.string().nullable(),
    type:              z.enum(['replace', 'add', 'remove']),
    currentExercise:   z.string().nullable(),
    suggestedExercise: z.string(),
    reason:            z.string(),
    priority:          z.enum(['high', 'medium', 'low']),
  })).max(5),
  overallScore: z.number().int().min(0).max(100),
  summary:      z.string(),
})

type LLMResponse = z.infer<typeof LLMResponseSchema>

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoutineData {
  id: string
  name: string
  days: Array<{
    id: string
    dayNumber: number
    label: string
    items: Array<{
      id: string
      sets: number
      reps: string
      exercise: { name: string; primaryMuscle: string; secondary: string; chain: string }
    }>
  }>
}

// ── Volume analysis ───────────────────────────────────────────────────────────

function computeVolume(routine: RoutineData) {
  const muscleSets = new Map<string, number>()
  let anteriorSets = 0
  let posteriorSets = 0

  for (const day of routine.days) {
    for (const item of day.items) {
      const primary = item.exercise.primaryMuscle
      let secondary: string[] = []
      try { secondary = JSON.parse(item.exercise.secondary) } catch { /* ok */ }

      muscleSets.set(primary, (muscleSets.get(primary) ?? 0) + item.sets)
      if (ANTERIOR_MUSCLES.has(primary)) anteriorSets += item.sets
      else if (POSTERIOR_MUSCLES.has(primary)) posteriorSets += item.sets

      for (const sec of secondary) {
        muscleSets.set(sec, (muscleSets.get(sec) ?? 0) + item.sets * 0.5)
        if (ANTERIOR_MUSCLES.has(sec)) anteriorSets += item.sets * 0.5
        else if (POSTERIOR_MUSCLES.has(sec)) posteriorSets += item.sets * 0.5
      }
    }
  }

  return { muscleSets, anteriorSets, posteriorSets }
}

// ── Prompts (sections 7.2 & 7.3) ─────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `Sos un entrenador personal experto en programación de fuerza e hipertrofia, con conocimiento profundo de los principios de Israetel, Helms y Nuckols.

Tu tarea es analizar rutinas de entrenamiento y generar optimizaciones específicas y accionables.

REGLAS ESTRICTAS:
1. Respondés ÚNICAMENTE con JSON válido, sin texto adicional ni markdown
2. Las sugerencias usan nombres EXACTOS del catálogo de ejercicios proporcionado
3. Los IDs (dayId, itemId) son los IDs REALES de la rutina, copiados exactamente
4. Priorizás los grupos musculares indicados por el usuario
5. Rangos de volumen óptimo: 10-20 series semanales para grupos grandes, 8-16 para pequeños
6. Balance ideal cadena anterior/posterior: 45-55% cada una
7. Máximo 5 sugerencias, ordenadas por impacto descendente
8. Las razones son concisas, máximo 2 oraciones en español
9. El overallScore refleja qué tan cercana está la rutina al óptimo para el objetivo del usuario`
}

function buildUserPrompt(
  routine: RoutineData,
  user: { name: string; goal: string | null; daysPerWeek: number | null; priorities: string | null } | null,
  muscleSets: Map<string, number>,
  anteriorSets: number,
  posteriorSets: number,
  catalog: Array<{ id: string; name: string; primaryMuscle: string; chain: string }>,
): string {
  let priorities: string[] = []
  try { priorities = JSON.parse(user?.priorities ?? '[]') } catch { /* ok */ }

  const totalChain = anteriorSets + posteriorSets
  const anteriorPct = totalChain > 0 ? Math.round((anteriorSets / totalChain) * 100) : 50
  const posteriorPct = 100 - anteriorPct

  const muscleTable = [...muscleSets.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([m, s]) => {
      const target = MUSCLE_TARGETS[m]
      const status = !target ? 'sin referencia'
        : s < target.min ? `BAJO (mín ${target.min})`
        : s > target.max ? `ALTO (máx ${target.max})`
        : 'óptimo'
      return `  - ${m}: ${Math.round(s * 10) / 10} series → ${status}`
    })
    .join('\n')

  const routineStr = routine.days.map((d) =>
    `  Día ${d.dayNumber} "${d.label}" [dayId: ${d.id}]\n` +
    (d.items.length === 0
      ? '    (sin ejercicios)'
      : d.items.map((i) =>
          `    • [itemId: ${i.id}] ${i.exercise.name} — ${i.sets}×${i.reps} (${i.exercise.primaryMuscle})`
        ).join('\n'))
  ).join('\n\n')

  const catalogStr = catalog
    .map((e) => `  - ${e.name} (${e.primaryMuscle}, ${e.chain})`)
    .join('\n')

  const jsonSchema = `{
  "muscleSummary": [
    {"muscle":string,"weeklySets":number,"status":"low"|"optimal"|"high",
     "minRecommended":number,"maxRecommended":number,"recommendation":string}
  ],
  "chainBalance": {
    "anteriorRatio":number(0-1),"posteriorRatio":number(0-1),
    "status":"balanced"|"anterior_dominant"|"posterior_dominant","comment":string
  },
  "priorityCoverage": [{"muscle":string,"weeklySets":number,"covered":boolean}],
  "suggestions": [
    {"dayId":string,"itemId":string|null,"type":"replace"|"add"|"remove",
     "currentExercise":string|null,"suggestedExercise":string,
     "reason":string,"priority":"high"|"medium"|"low"}
  ],
  "overallScore":number(0-100),
  "summary":string
}`

  return `# Análisis de rutina de entrenamiento

## Perfil del usuario
- Nombre: ${user?.name ?? 'Usuario'}
- Objetivo: ${user?.goal ?? 'No especificado'}
- Días de entrenamiento por semana: ${user?.daysPerWeek ?? 'No especificado'}
- Grupos priorizados: ${priorities.length > 0 ? priorities.join(', ') : 'No especificados'}

## Volumen semanal calculado (primario×1 + secundario×0.5)
${muscleTable || '  (rutina vacía)'}

## Balance de cadena
- Anterior (pecho, hombros, tríceps, cuádriceps, abdominales): ${Math.round(anteriorSets * 10) / 10} series → ${anteriorPct}%
- Posterior (espalda, bíceps, isquios, glúteos, gemelos): ${Math.round(posteriorSets * 10) / 10} series → ${posteriorPct}%

## Estructura de la rutina (con IDs reales)
${routineStr || '  (rutina vacía)'}

## Catálogo de ejercicios disponibles para sugerencias
${catalogStr}

## Formato de respuesta requerido (JSON estricto, sin markdown)
${jsonSchema}

Generá el análisis. Usá los IDs exactos de dayId e itemId de la rutina y nombres exactos del catálogo.`
}

// ── Groq call ─────────────────────────────────────────────────────────────────

async function callGroq(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY no configurada en el servidor')

  const groq = new Groq({ apiKey: key })
  const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'

  async function attempt(isRetry: boolean): Promise<LLMResponse> {
    const retryNote = isRetry
      ? '\n\n⚠️ El intento anterior falló la validación de esquema. Incluí TODOS los campos requeridos con los tipos correctos.'
      : ''
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt + retryNote },
      ],
      response_format: { type: 'json_object' },
    })
    const raw = (completion.choices[0].message.content ?? '').trim()
    // Strip markdown code fences just in case
    const json = raw.startsWith('{') ? raw : (raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1] ?? raw)
    return LLMResponseSchema.parse(JSON.parse(json))
  }

  try {
    return await attempt(false)
  } catch (_err) {
    console.warn('[optimize] Primer intento falló, reintentando...')
    return await attempt(true)
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router()

router.post('/:id/optimize', requireAuth, async (req, res) => {
  try {
    const routine = await prisma.routine.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: { exercise: true },
            },
          },
        },
      },
    })
    if (!routine) {
      res.status(404).json({ error: 'Rutina no encontrada' })
      return
    }

    const [user, catalog] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.userId },
        select: { name: true, goal: true, daysPerWeek: true, priorities: true },
      }),
      prisma.exercise.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, primaryMuscle: true, chain: true },
      }),
    ])

    const catalogByName = new Map(catalog.map((e) => [e.name.toLowerCase(), e]))

    // Map Prisma result to typed structure
    const routineData: RoutineData = {
      id: routine.id,
      name: routine.name,
      days: routine.days.map((d) => ({
        id: d.id,
        dayNumber: d.dayNumber,
        label: d.label,
        items: d.items.map((i) => ({
          id: i.id,
          sets: i.sets,
          reps: i.reps,
          exercise: {
            name: i.exercise.name,
            primaryMuscle: i.exercise.primaryMuscle,
            secondary: i.exercise.secondary,
            chain: i.exercise.chain,
          },
        })),
      })),
    }

    const { muscleSets, anteriorSets, posteriorSets } = computeVolume(routineData)

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(
      routineData, user, muscleSets, anteriorSets, posteriorSets, catalog,
    )

    const llmResult = await callGroq(systemPrompt, userPrompt)

    // Augment each suggestion with the resolved exercise ID from the catalog
    const augmented = {
      ...llmResult,
      suggestions: llmResult.suggestions.map((s) => ({
        ...s,
        suggestedExerciseId: catalogByName.get(s.suggestedExercise.toLowerCase())?.id ?? null,
      })),
    }

    res.json(augmented)
  } catch (err) {
    console.error('[optimize]', err)
    const message = err instanceof Error ? err.message : 'Error desconocido'
    res.status(500).json({ error: message })
  }
})

export default router
