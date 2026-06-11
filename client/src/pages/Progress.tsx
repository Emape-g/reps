import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, ChevronRight, Dumbbell } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface ExerciseStat {
  exerciseId: string
  exerciseName: string
  primaryMuscle: string
  lastWeight: number
  lastLoggedAt: string
  trend: 'up' | 'down' | 'stable' | null
  totalLogs: number
}

const MUSCLE_COLORS: Record<string, string> = {
  pecho:    'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  espalda:  'bg-blue-500/10  text-blue-600  dark:text-blue-400',
  piernas:  'bg-success/10   text-success',
  hombros:  'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  brazos:   'bg-pink-500/10  text-pink-600  dark:text-pink-400',
  core:     'bg-primary/10   text-primary',
  gluteos:  'bg-success/10   text-success',
  cardio:   'bg-warning/10   text-warning',
}

function muscleColor(m: string) {
  return MUSCLE_COLORS[m.toLowerCase()] ?? 'bg-surface-hi text-muted'
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 90) return 'hace poco'
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(diff / 86400000)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? 'hace 1 semana' : `hace ${weeks} semanas`
}

function TrendIcon({ trend }: { trend: ExerciseStat['trend'] }) {
  if (trend === 'up')     return <TrendingUp   className="w-4 h-4 text-success" />
  if (trend === 'down')   return <TrendingDown  className="w-4 h-4 text-danger" />
  if (trend === 'stable') return <Minus          className="w-4 h-4 text-muted" />
  return null
}

export default function Progress() {
  const [stats, setStats]   = useState<ExerciseStat[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/users/me/exercise-stats')
      .then((r) => (r.ok ? r.json() as Promise<ExerciseStat[]> : Promise.reject()))
      .then(setStats)
      .catch(() => setError('No se pudo cargar el progreso. Intentá de nuevo.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-display font-bold text-text">Progreso</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card px-4 py-4 flex items-center gap-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-hi rounded-full w-40" />
                  <div className="h-3 bg-surface-hi rounded-full w-24" />
                </div>
                <div className="h-6 bg-surface-hi rounded-full w-16" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="card px-4 py-6 text-center">
            <p className="text-muted text-sm">{error}</p>
          </div>
        )}

        {stats && stats.length === 0 && (
          <div className="card px-5 py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-hi flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-muted" />
            </div>
            <div>
              <p className="font-display font-semibold text-text mb-1">Sin registros aún</p>
              <p className="text-sm text-muted">
                Completá tu primer sesión para ver el progreso de tus ejercicios.
              </p>
            </div>
          </div>
        )}

        {stats && stats.length > 0 && (
          <div className="space-y-2">
            {stats.map((s) => (
              <Link
                key={s.exerciseId}
                to={`/exercises/${s.exerciseId}/progress`}
                className="card px-4 py-3.5 flex items-center gap-3 hover:bg-surface-hi transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text text-sm leading-tight truncate">
                      {s.exerciseName}
                    </span>
                    <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${muscleColor(s.primaryMuscle)}`}>
                      {s.primaryMuscle}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{relativeTime(s.lastLoggedAt)} · {s.totalLogs} sets</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <TrendIcon trend={s.trend} />
                  <span className="font-display font-bold text-text text-sm tabular-nums">
                    {s.lastWeight} kg
                  </span>
                </div>

                <ChevronRight className="w-4 h-4 text-muted shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
