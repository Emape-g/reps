import { createContext, useCallback, useContext, useState, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'pr'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  action?: ToastAction
  duration: number
}

interface ToastContextValue {
  toasts: ToastItem[]
  push: (opts: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((opts: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { ...opts, id }])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  const { push, dismiss, toasts } = ctx
  return {
    toasts,
    dismiss,
    success: (message: string) => push({ type: 'success', message, duration: 3000 }),
    error: (message: string) => push({ type: 'error', message, duration: 4000 }),
    info: (message: string, action?: ToastAction) =>
      push({ type: 'info', message, action, duration: action ? 5500 : 3000 }),
    pr: (message: string) => push({ type: 'pr', message, duration: 5000 }),
  }
}
