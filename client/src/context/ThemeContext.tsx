import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from './AuthContext'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem('theme')
    if (v === 'light' || v === 'dark') return v
  } catch { /* ignore */ }
  return 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  // Sync to DOM + localStorage whenever theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try { localStorage.setItem('theme', theme) } catch { /* ignore */ }
  }, [theme])

  // Sync with server preference when user data loads
  useEffect(() => {
    if (user?.theme === 'light' || user?.theme === 'dark') {
      setThemeState(user.theme)
    }
  }, [user?.theme])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      void apiFetch('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({ theme: next }),
      })
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
