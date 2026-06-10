import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { ArrowLeft, AlertTriangle, RotateCw, TrendingUp, Trophy } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface Exercise {
  id: string
  name: string
  primaryMuscle: string
  chain: string
}

interface Log {
  id: string
  weight: number
  reps: number
  setNumber: number
  loggedAt: string
}

interface ChartPoint {
  date: string
  maxWeight: number
}

interface ProgressData {
  exercise: Exercise
  logs: Log[]
  chartData: ChartPoint[]
  pr: Log | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonProgress() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="card px-5 py-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-surface-hi rounded-full w-28" />
          <div className="h-7 bg-surface-hi rounded-full w-20" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-3 bg-surface-hi rounded-full w-16" />
          <div className="h-3 bg-surface-hi rounded-full w-20" />
        </div>
      </div>
      <div className="card px-5 py-5">
        <div className="h-4 bg-surface-hi rounded-full w-36 mb-4" />
        <div className="h-52 bg-surface-hi rounded-xl" />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ExerciseProgress() {
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!exerciseId) return
    setLoading(true)
    setError(null)
    apiFetch(`/api/exercises/${exerciseId}/progress`)
      .then((r) => {
        if (!r.ok) throw new Error('Ejercicio no encontrado')
        return r.json() as Promise<ProgressData>
      })
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'No se pudo cargar el progreso')
      )
      .finally(() => setLoading(false))
  }, [exerciseId])

  useEffect(() => { load() }, [load])

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <header className="bg-surface border-b border-border px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-1.5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="animate-pulse space-y-1.5">
            <div className="h-4 bg-surface-hi rounded-full w-36" />
            <div className="h-3 bg-surface-hi rounded-full w-20" />
          </div>
        </header>
        <SkeletonProgress />
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg">
        <header className="bg-surface border-b border-border px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-1.5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-display font-bold text-text">Progreso</h1>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-danger/10 rounded-2xl mb-4">
            <AlertTriangle className="w-7 h-7 text-danger" />
          </div>
          <p className="text-text font-semibold mb-1">No se pudo cargar</p>
          <p className="text-sm text-muted mb-6">{error ?? 'Error desconocido'}</p>
          <div className="flex justify-center gap-3">
            <button onClick={load} className="btn-primary px-4 py-2 gap-2">
              <RotateCw className="w-4 h-4" />
              Reintentar
            </button>
            <button onClick={() => navigate(-1)} className="btn-ghost px-4 py-2 border border-border">
              Volver
            </button>
          </div>
        </main>
      </div>
    )
  }

  const { exercise, logs, chartData, pr } = data

  // ── Content ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-surface border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost p-1.5 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-display font-bold text-text truncate">{exercise.name}</h1>
          <p className="text-xs text-muted">{exercise.primaryMuscle}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* PR banner */}
        {pr ? (
          <div className="card px-5 py-4 flex items-center justify-between bg-warning/8 border-warning/20">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Trophy className="w-3.5 h-3.5 text-warning" />
                <p className="text-xs text-warning font-semibold uppercase tracking-wide">
                  Record personal (PR)
                </p>
              </div>
              <p className="text-2xl font-display font-bold text-text">{pr.weight} kg</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text font-medium">{pr.reps} reps</p>
              <p className="text-xs text-muted mt-0.5">{formatDate(pr.loggedAt)}</p>
            </div>
          </div>
        ) : (
          logs.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
                <TrendingUp className="w-7 h-7 text-primary" />
              </div>
              <p className="text-text font-semibold mb-1">Sin registros todavía</p>
              <p className="text-sm text-muted">
                Completá una sesión para empezar a ver tu progreso.
              </p>
            </div>
          )
        )}

        {/* Chart */}
        <div className="card px-4 sm:px-5 py-5">
          <h2 className="text-sm font-semibold text-text mb-4">Peso máximo por sesión</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'rgb(var(--color-text-muted))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'rgb(var(--color-text-muted))' }}
                  tickLine={false}
                  axisLine={false}
                  unit=" kg"
                />
                <Tooltip
                  formatter={(value) => [`${value} kg`, 'Peso máx.']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid rgb(var(--color-border))',
                    background: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text))',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="maxWeight"
                  stroke="rgb(var(--color-primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'rgb(var(--color-primary))' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-center">
              <p className="text-muted text-sm">
                Sin datos para mostrar.
                <br />
                Completá una sesión para ver el gráfico.
              </p>
            </div>
          )}
        </div>

        {/* History table */}
        {logs.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text">
                Historial
                <span className="ml-2 text-xs font-normal text-muted">
                  ({logs.length} {logs.length === 1 ? 'serie' : 'series'})
                </span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[360px]">
                <thead>
                  <tr className="text-xs text-muted uppercase tracking-wide border-b border-border">
                    <th className="px-5 py-3 text-left font-medium">Fecha</th>
                    <th className="px-5 py-3 text-right font-medium">Peso</th>
                    <th className="px-5 py-3 text-right font-medium">Reps</th>
                    <th className="px-5 py-3 text-right font-medium">Serie</th>
                  </tr>
                </thead>
                <tbody>
                  {[...logs].reverse().map((log) => {
                    const isPR = pr != null && log.weight === pr.weight && log.id === pr.id
                    return (
                      <tr
                        key={log.id}
                        className={`border-b border-border/40 last:border-0 transition-colors ${
                          isPR ? 'bg-warning/5' : 'hover:bg-surface-hi'
                        }`}
                      >
                        <td className="px-5 py-3 text-muted whitespace-nowrap">
                          {formatDate(log.loggedAt)}
                          {isPR && (
                            <span className="ml-2 text-xs bg-warning/15 text-warning font-semibold px-1.5 py-0.5 rounded">
                              PR
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-text whitespace-nowrap">
                          {log.weight} kg
                        </td>
                        <td className="px-5 py-3 text-right text-muted">{log.reps}</td>
                        <td className="px-5 py-3 text-right text-muted/60">{log.setNumber}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
