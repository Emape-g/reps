import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react'
import { apiFetch, tokenStore } from '../lib/api'

export interface AuthUser {
  id: string
  name: string
  email: string
  daysPerWeek: number | null
  goal: string | null
  priorities: string | null
  onboardingDone: boolean
  theme: string | null
  weight: number | null
  height: number | null
  age: number | null
  gender: string | null
  createdAt?: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    const res = await apiFetch('/api/users/me')
    if (!res.ok) {
      tokenStore.clear()
      setUser(null)
      return
    }
    setUser(await res.json())
  }, [])

  useEffect(() => {
    if (tokenStore.get()) {
      fetchMe().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [fetchMe])

  const login = async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al iniciar sesión')
    tokenStore.set(data.token)
    setUser(data.user)
  }

  const register = async (name: string, email: string, password: string) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al registrarse')
    tokenStore.set(data.token)
    setUser(data.user)
  }

  const logout = () => {
    tokenStore.clear()
    setUser(null)
  }

  const refreshUser = async () => {
    await fetchMe()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
