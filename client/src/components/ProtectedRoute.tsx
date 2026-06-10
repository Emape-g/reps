import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Spinner() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <svg
        className="w-8 h-8 animate-spin text-primary"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-label="Cargando"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  )
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user?.onboardingDone) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export function AuthRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth()
  if (loading) return <Spinner />
  if (isAuthenticated && user?.onboardingDone) return <Navigate to="/" replace />
  if (isAuthenticated && !user?.onboardingDone) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export function OnboardingRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.onboardingDone) return <Navigate to="/" replace />
  return <>{children}</>
}
