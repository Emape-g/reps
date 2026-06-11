import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, LayoutTemplate, PenLine,
  RotateCw, Dumbbell, AlertCircle, ChevronRight, Trash2, Send,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { getGoalDefaults } from '../lib/goalDefaults'
import { muscleBadgeClass } from '../components/ExerciseSearchModal'

// ── Types ─────────────────────────────────────────────────────────────────────

type Path = 'ai' | 'template' | 'scratch'

interface ProposedItem {
  exerciseId: string
  exerciseName: string
  primaryMuscle: string
  sets: number
  reps: string
  restSeconds: number
}

interface ProposedDay {
  dayNumber: number
  label: string
  items: ProposedItem[]
}

interface ProposedRoutine {
  name: string
  days: ProposedDay[]
}

interface CatalogExercise {
  id: string
  name: string
  primaryMuscle: string
  chain: string
}

// ── Template definitions ──────────────────────────────────────────────────────

const PUSH_EX = [
  'Press de banca plano', 'Press con mancuernas inclinado', 'Press militar con barra',
  'Elevaciones laterales', 'Extensión de tríceps en polea', 'Fondos en paralelas',
]
const PULL_EX = [
  'Dominadas', 'Jalón al pecho', 'Remo con barra',
  'Face pull', 'Curl de bíceps con barra', 'Curl martillo',
]
const LEGS_EX = [
  'Sentadilla con barra', 'Prensa de piernas', 'Peso muerto rumano',
  'Hip thrust con barra', 'Elevación de talones de pie',
]
const UPPER_EX = [
  'Press de banca plano', 'Press militar con barra', 'Dominadas',
  'Remo con barra', 'Curl de bíceps con barra', 'Extensión de tríceps en polea',
]
const LOWER_EX = [
  'Sentadilla con barra', 'Prensa de piernas', 'Peso muerto rumano',
  'Hip thrust con barra', 'Elevación de talones de pie',
]
const FB_EX = [
  'Sentadilla con barra', 'Press de banca plano', 'Dominadas',
  'Remo con barra', 'Peso muerto rumano',
]
const CB_EX = [
  'Press de banca plano', 'Press con mancuernas inclinado', 'Aperturas con mancuernas',
  'Dominadas', 'Jalón al pecho', 'Remo con barra',
]
const SA_EX = [
  'Press Arnold', 'Elevaciones laterales', 'Curl de bíceps con barra',
  'Curl martillo', 'Extensión de tríceps en polea', 'Fondos en paralelas',
]

interface TemplateDaySpec { label: string; exercises: string[] }

interface TemplateSpec {
  id: string
  name: string
  description: string
  minDays: number
  maxDays: number
  buildDays: (n: number) => TemplateDaySpec[]
}

const TEMPLATES: TemplateSpec[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Divide los días en empuje, tirón y piernas. Ideal para 3-6 días.',
    minDays: 3, maxDays: 6,
    buildDays: (n) => {
      const cycle: TemplateDaySpec[] = [
        { label: 'Push — Pecho · Hombros · Tríceps', exercises: PUSH_EX },
        { label: 'Pull — Espalda · Bíceps', exercises: PULL_EX },
        { label: 'Piernas', exercises: LEGS_EX },
      ]
      return Array.from({ length: n }, (_, i) => cycle[i % 3])
    },
  },
  {
    id: 'ul',
    name: 'Upper / Lower',
    description: 'Alterna tren superior e inferior. Óptimo para 3-4 días.',
    minDays: 3, maxDays: 4,
    buildDays: (n) => {
      const cycle: TemplateDaySpec[] = [
        { label: 'Tren Superior', exercises: UPPER_EX },
        { label: 'Tren Inferior', exercises: LOWER_EX },
      ]
      return Array.from({ length: n }, (_, i) => cycle[i % 2])
    },
  },
  {
    id: 'fb',
    name: 'Full Body',
    description: 'Cada sesión trabaja todo el cuerpo. Perfecto para 2-4 días.',
    minDays: 2, maxDays: 4,
    buildDays: (n) => Array.from({ length: n }, () => ({ label: 'Cuerpo Completo', exercises: FB_EX })),
  },
  {
    id: 'arnold',
    name: 'Arnold Split',
    description: 'Pecho+Espalda · Hombros+Brazos · Piernas · repite. Solo 6 días.',
    minDays: 6, maxDays: 6,
    buildDays: () => [
      { label: 'Pecho + Espalda', exercises: CB_EX },
      { label: 'Hombros + Brazos', exercises: SA_EX },
      { label: 'Piernas', exercises: LEGS_EX },
      { label: 'Pecho + Espalda', exercises: CB_EX },
      { label: 'Hombros + Brazos', exercises: SA_EX },
      { label: 'Piernas', exercises: LEGS_EX },
    ],
  },
]

