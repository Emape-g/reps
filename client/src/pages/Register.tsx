import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-2xl mb-4">
            <Dumbbell className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-text">Reps</h1>
          <p className="text-muted mt-1 text-sm">Creá tu cuenta gratis</p>
        </div>

        {/* Card */}
        <div className="card px-6 py-7 sm:px-8">
          <h2 className="text-xl font-display font-semibold text-text mb-6">Crear cuenta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text block mb-1.5">Nombre</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="input-base"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text block mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vos@ejemplo.com"
                className="input-base"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-text block mb-1.5">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="input-base"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-danger/8 border border-danger/20 text-danger text-sm px-3 py-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-1">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-5">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
