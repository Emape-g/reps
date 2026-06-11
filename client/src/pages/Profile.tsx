import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Dumbbell, Zap, Wind, Flame, Check,
  AlertCircle, Sun, Moon, LogOut, CheckCircle2, Activity,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { apiFetch } from '../lib/api'

// ── Constants (same as Onboarding) ────────────────────────────────────────────

const GOALS = [
  { key: 'Fuerza',          Icon: Dumbbell, desc: 'Máxima fuerza y cargas pesadas' },
  { key: 'Hipertrofia',     Icon: Zap,      desc: 'Ganar masa muscular' },
  { key: 'Resistencia',     Icon: Wind,     desc: 'Aguante y cardio' },
  { key: 'Pérdida de peso', Icon: Flame,    desc: 'Quemar grasa corporal' },
]

const MUSCLES = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core']

// ── Component ─────────────────────────────────────────────────────────────────

export default function Profile() {
  const { user, refreshUser, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name ?? '')
  const [goal, setGoal] = useState(user?.goal ?? '')
  const [daysPerWeek, setDaysPerWeek] = useState(user?.daysPerWeek ?? 4)
  const [priorities, setPriorities] = useState<string[]>(() => {
    try { return JSON.parse(user?.priorities ?? '[]') as string[] } catch { return [] }
  })
  const [weight, setWeight] = useState(user?.weight?.toString() ?? '')
  const [height, setHeight] = useState(user?.height?.toString() ?? '')
  const [age, setAge]       = useState(user?.age?.toString() ?? '')
  const [gender, setGender] = useState(user?.gender ?? '')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const originalGoal = user?.goal ?? ''
  const goalChanged = goal !== '' && goal !== originalGoal

  function toggleMuscle(m: string) {
    setPriorities((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const res = await apiFetch('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          goal,
          daysPerWeek,
          priorities: JSON.stringify(priorities),
          weight:  weight  !== '' ? parseFloat(weight)  : null,
          height:  height  !== '' ? parseFloat(height)  : null,
          age:     age     !== '' ? parseInt(age, 10)   : null,
          gender:  gender  !== '' ? gender              : null,
        }),
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Error al guardar')
      }
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-bg">

      {/* Sticky header */}
      <header className="bg-surface border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/" className="btn-ghost p-1.5 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-display font-bold text-text flex-1">Mi perfil</h1>
          {saved && (
            <span className="flex items-center gap-1.5 text-success text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Guardado
            </span>
          )}
          <button
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            className="btn-primary text-sm px-4 py-1.5"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-24">

        {/* ── Account info ────────────────────────────────────────────────── */}
        <section className="card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">Email</p>
              <p className="text-sm font-medium text-text truncate">{user?.email}</p>
            </div>
            {joinDate && (
              <p className="text-xs text-muted shrink-0">
                Desde {joinDate}
              </p>
            )}
          </div>

          {/* Editable name */}
          <div className="px-5 py-4">
            <label className="text-sm font-medium text-text block mb-1.5">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
              className="input-base"
              placeholder="Tu nombre"
            />
          </div>
        </section>

        {/* ── Physical stats ───────────────────────────────────────────────── */}
        <section className="card px-5 py-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-text">Datos físicos</h2>
          </div>
          <p className="text-xs text-muted mb-4 -mt-2">
            Opcionales. La IA los usa para personalizar las sugerencias de tu rutina.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Peso (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                min={20} max={300} step={0.5}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="ej. 75"
                className="input-base"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Altura (cm)</label>
              <input
                type="number"
                inputMode="decimal"
                min={100} max={250} step={1}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="ej. 175"
                className="input-base"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Edad</label>
              <input
                type="number"
                inputMode="numeric"
                min={10} max={100} step={1}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="ej. 25"
                className="input-base"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Género</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="input-base"
              >
                <option value="">Sin especificar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── Training goal ────────────────────────────────────────────────── */}
        <section className="card px-5 py-4">
          <h2 className="text-sm font-semibold text-text mb-0.5">Objetivo de entrenamiento</h2>
          <p className="text-xs text-muted mb-4">
            Afecta las sugerencias de la IA y los valores por defecto al agregar ejercicios.
          </p>

          <div className="space-y-2">
            {GOALS.map(({ key, Icon, desc }) => (
              <button
                key={key}
                onClick={() => setGoal(key)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left transition-colors ${
                  goal === key
                    ? 'border-primary bg-primary/8'
                    : 'border-border hover:bg-surface-hi'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${goal === key ? 'text-primary' : 'text-muted'}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text text-sm">{key}</p>
                  <p className="text-xs text-muted">{desc}</p>
                </div>
                {goal === key && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>

          {goalChanged && (
            <div className="flex items-start gap-2 mt-3 bg-warning/8 border border-warning/20 text-warning text-xs px-3 py-2.5 rounded-xl leading-relaxed">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Tu objetivo afecta las sugerencias de la IA y los valores por defecto de nuevos ejercicios.
                Guardá para aplicar el cambio.
              </span>
            </div>
          )}
        </section>

        {/* ── Days per week ─────────────────────────────────────────────────── */}
        <section className="card px-5 py-4">
          <h2 className="text-sm font-semibold text-text mb-3">Días de entrenamiento por semana</h2>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((d) => (
              <button
                key={d}
                onClick={() => setDaysPerWeek(d)}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  daysPerWeek === d
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-hi text-muted hover:text-text'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        {/* ── Muscle priorities ─────────────────────────────────────────────── */}
        <section className="card px-5 py-4">
          <h2 className="text-sm font-semibold text-text mb-0.5">Grupos musculares prioritarios</h2>
          <p className="text-xs text-muted mb-3">
            La IA los prioriza al generar y analizar rutinas.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MUSCLES.map((m) => (
              <button
                key={m}
                onClick={() => toggleMuscle(m)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  priorities.includes(m)
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-hi text-muted hover:text-text'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        {/* Appearance */}
        <section className="card px-5 py-4">
          <h2 className="text-sm font-semibold text-text mb-3">Apariencia</h2>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-1 py-1.5 rounded-xl hover:bg-surface-hi transition-colors group"
          >
            <div className="flex items-center gap-3">
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-muted group-hover:text-text transition-colors" />
                : <Moon className="w-4 h-4 text-muted group-hover:text-text transition-colors" />}
              <span className="text-sm text-text">
                {theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
              </span>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${
              theme === 'dark' ? 'bg-primary' : 'bg-border'
            }`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                theme === 'dark' ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </div>
          </button>
        </section>

        {saveError && (
          <div className="flex items-start gap-2 bg-danger/8 border border-danger/20 text-danger text-sm px-4 py-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}

        <section className="card px-5 py-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-1 py-3 text-danger hover:bg-danger/5 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">Cerrar sesión</span>
          </button>
        </section>

      </main>
    </div>
  )
}
