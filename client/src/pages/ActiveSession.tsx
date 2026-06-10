import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, AlertTriangle, RotateCw, ClipboardList,
  TrendingUp, CheckCircle2, Trophy, Timer,
} from 'lucide-react'
import { apiFetch } from '../lib/api'
import { useToast } from '../context/ToastContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Exercise {
  id: string
  name: string
  primaryMuscle: string
  chain: string
}

interface LastLog {
  weight: number
  reps: number
  loggedAt: string
}

interface Item {
  id: string
  order: number
  sets: number
  reps: string
  restSeconds: number
  exercise: Exercise
  lastLog: LastLog | null
}

interface DayData {
  id: string
  label: string
  dayNumber: number
  items: Item[]
}

interface SessionSet {
  weight: number
  reps: number
  setNumber: number
  isPR: boolean
}

interface LogResponse {
  id: string
  weight: number
  reps: number
  setNumber: number
  isPR: boolean
}

interface RestTimer {
  remaining: number
  total: number
  exerciseName: string
}

type SessionLogs = Record<string, SessionSet[]>
type Inputs = Record<string, { weight: string; reps: string }>

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function playBeep() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx: typeof AudioContext = window.AudioContext ?? (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
    osc.onended = () => void ctx.close()
  } catch {
    // AudioContext not available
  }
}

// ── RestTimerBar ──────────────────────────────────────────────────────────────

