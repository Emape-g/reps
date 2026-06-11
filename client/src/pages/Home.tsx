import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Sun, Moon, Dumbbell, WifiOff, ChevronRight, UserCircle,
  Zap, Flame, BarChart2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { apiFetch } from '../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Day {
  id: string
  dayNumber: number
  label: string
  exerciseCount: number
  dominantChain: string | null
}

interface Routine {
  id: string
  name: string
  days: Day[]
}

interface RoutinesData {
  user: { id: string; name: string }
  routines: Routine[]
}

interface Stats {
  trainingsThisWeek: number
  weeklyVolume: number
  weekStreak: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CHAIN_COLORS: Record<string, string> = {
  push:   'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  pull:   'bg-blue-500/10   text-blue-600   dark:text-blue-400',
  legs:   'bg-success/10   text-success',
  core:   'bg-primary/10   text-primary',
  cardio: 'bg-warning/10   text-warning',
}

// JS getDay(): 0=Sun, 1=Mon … 6=Sat → dayNumber: 1=Mon … 7=Sun
function todayDayNumber(): number {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return String(v)
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function SkeletonStats() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card px-3 py-3 animate-pulse">
          <div className="h-6 bg-surface-hi rounded-full w-10 mb-2" />
          <div className="h-2.5 bg-surface-hi rounded-full w-8 mb-1" />
          <div className="h-2.5 bg-surface-hi rounded-full w-16" />
        </div>
      ))}
    </div>
  )
}

function SkeletonRoutineCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="h-4 bg-surface-hi rounded-full w-36" />
        <div className="h-3 bg-surface-hi rounded-full w-10" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 last:border-0">
          <div className="space-y-1.5">
            <div className="h-2.5 bg-surface-hi rounded-full w-10" />
            <div className="h-3.5 bg-surface-hi rounded-full w-32" />
          </div>
          <div className="h-5 bg-surface-hi rounded-full w-14" />
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const { user }          = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate          = useNavigate()

  const [routines, setRoutines] = useState<Routine[] | null>(null)
  const [stats,    setStats]    = useState<Stats    | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.allSettled([
      apiFetch('/api/routines'),
      apiFetch('/api/users/me/stats'),
    ]).then(async ([routinesResult, statsResult]) => {
      if (routinesResult.status === 'fulfilled' && routinesResult.value.ok) {
        const data = await routinesResult.value.json() as RoutinesData
        setRoutines(data.routines)
      } else {
        setError('No se pudo conectar al servidor. Verificá tu conexión.')
      }
      if (statsResult.status === 'fulfilled' && statsResult.value.ok) {
        const data = await statsResult.value.json() as Stats
        setStats(data)
      }
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // "Te toca hoy" heuristic
  type DayWithRoutine = Day & { routineId: string; routineName: string }
  const todayNum = todayDayNumber()
  const todayWorkout: DayWithRoutine | null = routines
    ? (routines
        .flatMap((r) => r.days.map((d) => ({ ...d, routineId: r.id, routineName: r.name })))
        .find((d) => d.dayNumber === todayNum) ?? null)
    : null

  const header = (
    <header className="bg-surface border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        <Dumbbell className="w-5 h-5 text-primary shrink-0" />
        <div className="min-w-0">
          <h1 className="text-xl font-display font-bold text-text">Reps</h1>
          <p className="text-xs text-muted truncate">
            {user?.name}
            {user?.goal && (
              <Link
                to="/profile"
                className="ml-2 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium hover:bg-primary/20 transition-colors"
              >
                {user.goal}
              </Link>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-3">
        <button
          onClick={toggleTheme}
          className="btn-ghost p-2"
          aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <Link to="/profile" className="btn-ghost p-2" aria-label="Mi perfil">
          <UserCircle className="w-4 h-4" />
        </Link>
      </div>
    </header>
  )

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-bg pb-20">
        {header}
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          <SkeletonStats />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 bg-surface-hi rounded-full w-24 animate-pulse" />
              <div className="h-9 bg-surface-hi rounded-xl w-28 animate-pulse" />
            </div>
            <div className="space-y-4">
              <SkeletonRoutineCard />
              <SkeletonRoutineCard />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error && routines === null) {
    return (
      <div className="min-h-screen bg-bg pb-20">
        {header}
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-danger/10 rounded-2xl mb-4">
            <WifiOff className="w-7 h-7 text-danger" />
          </div>
          <p className="text-text font-semibold mb-1">No se pudo cargar</p>
          <p className="text-sm text-muted mb-6">{error}</p>
          <button onClick={load} className="btn-primary px-5 py-2.5">
            Reintentar
          </button>
        </main>
      </div>
    )
  }

  // ── Content ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg pb-20">
      {header}

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Continuar hoy ───────────────────────────────────────────────── */}
        {todayWorkout && (
          <Link
            to={`/routines/${todayWorkout.routineId}/days/${todayWorkout.id}`}
            className="block card overflow-hidden border-primary/30 hover:border-primary/50 transition-colors"
          >
            <div className="h-1 bg-gradient-to-r from-primary to-violet-500" />
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted font-semibold uppercase tracking-widest mb-0.5">
                  Te toca hoy
                </p>
                <p className="font-display font-bold text-text text-lg leading-tight truncate">
                  {todayWorkout.label}
                </p>
                <p className="text-xs text-muted mt-0.5">{todayWorkout.routineName}</p>
              </div>
              <div className="shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/10">
                <Zap className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="px-5 pb-3.5 flex items-center gap-1.5 text-primary text-sm font-semibold">
              Iniciar sesión
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        )}

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        {stats ? (
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                Icon: Flame,
                iconClass: 'text-orange-400',
                value: stats.trainingsThisWeek,
                unit: stats.trainingsThisWeek === 1 ? 'día' : 'días',
                label: 'Esta semana',
              },
              {
                Icon: BarChart2,
                iconClass: 'text-primary',
                value: formatVolume(stats.weeklyVolume),
                unit: 'kg',
                label: 'Volumen',
              },
              {
                Icon: Zap,
                iconClass: 'text-success',
                value: stats.weekStreak,
                unit: stats.weekStreak === 1 ? 'sem.' : 'sem.',
                label: 'Racha',
              },
            ].map(({ Icon, iconClass, value, unit, label }) => (
              <div key={label} className="card px-3 py-3">
                <Icon className={`w-4 h-4 mb-1.5 ${iconClass}`} />
                <p className="text-xl font-display font-bold text-text tabular-nums leading-none">
                  {value}
                </p>
                <p className="text-xs text-muted mt-1">{unit}</p>
                <p className="text-[10px] text-muted/60 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <SkeletonStats />
        )}

        {/* ── Routines ────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-text">Mis rutinas</h2>
            <button
              onClick={() => navigate('/routines/new')}
              className="btn-primary text-sm px-3 py-2 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nueva
            </button>
          </div>

          {routines === null || routines.length === 0 ? (
            <div className="text-center py-14">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-5">
                <Dumbbell className="w-8 h-8 text-primary" />
              </div>
              <p className="text-text font-semibold mb-1">Sin rutinas todavía</p>
              <p className="text-sm text-muted mb-6">
                Creá tu primera rutina y empezá a registrar tu progreso.
              </p>
              <button onClick={() => navigate('/routines/new')} className="btn-primary px-5 py-2.5">
                Crear mi primera rutina
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {routines.map((routine) => (
                <div key={routine.id} className="card overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
                    <h3 className="font-display font-semibold text-text truncate mr-2">
                      {routine.name}
                    </h3>
                    <Link
                      to={`/routines/${routine.id}/edit`}
                      className="shrink-0 text-xs text-primary font-medium hover:underline"
                    >
                      Editar
                    </Link>
                  </div>

                  {routine.days.length === 0 ? (
                    <div className="px-5 py-4 text-center">
                      <p className="text-xs text-muted">Sin días configurados.</p>
                      <Link
                        to={`/routines/${routine.id}/edit`}
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                      >
                        Configurar →
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {routine.days.map((day) => {
                        const chain      = day.dominantChain ?? ''
                        const colorClass = CHAIN_COLORS[chain] ?? 'bg-surface-hi text-muted'
                        const isToday    = day.dayNumber === todayNum
                        return (
                          <Link
                            key={day.id}
                            to={`/routines/${routine.id}/days/${day.id}`}
                            className={`flex items-center justify-between px-5 py-3.5 hover:bg-surface-hi active:bg-surface-hi transition-colors ${
                              isToday ? 'bg-primary/4' : ''
                            }`}
                          >
                            <div className="min-w-0 mr-2">
                              <span className="text-xs font-medium text-muted uppercase tracking-wide">
                                Día {day.dayNumber}
                                {isToday && (
                                  <span className="ml-1.5 text-primary font-semibold">· hoy</span>
                                )}
                              </span>
                              <p className="text-sm font-medium text-text mt-0.5 truncate">
                                {day.label}
                              </p>
                              {day.exerciseCount > 0 && (
                                <p className="text-[10px] text-muted mt-0.5">
                                  {day.exerciseCount} {day.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {chain && (
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
                                  {chain}
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 text-muted" />
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
