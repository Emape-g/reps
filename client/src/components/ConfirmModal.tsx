import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-surface border border-border rounded-2xl shadow-card-lg max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {destructive && (
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-danger/10 mb-4">
            <AlertTriangle className="w-6 h-6 text-danger" />
          </div>
        )}
        <h2 className="font-display font-bold text-text text-base mb-2">{title}</h2>
        {description && (
          <p className="text-sm text-muted mb-6 leading-relaxed">{description}</p>
        )}
        <div className={`flex gap-3 ${!description ? 'mt-4' : ''}`}>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-text hover:bg-surface-hi transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              destructive
                ? 'bg-danger text-white hover:bg-danger/90'
                : 'bg-primary text-on-primary hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
