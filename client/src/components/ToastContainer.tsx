import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Info, X, Trophy } from 'lucide-react'
import { useToast, type ToastItem } from '../context/ToastContext'

const ICONS: Record<ToastItem['type'], React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  pr: Trophy,
}

const CONTAINER_COLORS: Record<ToastItem['type'], string> = {
  success: 'bg-success/8 border-success/25',
  error: 'bg-danger/8 border-danger/25',
  info: 'bg-surface border-border',
  pr: 'bg-warning/8 border-warning/25',
}

const ICON_COLORS: Record<ToastItem['type'], string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-primary',
  pr: 'text-warning',
}

const MSG_COLORS: Record<ToastItem['type'], string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-text',
  pr: 'text-text',
}

const DISMISS_COLORS: Record<ToastItem['type'], string> = {
  success: 'text-success/50 hover:text-success',
  error: 'text-danger/50 hover:text-danger',
  info: 'text-muted hover:text-text',
  pr: 'text-warning/50 hover:text-warning',
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [show, setShow] = useState(false)
  const onDismissRef = useRef(onDismiss)
  useEffect(() => { onDismissRef.current = onDismiss })

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShow(true))
    const timer = setTimeout(() => onDismissRef.current(), toast.duration)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const Icon = ICONS[toast.type]

  function handleAction() {
    toast.action?.onClick()
    onDismiss()
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ transition: 'opacity 0.25s ease, transform 0.25s ease' }}
      className={`
        pointer-events-auto flex items-start gap-3
        border rounded-2xl px-4 py-3 shadow-card-lg
        ${CONTAINER_COLORS[toast.type]}
        ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
      `}
    >
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${ICON_COLORS[toast.type]}`} />
      <span className={`flex-1 text-sm font-medium ${MSG_COLORS[toast.type]}`}>
        {toast.message}
      </span>
      {toast.action && (
        <button
          onClick={handleAction}
          className="shrink-0 text-sm font-semibold text-primary hover:opacity-70 transition-opacity"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        className={`shrink-0 transition-colors ${DISMISS_COLORS[toast.type]}`}
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 inset-x-4 sm:left-1/2 sm:right-auto sm:w-96 sm:-translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none"
      aria-label="Notificaciones"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  )
}
