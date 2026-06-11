import { Router } from 'express'
import Groq from 'groq-sdk'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { validate } from '../lib/validate'
import { getGoalDefaults } from '../lib/goalDefaults'

const router = Router()

// ── Schemas ───────────────────────────────────────────────────────────────────

const GenerateRequestSchema = z.object({
  goal: z.string().min(1),
  daysPerWeek: z.number().int().min(1).max(7),
  priorities: z.array(z.string()).default([]),
  suggestion: z.string().optional(),
  currentPlan: z.string().optional(),
})

const LLMGenerateSchema = z.object({
  name: z.string().min(1).max(100),
  days: z
    .array(
      z.object({
        dayNumber: z.coerce.number().int().min(1).max(7),
        label: z.string().min(1).max(120),
        items: z.array(
          z.object({
            // El LLM devuelve el número de referencia del catálogo (no el cuid)
            ref: z.coerce.number().int().min(1),
            sets: z.coerce.number().int().min(1).max(10),
            reps: z.string().regex(/^\d+(-\d+)?$/),
            restSeconds: z.coerce.number().int().min(0).max(600),
          }),
        ),
      }),
    )
    .min(1)
    .max(7),
})

const FromPlanSchema = z.object({
  name: z.string().min(1).max(100),
  days: z
    .array(
      z.object({
        dayNumber: z.number().int().min(1).max(7),
        label: z.string().min(1).max(120),
        items: z.array(
          z.object({
            exerciseId: z.string().min(1),
            sets: z.number().int().min(1).max(20),
            reps: z.string().min(1).max(20),
            restSeconds: z.number().int().min(0).max(600),
          }),
        ),
      }),
    )
    .min(1)
    .max(7),
})

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `Sos un entrenador personal experto en programación de fuerza e hipertrofia, con conocimiento en los principios de Israetel, Helms y Nuckols.
Tu tarea es crear rutinas de entrenamiento completas, bien estructuradas y científicamente válidas.

REGLAS ESTRICTAS:
1. Respondés ÚNICAMENTE con JSON válido, sin texto adicional ni markdown
2. El "ref" de cada ejercicio es el NÚMERO del catálogo numerado proporcionado — elegí solo números que aparezcan en la lista, nunca inventes ni uses números fuera de rango
3. El número de días debe coincidir exactamente con daysPerWeek del usuario
4. dayNumber va de 1 a daysPerWeek sin repetir
5. sets: entero 1-10, reps: formato "N" o "N-M" (ej: "5" o "8-12"), restSeconds: entero 30-600
6. Cada día tiene entre 4 y 7 ejercicios
7. El split es coherente con los días disponibles y el objetivo
8. Priorizás los grupos musculares indicados
9. Los parámetros respetan el objetivo: Fuerza→5×3-6/180s, Hipertrofia→4×8-12/90s, Resistencia→3×15-20/45s, Pérdida de peso→3×12-15/60s`
}

function buildUserPrompt(
  catalog: Array<{ id: string; name: string; primaryMuscle: string; chain: string }>,
  goal: string,
  daysPerWeek: number,
  priorities: string[],
  suggestion?: string,
  currentPlan?: string,
): string {
  const defaults = getGoalDefaults(goal)

  const catalogStr = catalog
    .map((e, i) => `  ${i + 1}. ${e.name} [${e.primaryMuscle} · ${e.chain}]`)
    .join('\n')

  const jsonSchema = `{
  "name": string,
  "days": [
    {
      "dayNumber": number(1-${daysPerWeek}),
      "label": string,
      "items": [
        {"ref": number, "sets": number, "reps": string, "restSeconds": number}
      ]
    }
  ]
}`

  const refinementBlock = suggestion && currentPlan
    ? `\n## Rutina actual (a modificar)\n${currentPlan}\n\n## Sugerencia del usuario\n${suggestion}\n\nAplicá la sugerencia a la rutina actual manteniendo la estructura general.`
    : ''

  const action = suggestion && currentPlan
    ? `Refiná la rutina aplicando la sugerencia del usuario.`
    : `Generá una rutina de exactamente ${daysPerWeek} día(s) con el split más apropiado para "${goal}".`

  return `# Generar rutina de entrenamiento

## Perfil del usuario
- Objetivo: ${goal}
- Días por semana: ${daysPerWeek}
- Grupos priorizados: ${priorities.length > 0 ? priorities.join(', ') : 'ninguno en particular'}

## Parámetros de referencia para "${goal}"
- Series: ${defaults.sets}, Reps: ${defaults.reps}, Descanso: ${defaults.restSeconds}s

## Catálogo de ejercicios disponibles (elegí por el NÚMERO de la izquierda → ese es el "ref")
${catalogStr}
${refinementBlock}
## Formato de respuesta requerido (JSON estricto, sin markdown)
${jsonSchema}

${action} En cada item, "ref" es el número del ejercicio en el catálogo de arriba (entre 1 y ${catalog.length}).`
}