function RestTimerBar({
  timer,
  onSkip,
  onAdjust,
}: {
  timer: RestTimer
  onSkip: () => void
  onAdjust: (delta: number) => void
}) {
  const pct = timer.total > 0 ? (timer.remaining / timer.total) * 100 : 0

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border shadow-card-lg">
      {/* Countdown bar */}
      <div className="h-1 bg-border relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted truncate">
            Descanso · {timer.exerciseName}
          </p>
          <p className="text-3xl font-display font-bold text-primary tabular-nums leading-none mt-0.5">
            {String(Math.floor(timer.remaining / 60)).padStart(2, '0')}:
            {String(timer.remaining % 60).padStart(2, '0')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onAdjust(-15)}
            className="text-xs px-2.5 py-1.5 border border-border rounded-lg text-muted hover:text-text hover:bg-surface-hi transition-colors"
          >
            −15s
          </button>
          <button
            onClick={() => onAdjust(15)}
            className="text-xs px-2.5 py-1.5 border border-border rounded-lg text-muted hover:text-text hover:bg-surface-hi transition-colors"
          >
            +15s
          </button>
          <button
            onClick={onSkip}
            className="text-xs px-2.5 py-1.5 text-muted hover:text-text transition-colors"
          >
            Saltar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonSession() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card px-5 py-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="space-y-1.5">
              <div className="h-4 bg-surface-hi rounded-full w-40" />
              <div className="h-3 bg-surface-hi rounded-full w-20" />
            </div>
            <div className="h-4 bg-surface-hi rounded-full w-14 shrink-0" />
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-2 w-2 rounded-full bg-surface-hi" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ActiveSession() {
  const { routineId, dayId } = useParams<{ routineId: string; dayId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [day, setDay] = useState<DayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [sessionLogs, setSessionLogs] = useState<SessionLogs>({})
  const [inputs, setInputs] = useState<Inputs>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)

  // Rest timer
  const [restTimer, setRestTimer] = useState<RestTimer | null>(null)
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restRemainingRef = useRef(0)

  // Session duration
  const sessionStartRef = useRef<number | null>(null)
  const [sessionSeconds, setSessionSeconds] = useState(0)

  const load = useCallback(() => {
    if (!routineId || !dayId) return
    setLoading(true)
    setFetchError(null)
    apiFetch(`/api/routines/${routineId}/days/${dayId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Día no encontrado')
        return r.json() as Promise<DayData>
      })
      .then((data) => {
        setDay(data)
        // Pre-load inputs with lastLog values (or empty if no history)
        const init: Inputs = {}
        for (const item of data.items) {
          init[item.id] = {
            weight: item.lastLog ? String(item.lastLog.weight) : '',
            reps: item.lastLog ? String(item.lastLog.reps) : '',
          }
        }
        setInputs(init)
      })
      .catch(() => setFetchError('No se pudo cargar la sesión. Verificá tu conexión.'))
      .finally(() => setLoading(false))
  }, [routineId, dayId])

  useEffect(() => { load() }, [load])

  // Session duration ticker
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionStartRef.current !== null) {
        setSessionSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Cleanup rest timer on unmount
  useEffect(() => {
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    }
  }, [])

  function startRestTimer(seconds: number, exerciseName: string) {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    restRemainingRef.current = seconds
    setRestTimer({ remaining: seconds, total: seconds, exerciseName })

    restIntervalRef.current = setInterval(() => {
      restRemainingRef.current -= 1
      const remaining = restRemainingRef.current
      if (remaining <= 0) {
        clearInterval(restIntervalRef.current!)
        restIntervalRef.current = null
        setRestTimer(null)
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        playBeep()
      } else {
        setRestTimer((prev) => (prev ? { ...prev, remaining } : null))
      }
    }, 1000)
  }

  function adjustTimer(delta: number) {
    const next = Math.max(1, restRemainingRef.current + delta)
    restRemainingRef.current = next
    setRestTimer((prev) => (prev ? { ...prev, remaining: next } : null))
  }

  function skipTimer() {
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current)
      restIntervalRef.current = null
    }
    restRemainingRef.current = 0
    setRestTimer(null)
  }

  function updateInput(itemId: string, field: 'weight' | 'reps', value: string) {
    setInputs((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }))
  }

  function adjustInput(itemId: string, field: 'weight' | 'reps', delta: number) {
    const min = field === 'reps' ? 1 : 0
    setInputs((prev) => {
      const current = parseFloat(prev[itemId]?.[field] ?? '0') || 0
      const next = Math.max(min, current + delta)
      return { ...prev, [itemId]: { ...prev[itemId], [field]: String(Math.round(next * 10) / 10) } }
    })
  }

  async function saveSet(item: Item) {
    const { weight, reps } = inputs[item.id] ?? {}
    if (!weight || !reps) return
    setSaving(item.id)
    const setNumber = (sessionLogs[item.id]?.length ?? 0) + 1
    try {
      const res = await apiFetch(`/api/items/${item.id}/logs`, {
        method: 'POST',
        body: JSON.stringify({ weight: Number(weight), reps: Number(reps), setNumber }),
      })
      if (!res.ok) throw new Error()
      const log = (await res.json()) as LogResponse

      // Start session clock on first set
      if (sessionStartRef.current === null) {
        sessionStartRef.current = Date.now()
      }

      // Start rest timer (restarts if already running)
      startRestTimer(item.restSeconds, item.exercise.name)

      // PR celebration
      if (log.isPR) {
        toast.pr(`¡Nuevo récord! ${Number(weight)} kg — ${item.exercise.name}`)
      }

      setSessionLogs((prev) => ({
        ...prev,
        [item.id]: [
          ...(prev[item.id] ?? []),
          { weight: Number(weight), reps: Number(reps), setNumber, isPR: log.isPR },
        ],
      }))
      // Keep input values pre-loaded for the next set
    } catch {
      toast.error('No se pudo guardar la serie. Intentá de nuevo.')
    } finally {
      setSaving(null)
    }
  }

  function handleShowSummary() {
    // Stop rest timer before entering summary
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    restIntervalRef.current = null
    setRestTimer(null)
    setShowSummary(true)
  }

  const allDone =
    day != null &&
    day.items.length > 0 &&
    day.items.every((item) => (sessionLogs[item.id]?.length ?? 0) >= item.sets)

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <header className="bg-surface border-b border-border px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost p-1.5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="animate-pulse space-y-1.5">
            <div className="h-5 bg-surface-hi rounded-full w-40" />
            <div className="h-3 bg-surface-hi rounded-full w-12" />
          </div>
        </header>
        <SkeletonSession />
      </div>
    )
  }

  // ── Fetch error ─────────────────────────────────────────────────────────────
  if (fetchError || !day) {
    return (
      <div className="min-h-screen bg-bg">
        <header className="bg-surface border-b border-border px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost p-1.5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-display font-bold text-text">Sesión</h1>
        </header>
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-danger/10 rounded-2xl mb-4">
            <AlertTriangle className="w-7 h-7 text-danger" />
          </div>
          <p className="text-text font-semibold mb-1">No se pudo cargar</p>
          <p className="text-sm text-muted mb-6">{fetchError ?? 'Error desconocido'}</p>
          <div className="flex justify-center gap-3">
            <button onClick={load} className="btn-primary px-4 py-2.5 gap-2">
              <RotateCw className="w-4 h-4" />
              Reintentar
            </button>
            <button onClick={() => navigate('/')} className="btn-ghost px-4 py-2.5 border border-border">
              Ir al inicio
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── Session summary ─────────────────────────────────────────────────────────
  if (showSummary) {
    const totalSets = Object.values(sessionLogs).reduce((sum, sets) => sum + sets.length, 0)
    const totalVolume = Object.values(sessionLogs).reduce(
      (sum, sets) => sum + sets.reduce((s2, s) => s2 + s.weight * s.reps, 0),
      0,
    )
    const totalPRs = Object.values(sessionLogs).reduce(
      (sum, sets) => sum + sets.filter((s) => s.isPR).length,
      0,
    )

    return (
      <div className="min-h-screen bg-bg">
        <header className="bg-surface border-b border-border px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost p-1.5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-display font-bold text-text">Resumen de sesión</h1>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6 pb-10">
          {/* Completion banner */}
          <div className="card px-5 py-4 mb-5 text-center border-success/20 bg-success/5">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-success/15 rounded-xl mb-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <p className="text-text font-display font-semibold">Sesión completada</p>
            <p className="text-muted text-sm mt-0.5">{day.label}</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="card px-4 py-3 text-center">
              <p className="text-2xl font-display font-bold text-primary tabular-nums">{totalSets}</p>
              <p className="text-xs text-muted mt-0.5">Series</p>
            </div>
            <div className="card px-4 py-3 text-center">
              <p className="text-2xl font-display font-bold text-primary tabular-nums">
                {Math.round(totalVolume).toLocaleString('es-AR')} kg
              </p>
              <p className="text-xs text-muted mt-0.5">Volumen total</p>
            </div>
            {sessionSeconds > 0 && (
              <div className="card px-4 py-3 text-center">
                <p className="text-2xl font-display font-bold text-primary tabular-nums">
                  {formatDuration(sessionSeconds)}
                </p>
                <p className="text-xs text-muted mt-0.5">Duración</p>
              </div>
            )}
            {totalPRs > 0 && (
              <div className="card px-4 py-3 text-center border-warning/25 bg-warning/5">
                <div className="flex items-center justify-center gap-1.5">
                  <Trophy className="w-5 h-5 text-warning" />
                  <p className="text-2xl font-display font-bold text-warning tabular-nums">{totalPRs}</p>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {totalPRs === 1 ? 'Récord personal' : 'Récords personales'}
                </p>
              </div>
            )}
          </div>

          {/* Per-exercise breakdown */}
          <div className="space-y-3">
            {day.items.map((item) => {
              const sets = sessionLogs[item.id] ?? []
              return (
                <div key={item.id} className="card px-5 py-4">
                  <p className="font-semibold text-text">{item.exercise.name}</p>
                  <p className="text-xs text-muted mt-0.5">{item.exercise.primaryMuscle}</p>
                  {sets.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sets.map((s) => (
                        <span
                          key={s.setNumber}
                          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                            s.isPR
                              ? 'bg-warning/15 text-warning'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {s.isPR && <Trophy className="w-2.5 h-2.5" />}
                          {s.weight} kg × {s.reps}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted mt-2">Sin series registradas</p>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={() => navigate('/')} className="btn-primary w-full py-3 mt-8 justify-center">
            Finalizar sesión
          </button>
        </main>
      </div>
    )
  }

  // ── Active session ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-surface border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="btn-ghost p-1.5 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-display font-bold text-text truncate">{day.label}</h1>
          <p className="text-xs text-muted">Día {day.dayNumber}</p>
        </div>
        {sessionSeconds > 0 && (
          <div className="shrink-0 flex items-center gap-1.5 bg-primary/8 text-primary rounded-xl px-3 py-1.5">
            <Timer className="w-3.5 h-3.5" />
            <span className="text-sm font-display font-semibold tabular-nums">
              {formatDuration(sessionSeconds)}
            </span>
          </div>
        )}
      </header>

      <main className={`max-w-lg mx-auto px-4 pt-6 space-y-4 transition-[padding-bottom] duration-300 ${restTimer ? 'pb-32' : 'pb-8'}`}>
        {/* Empty day */}
        {day.items.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
              <ClipboardList className="w-7 h-7 text-primary" />
            </div>
            <p className="text-text font-semibold mb-1">Día sin ejercicios</p>
            <p className="text-sm text-muted mb-5">
              Configurá los ejercicios de este día desde el editor de rutina.
            </p>
            <button onClick={() => navigate('/')} className="text-primary text-sm font-medium hover:underline">
              ← Volver al inicio
            </button>
          </div>
        )}

        {day.items.map((item) => {
          const doneSets = sessionLogs[item.id]?.length ?? 0
          const isDone = doneSets >= item.sets
          const input = inputs[item.id] ?? { weight: '', reps: '' }

          return (
            <div
              key={item.id}
              className={`card px-4 sm:px-5 py-4 transition-colors ${
                isDone ? 'border-success/30 bg-success/5' : ''
              }`}
            >
              {/* Exercise header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-text truncate">{item.exercise.name}</p>
                  <p className="text-xs text-muted mt-0.5">{item.exercise.primaryMuscle}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-medium text-text">
                    {item.sets} × {item.reps}
                  </span>
                  {isDone && (
                    <p className="text-xs text-success font-semibold mt-0.5 flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Listo
                    </p>
                  )}
                </div>
              </div>

              {/* Set dots */}
              <div className="flex items-center gap-1.5 mt-3">
                {Array.from({ length: item.sets }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      i < doneSets ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                ))}
                <span className="text-xs text-muted ml-1">{doneSets}/{item.sets} series</span>
              </div>

              {/* Logged sets chips */}
              {(sessionLogs[item.id]?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {sessionLogs[item.id].map((s) => (
                    <span
                      key={s.setNumber}
                      className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        s.isPR ? 'bg-warning/15 text-warning' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {s.isPR && <Trophy className="w-2.5 h-2.5" />}
                      {s.weight} kg × {s.reps}
                    </span>
                  ))}
                </div>
              )}

              {/* Input area */}
              {!isDone && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Weight */}
                    <div>
                      <label className="text-xs text-muted block mb-1.5">Peso (kg)</label>
                      <div className="flex rounded-xl overflow-hidden border border-border focus-within:border-primary transition-colors">
                        <button
                          type="button"
                          onClick={() => adjustInput(item.id, 'weight', -2.5)}
                          className="px-2.5 py-2 bg-surface-hi border-r border-border text-muted hover:text-text text-sm font-bold shrink-0 active:bg-border/50 transition-colors"
                          tabIndex={-1}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.5}
                          value={input.weight}
                          onChange={(e) => updateInput(item.id, 'weight', e.target.value)}
                          className="flex-1 min-w-0 text-center text-sm bg-surface-hi focus:outline-none text-text py-2"
                          placeholder={item.lastLog ? String(item.lastLog.weight) : '0'}
                        />
                        <button
                          type="button"
                          onClick={() => adjustInput(item.id, 'weight', 2.5)}
                          className="px-2.5 py-2 bg-surface-hi border-l border-border text-muted hover:text-text text-sm font-bold shrink-0 active:bg-border/50 transition-colors"
                          tabIndex={-1}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    {/* Reps */}
                    <div>
                      <label className="text-xs text-muted block mb-1.5">Reps</label>
                      <div className="flex rounded-xl overflow-hidden border border-border focus-within:border-primary transition-colors">
                        <button
                          type="button"
                          onClick={() => adjustInput(item.id, 'reps', -1)}
                          className="px-2.5 py-2 bg-surface-hi border-r border-border text-muted hover:text-text text-sm font-bold shrink-0 active:bg-border/50 transition-colors"
                          tabIndex={-1}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={input.reps}
                          onChange={(e) => updateInput(item.id, 'reps', e.target.value)}
                          className="flex-1 min-w-0 text-center text-sm bg-surface-hi focus:outline-none text-text py-2"
                          placeholder={item.reps.split('-')[0]}
                        />
                        <button
                          type="button"
                          onClick={() => adjustInput(item.id, 'reps', 1)}
                          className="px-2.5 py-2 bg-surface-hi border-l border-border text-muted hover:text-text text-sm font-bold shrink-0 active:bg-border/50 transition-colors"
                          tabIndex={-1}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Last log hint */}
                  {item.lastLog && (
                    <p className="text-xs text-muted/60">
                      Última sesión: {item.lastLog.weight} kg × {item.lastLog.reps}
                    </p>
                  )}

                  <button
                    onClick={() => void saveSet(item)}
                    disabled={!input.weight || !input.reps || saving === item.id}
                    className="btn-primary w-full py-2.5 justify-center"
                  >
                    {saving === item.id
                      ? <RotateCw className="w-4 h-4 animate-spin" />
                      : 'Guardar serie'
                    }
                  </button>
                </div>
              )}

              <Link
                to={`/exercises/${item.exercise.id}/progress`}
                className="text-xs text-primary hover:underline mt-3 flex items-center gap-1"
              >
                <TrendingUp className="w-3 h-3" />
                Ver progreso
              </Link>
            </div>
          )
        })}

        {allDone && (
          <button
            onClick={handleShowSummary}
            className="btn-primary w-full py-3.5 text-base justify-center"
          >
            <CheckCircle2 className="w-5 h-5" />
            Ver resumen y finalizar sesión
          </button>
        )}
      </main>

      {/* Rest timer bar */}
      {restTimer && (
        <RestTimerBar timer={restTimer} onSkip={skipTimer} onAdjust={adjustTimer} />
      )}
    </div>
  )
}