function buildTemplateRoutine(
  template: TemplateSpec,
  daysPerWeek: number,
  goal: string | null | undefined,
  catalogByName: Map<string, CatalogExercise>,
): ProposedRoutine {
  const defaults = getGoalDefaults(goal)
  const days = template.buildDays(daysPerWeek)
  return {
    name: template.name,
    days: days.map((day, idx) => ({
      dayNumber: idx + 1,
      label: day.label,
      items: day.exercises
        .map((name) => catalogByName.get(name))
        .filter((e): e is CatalogExercise => !!e)
        .map((ex) => ({
          exerciseId: ex.id,
          exerciseName: ex.name,
          primaryMuscle: ex.primaryMuscle,
          sets: defaults.sets,
          reps: defaults.reps,
          restSeconds: defaults.restSeconds,
        })),
    })),
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GOALS = ['Fuerza', 'Hipertrofia', 'Resistencia', 'Pérdida de peso'] as const
const MUSCLES = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core'] as const
const WEEKDAY: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom' }

const LOADING_MESSAGES = [
  'Analizando tu perfil...',
  'Seleccionando ejercicios...',
  'Diseñando el split...',
  'Ajustando el volumen semanal...',
  'Finalizando tu rutina...',
]

// ── Sub-components ────────────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            s === step ? 'w-8 bg-primary' : s < step ? 'w-3 bg-primary/40' : 'w-3 bg-border'
          }`}
        />
      ))}
    </div>
  )
}

function EditableDayCard({
  day,
  onUpdate,
  onRemove,
}: {
  day: ProposedDay
  onUpdate: (itemIdx: number, field: 'sets' | 'reps', value: string | number) => void
  onRemove: (itemIdx: number) => void
}) {
  return (
    <div className="bg-surface-hi border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-border">
        <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
          {WEEKDAY[day.dayNumber] ?? `Día ${day.dayNumber}`}
        </span>
        <span className="text-sm font-semibold text-text truncate">{day.label}</span>
        <span className="ml-auto text-[10px] text-muted shrink-0">{day.items.length} ejercicios</span>
      </div>
      {day.items.length === 0 ? (
        <p className="text-xs text-muted text-center py-4">Sin ejercicios</p>
      ) : (
        <div className="divide-y divide-border/30">
          {day.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${muscleBadgeClass(item.primaryMuscle)}`}>
                    {item.primaryMuscle}
                  </span>
                  <span className="text-xs text-text truncate">{item.exerciseName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted uppercase tracking-wide">Series</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={item.sets}
                    onChange={(e) => onUpdate(idx, 'sets', parseInt(e.target.value) || 1)}
                    className="w-11 text-xs text-center bg-surface border border-border rounded-lg px-1 py-0.5 text-text focus:border-primary focus:outline-none"
                  />
                  <label className="text-[10px] text-muted uppercase tracking-wide">Reps</label>
                  <input
                    type="text"
                    value={item.reps}
                    onChange={(e) => onUpdate(idx, 'reps', e.target.value)}
                    className="w-16 text-xs text-center bg-surface border border-border rounded-lg px-1 py-0.5 text-text focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => onRemove(idx)}
                className="shrink-0 p-1.5 text-muted hover:text-danger transition-colors rounded-lg hover:bg-danger/10"
                title="Eliminar ejercicio"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NewRoutine() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [path, setPath] = useState<Path | null>(null)

  // AI config (pre-populated from user profile)
  const [aiGoal, setAiGoal] = useState(user?.goal ?? 'Hipertrofia')
  const [aiDays, setAiDays] = useState(user?.daysPerWeek ?? 4)
  const [aiPriorities, setAiPriorities] = useState<string[]>(() => {
    try { return JSON.parse(user?.priorities ?? '[]') as string[] } catch { return [] }
  })

  // Template
  const [catalog, setCatalog] = useState<CatalogExercise[] | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  // Scratch
  const [scratchName, setScratchName] = useState('Mi rutina')
  const [scratchDays, setScratchDays] = useState(user?.daysPerWeek ?? 3)

  // Shared
  const [proposed, setProposed] = useState<ProposedRoutine | null>(null)
  const [routineName, setRoutineName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const [suggestion, setSuggestion] = useState('')
  const [refining, setRefining] = useState(false)

  // Cycle loading messages while generating
  useEffect(() => {
    if (!generating) { setLoadingMsgIdx(0); return }
    const t = setInterval(() => setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 1800)
    return () => clearInterval(t)
  }, [generating])

  // Fetch catalog when template path is chosen
  useEffect(() => {
    if (path !== 'template' || catalog !== null) return
    apiFetch('/api/exercises')
      .then((r) => (r.ok ? (r.json() as Promise<CatalogExercise[]>) : Promise.reject()))
      .then(setCatalog)
      .catch(() => setCatalogError('No se pudo cargar el catálogo de ejercicios.'))
  }, [path, catalog])

  // ── Actions ──────────────────────────────────────────────────────────────────

  function choosePath(p: Path) {
    setPath(p)
    setGenError(null)
    setSaveError(null)
    setProposed(null)
    setStep(2)
  }

  function togglePriority(m: string) {
    setAiPriorities((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  async function callGenerate(): Promise<void> {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await apiFetch('/api/routines/generate', {
        method: 'POST',
        body: JSON.stringify({ goal: aiGoal, daysPerWeek: aiDays, priorities: aiPriorities }),
      })
      const body = (await res.json()) as ProposedRoutine & { error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Error al generar la rutina')
      setProposed(body)
      setRoutineName(body.name)
      setStep(3)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Error al contactar con el servidor')
    } finally {
      setGenerating(false)
    }
  }

  function updateItem(dayNum: number, itemIdx: number, field: 'sets' | 'reps', value: string | number) {
    if (!proposed) return
    setProposed({
      ...proposed,
      days: proposed.days.map((d) =>
        d.dayNumber === dayNum
          ? { ...d, items: d.items.map((item, i) => (i === itemIdx ? { ...item, [field]: value } : item)) }
          : d,
      ),
    })
  }

  function removeItem(dayNum: number, itemIdx: number) {
    if (!proposed) return
    setProposed({
      ...proposed,
      days: proposed.days.map((d) =>
        d.dayNumber === dayNum
          ? { ...d, items: d.items.filter((_, i) => i !== itemIdx) }
          : d,
      ),
    })
  }

  async function handleRefine(): Promise<void> {
    if (!proposed || !suggestion.trim()) return
    setRefining(true)
    setGenError(null)
    setSaveError(null)
    try {
      const currentPlan = JSON.stringify(proposed, null, 2)
      const res = await apiFetch('/api/routines/generate', {
        method: 'POST',
        body: JSON.stringify({
          goal: aiGoal,
          daysPerWeek: aiDays,
          priorities: aiPriorities,
          suggestion: suggestion.trim(),
          currentPlan,
        }),
      })
      const body = (await res.json()) as ProposedRoutine & { error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Error al refinar la rutina')
      setProposed(body)
      setRoutineName(body.name)
      setSuggestion('')
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Error al contactar con el servidor')
    } finally {
      setRefining(false)
    }
  }

  async function handleRegenerate(): Promise<void> {
    setGenerating(true)
    setGenError(null)
    setSaveError(null)
    try {
      const res = await apiFetch('/api/routines/generate', {
        method: 'POST',
        body: JSON.stringify({ goal: aiGoal, daysPerWeek: aiDays, priorities: aiPriorities }),
      })
      const body = (await res.json()) as ProposedRoutine & { error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Error al regenerar la rutina')
      setProposed(body)
      setRoutineName(body.name)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Error al regenerar')
    } finally {
      setGenerating(false)
    }
  }

  function handleSelectTemplate(templateId: string) {
    if (!catalog) return
    const template = TEMPLATES.find((t) => t.id === templateId)
    if (!template) return
    const userDays = user?.daysPerWeek ?? 4
    const effectiveDays = Math.min(Math.max(userDays, template.minDays), template.maxDays)
    const catalogByName = new Map(catalog.map((e) => [e.name, e]))
    const routine = buildTemplateRoutine(template, effectiveDays, user?.goal, catalogByName)
    setProposed(routine)
    setRoutineName(routine.name)
    setStep(3)
  }

  async function handleScratchCreate(): Promise<void> {
    setSaving(true)
    setSaveError(null)
    try {
      const days = Array.from({ length: scratchDays }, (_, i) => ({
        dayNumber: i + 1,
        label: `Día ${i + 1}`,
        items: [] as never[],
      }))
      const res = await apiFetch('/api/routines/from-plan', {
        method: 'POST',
        body: JSON.stringify({ name: scratchName.trim() || 'Mi rutina', days }),
      })
      const data = (await res.json()) as { id: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error al crear la rutina')
      navigate(`/routines/${data.id}/edit`, { replace: true })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al crear la rutina')
    } finally {
      setSaving(false)
    }
  }

  async function handleSave(): Promise<void> {
    if (!proposed) return
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        name: routineName.trim() || proposed.name,
        days: proposed.days.map((d) => ({
          dayNumber: d.dayNumber,
          label: d.label,
          items: d.items.map((i) => ({
            exerciseId: i.exerciseId,
            sets: i.sets,
            reps: i.reps,
            restSeconds: i.restSeconds,
          })),
        })),
      }
      const res = await apiFetch('/api/routines/from-plan', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as { id: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar la rutina')
      navigate('/', { replace: true })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar la rutina')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading overlay (AI generation) ─────────────────────────────────────────

  if (generating) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500/20 to-primary/20 rounded-2xl mb-6">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-lg font-display font-semibold text-text mb-3">Generando tu rutina</p>
          <p className="text-sm text-muted min-h-[1.25rem] transition-all duration-500">
            {LOADING_MESSAGES[loadingMsgIdx]}
          </p>
          <div className="flex justify-center gap-1 mt-6">
            {LOADING_MESSAGES.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === loadingMsgIdx ? 'w-6 bg-primary' : 'w-1.5 bg-border'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Wizard shell ─────────────────────────────────────────────────────────────

  const totalSteps = path === 'scratch' ? 2 : 3

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-2xl mb-4">
            <Dumbbell className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-text">Nueva rutina</h1>
          <p className="text-muted mt-1 text-sm">
            {step === 1 && '¿Cómo querés crearla?'}
            {step === 2 && path === 'ai' && 'Configurá la generación con IA'}
            {step === 2 && path === 'template' && 'Elegí una plantilla'}
            {step === 2 && path === 'scratch' && 'Definí los detalles básicos'}
            {step === 3 && 'Revisá tu rutina antes de guardar'}
          </p>
        </div>

        <StepDots step={step} total={totalSteps} />

        {/* ── Step 1 — Choose path ────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-3">
            {/* AI — highlighted */}
            <button
              onClick={() => choosePath('ai')}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-primary bg-gradient-to-r from-violet-500/8 to-primary/8 text-left hover:border-primary-hi hover:from-violet-500/12 hover:to-primary/12 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-text text-sm">Generar con IA</p>
                <p className="text-xs text-muted mt-0.5">IA arma tu rutina completa según tu perfil</p>
              </div>
              <ChevronRight className="w-4 h-4 text-primary shrink-0" />
            </button>

            {/* Template */}
            <button
              onClick={() => choosePath('template')}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-border hover:bg-surface-hi text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-hi flex items-center justify-center shrink-0">
                <LayoutTemplate className="w-5 h-5 text-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-text text-sm">Usar plantilla</p>
                <p className="text-xs text-muted mt-0.5">PPL, Upper/Lower, Full Body o Arnold Split</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted shrink-0" />
            </button>

            {/* Scratch */}
            <button
              onClick={() => choosePath('scratch')}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-border hover:bg-surface-hi text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-hi flex items-center justify-center shrink-0">
                <PenLine className="w-5 h-5 text-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-text text-sm">Desde cero</p>
                <p className="text-xs text-muted mt-0.5">Elegís nombre y días, armás todo en el editor</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted shrink-0" />
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-full text-sm text-muted hover:text-text py-2.5 mt-1 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* ── Step 2a — AI config ─────────────────────────────────────────── */}
        {step === 2 && path === 'ai' && (
          <div className="card px-6 py-7 sm:px-8">
            <h2 className="text-xl font-display font-semibold text-text mb-1">Configurá la IA</h2>
            <p className="text-xs text-muted mb-6">Los valores vienen de tu perfil — podés ajustarlos.</p>

            {/* Objetivo */}
            <div className="mb-5">
              <p className="text-sm font-medium text-text mb-2">Objetivo</p>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setAiGoal(g)}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      aiGoal === g ? 'bg-primary text-on-primary' : 'bg-surface-hi text-muted hover:text-text'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Días */}
            <div className="mb-5">
              <p className="text-sm font-medium text-text mb-2">Días por semana</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((d) => (
                  <button
                    key={d}
                    onClick={() => setAiDays(d)}
                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                      aiDays === d ? 'bg-primary text-on-primary' : 'bg-surface-hi text-muted hover:text-text'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Prioridades */}
            <div className="mb-6">
              <p className="text-sm font-medium text-text mb-2">Grupos a priorizar <span className="text-muted font-normal">(opcional)</span></p>
              <div className="grid grid-cols-3 gap-2">
                {MUSCLES.map((m) => (
                  <button
                    key={m}
                    onClick={() => togglePriority(m)}
                    className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                      aiPriorities.includes(m) ? 'bg-primary text-on-primary' : 'bg-surface-hi text-muted hover:text-text'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {genError && (
              <div className="flex items-start gap-2 bg-danger/8 border border-danger/20 text-danger text-xs px-3 py-2.5 rounded-xl mb-4">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{genError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1 py-3 border border-border">
                Volver
              </button>
              <button
                onClick={() => void callGenerate()}
                disabled={!aiGoal}
                className="btn-primary flex-1 py-3 gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generar
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2b — Template select ───────────────────────────────────── */}
        {step === 2 && path === 'template' && (
          <div>
            {catalogError && (
              <div className="flex items-start gap-2 bg-danger/8 border border-danger/20 text-danger text-xs px-3 py-2.5 rounded-xl mb-3">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{catalogError}</span>
              </div>
            )}

            <div className="space-y-3">
              {TEMPLATES.map((tpl) => {
                const userDays = user?.daysPerWeek ?? 4
                const fits = userDays >= tpl.minDays && userDays <= tpl.maxDays
                const effectiveDays = Math.min(Math.max(userDays, tpl.minDays), tpl.maxDays)
                const dayLabels = fits ? tpl.buildDays(effectiveDays).map((d) => d.label.split(' — ')[0].split(' + ')[0]) : []

                return (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl.id)}
                    disabled={!catalog || !fits}
                    className={`w-full flex items-start gap-4 px-5 py-4 rounded-2xl border text-left transition-colors ${
                      fits
                        ? 'border-border hover:bg-surface-hi hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
                        : 'border-border/40 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-display font-semibold text-text text-sm">{tpl.name}</p>
                        {!fits && (
                          <span className="text-xs text-muted bg-surface-hi px-1.5 py-0.5 rounded-full">
                            {tpl.minDays === tpl.maxDays ? `${tpl.minDays}d` : `${tpl.minDays}-${tpl.maxDays}d`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted">{tpl.description}</p>
                      {fits && dayLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {dayLabels.map((lbl, i) => (
                            <span key={i} className="text-xs bg-primary/8 text-primary px-2 py-0.5 rounded-full font-medium">
                              {lbl}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {fits && <ChevronRight className="w-4 h-4 text-muted shrink-0 mt-1" />}
                  </button>
                )
              })}
            </div>

            <button onClick={() => setStep(1)} className="btn-ghost w-full py-3 border border-border mt-4">
              Volver
            </button>
          </div>
        )}

        {/* ── Step 2c — Scratch ───────────────────────────────────────────── */}
        {step === 2 && path === 'scratch' && (
          <div className="card px-6 py-7 sm:px-8">
            <h2 className="text-xl font-display font-semibold text-text mb-1">Crear desde cero</h2>
            <p className="text-sm text-muted mb-6">Vas a armar todo manualmente en el editor.</p>

            <div className="mb-5">
              <label className="text-sm font-medium text-text block mb-1.5">Nombre de la rutina</label>
              <input
                type="text"
                value={scratchName}
                onChange={(e) => setScratchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !saving && scratchName.trim() && void handleScratchCreate()}
                placeholder="Mi rutina"
                className="input-base"
              />
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-text mb-2">Días por semana</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((d) => (
                  <button
                    key={d}
                    onClick={() => setScratchDays(d)}
                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                      scratchDays === d ? 'bg-primary text-on-primary' : 'bg-surface-hi text-muted hover:text-text'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {saveError && (
              <div className="flex items-start gap-2 bg-danger/8 border border-danger/20 text-danger text-xs px-3 py-2.5 rounded-xl mb-4">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{saveError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1 py-3 border border-border">
                Volver
              </button>
              <button
                onClick={() => void handleScratchCreate()}
                disabled={saving || !scratchName.trim()}
                className="btn-primary flex-1 py-3"
              >
                {saving ? 'Creando...' : 'Crear rutina'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 — Preview ────────────────────────────────────────────── */}
        {step === 3 && proposed && (
          <div>
            {/* Editable name */}
            <div className="card px-5 py-4 mb-4">
              <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">
                Nombre de la rutina
              </label>
              <input
                type="text"
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                className="w-full text-base font-display font-bold text-text bg-transparent border-b-2 border-transparent focus:border-primary focus:outline-none py-0.5 transition-colors placeholder:text-muted/40"
                placeholder="Nombre de la rutina"
              />
            </div>

            {/* Days — editable */}
            <div className="space-y-3 mb-4">
              {proposed.days.map((day) => (
                <EditableDayCard
                  key={day.dayNumber}
                  day={day}
                  onUpdate={(idx, field, val) => updateItem(day.dayNumber, idx, field, val)}
                  onRemove={(idx) => removeItem(day.dayNumber, idx)}
                />
              ))}
            </div>

            {/* AI refinement */}
            {path === 'ai' && (
              <div className="card px-4 py-3 mb-4">
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Sugerir cambio con IA</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleRefine() }}
                    placeholder='Ej: "Menos ejercicios de pierna" o "Más volumen en espalda"'
                    className="flex-1 text-sm bg-surface-hi border border-border rounded-xl px-3 py-2 text-text placeholder:text-muted/50 focus:border-primary focus:outline-none"
                    disabled={refining}
                  />
                  <button
                    onClick={() => void handleRefine()}
                    disabled={refining || !suggestion.trim()}
                    className="btn-primary px-3 py-2 gap-1.5 shrink-0"
                    title="Refinar con IA"
                  >
                    {refining ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => void handleRegenerate()}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 text-xs text-muted hover:text-text mt-2 py-1 transition-colors"
                >
                  <RotateCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} />
                  Regenerar desde cero
                </button>
              </div>
            )}

            {/* Errors */}
            {(saveError ?? genError) && (
              <div className="flex items-start gap-2 bg-danger/8 border border-danger/20 text-danger text-xs px-3 py-2.5 rounded-xl mb-4">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{saveError ?? genError}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => setStep(2)}
                className="btn-ghost flex-1 py-3 border border-border gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="btn-primary flex-1 py-3"
              >
                {saving ? 'Guardando...' : 'Guardar rutina'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
