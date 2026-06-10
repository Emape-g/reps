import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, Zap, Wind, Flame, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

const GOALS = [
  { key: 'Fuerza',          Icon: Dumbbell, desc: 'Máxima fuerza y cargas pesadas' },
  { key: 'Hipertrofia',     Icon: Zap,      desc: 'Ganar masa muscular' },
  { key: 'Resistencia',     Icon: Wind,     desc: 'Aguante y cardio' },
  { key: 'Pérdida de peso', Icon: Flame,    desc: 'Quemar grasa corporal' },
]

const MUSCLES = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core']

export default function Onboarding() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4)
  const [goal, setGoal] = useState<string>('')
  const [priorities, setPriorities] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleMuscle(m: string) {
    setPriorities((prev) =>
      prev.includes(m) ? prev.filter((p) => p !== m) : [...prev, m],
    )
  }

  async function finish() {
    setError('')
    setSaving(true)
    try {
      const res = await apiFetch('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          daysPerWeek,
          goal,
          priorities: JSON.stringify(priorities),
          onboardingDone: true,
        }),
      })
      if (!res.ok) throw new Error('No se pudo guardar')
      await refreshUser()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-2xl mb-4">
            <Dumbbell className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-text">Reps</h1>
          <p className="text-muted mt-1 text-sm">Hola, {user?.name}. Configuremos tu plan.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-primary'
                  : s < step
                  ? 'w-3 bg-primary/40'
                  : 'w-3 bg-border'
              }`}
            />
          ))}
        </div>

        <div className="card px-6 py-7 sm:px-8">
          {/* Step 1 — Days per week */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-display font-semibold text-text mb-1">
                ¿Cuántos días entrenas por semana?
              </h2>
              <p className="text-sm text-muted mb-6">
                Usaremos esto para estructurar tu rutina.
              </p>
              <div className="flex justify-between gap-2">
                {[1, 2, 3, 4, 5, 6].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDaysPerWeek(d)}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
                      daysPerWeek === d
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-hi text-muted hover:text-text'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="btn-primary w-full py-3 mt-8"
              >
                Siguiente
              </button>
            </>
          )}

          {/* Step 2 — Goal */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-display font-semibold text-text mb-1">¿Cuál es tu objetivo?</h2>
              <p className="text-sm text-muted mb-6">Elegí el que mejor te representa.</p>
              <div className="space-y-2.5">
                {GOALS.map(({ key, Icon, desc }) => (
                  <button
                    key={key}
                    onClick={() => setGoal(key)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left transition-colors ${
                      goal === key
                        ? 'border-primary bg-primary/8 text-text'
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
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="btn-ghost flex-1 py-3 border border-border"
                >
                  Volver
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!goal}
                  className="btn-primary flex-1 py-3"
                >
                  Siguiente
                </button>
              </div>
            </>
          )}

          {/* Step 3 — Priorities */}
          {step === 3 && (
            <>
              <h2 className="text-xl font-display font-semibold text-text mb-1">
                ¿Qué grupos musculares priorizar?
              </h2>
              <p className="text-sm text-muted mb-6">
                Podés elegir más de uno (o ninguno).
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

              {error && (
                <div className="flex items-start gap-2.5 bg-danger/8 border border-danger/20 text-danger text-sm px-3 py-2.5 rounded-xl mt-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setStep(2)}
                  className="btn-ghost flex-1 py-3 border border-border"
                >
                  Volver
                </button>
                <button
                  onClick={finish}
                  disabled={saving}
                  className="btn-primary flex-1 py-3"
                >
                  {saving ? 'Guardando...' : '¡Empezar!'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