// ── Groq call ─────────────────────────────────────────────────────────────────

async function callGroq(
  catalog: Array<{ id: string; name: string; primaryMuscle: string; chain: string }>,
  goal: string,
  daysPerWeek: number,
  priorities: string[],
  suggestion?: string,
  currentPlan?: string,
): Promise<z.infer<typeof LLMGenerateSchema>> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY no configurada en el servidor')

  const groq = new Groq({ apiKey: key })
  const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'
  const userPrompt = buildUserPrompt(catalog, goal, daysPerWeek, priorities, suggestion, currentPlan)

  async function attempt(isRetry: boolean): Promise<z.infer<typeof LLMGenerateSchema>> {
    const note = isRetry
      ? `\n\n⚠️ Intento anterior falló validación. Usá solo números de "ref" entre 1 y ${catalog.length} del catálogo, y formato "N-M" para reps.`
      : ''
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: userPrompt + note },
      ],
      response_format: { type: 'json_object' },
    })
    const raw = (completion.choices[0].message.content ?? '').trim()
    const json = raw.startsWith('{') ? raw : (raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1] ?? raw)
    const parsed = LLMGenerateSchema.parse(JSON.parse(json))

    // Validar que todos los "ref" estén dentro del rango del catálogo
    for (const day of parsed.days) {
      for (const item of day.items) {
        if (item.ref < 1 || item.ref > catalog.length) {
          throw new Error(`ref fuera de rango: ${item.ref} (catálogo: 1-${catalog.length})`)
        }
      }
    }
    return parsed
  }

  try {
    return await attempt(false)
  } catch {
    console.warn('[generate] Primer intento fallido, reintentando...')
    return await attempt(true)
  }
}

// ── POST /generate ────────────────────────────────────────────────────────────

router.post('/generate', requireAuth, validate(GenerateRequestSchema), async (req, res) => {
  try {
    const { goal, daysPerWeek, priorities, suggestion, currentPlan } = req.body as z.infer<typeof GenerateRequestSchema>

    const catalog = await prisma.exercise.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, primaryMuscle: true, chain: true },
    })

    if (catalog.length === 0) {
      throw new Error('El catálogo de ejercicios está vacío en la base de datos (¿corrió el seed?)')
    }

    const llmResult = await callGroq(catalog, goal, daysPerWeek, priorities, suggestion, currentPlan)

    // Mapear cada "ref" (número del catálogo) al ejercicio real. El rango ya fue
    // validado dentro de callGroq, así que catalog[ref - 1] siempre existe.
    const result = {
      name: llmResult.name,
      days: llmResult.days.map((day) => ({
        dayNumber: day.dayNumber,
        label: day.label,
        items: day.items.map((item) => {
          const ex = catalog[item.ref - 1]
          return {
            exerciseId: ex.id,
            exerciseName: ex.name,
            primaryMuscle: ex.primaryMuscle,
            sets: item.sets,
            reps: item.reps,
            restSeconds: item.restSeconds,
          }
        }),
      })),
    }

    res.json(result)
  } catch (err) {
    console.error('[generate]', err)
    const message = err instanceof Error ? err.message : 'Error desconocido'
    res.status(500).json({ error: `Error al generar la rutina: ${message}` })
  }
})

// ── POST /from-plan ───────────────────────────────────────────────────────────

router.post('/from-plan', requireAuth, validate(FromPlanSchema), async (req, res) => {
  try {
    const { name, days } = req.body as z.infer<typeof FromPlanSchema>

    const routine = await prisma.$transaction(async (tx) => {
      const created = await tx.routine.create({
        data: { name, userId: req.userId },
      })

      for (let di = 0; di < days.length; di++) {
        const day = days[di]
        const createdDay = await tx.routineDay.create({
          data: { routineId: created.id, dayNumber: day.dayNumber, label: day.label },
        })

        if (day.items.length > 0) {
          await tx.routineItem.createMany({
            data: day.items.map((item, idx) => ({
              dayId: createdDay.id,
              exerciseId: item.exerciseId,
              sets: item.sets,
              reps: item.reps,
              restSeconds: item.restSeconds,
              order: idx + 1,
            })),
          })
        }
      }

      return created
    })

    res.status(201).json({ id: routine.id })
  } catch (err) {
    console.error('[from-plan]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
