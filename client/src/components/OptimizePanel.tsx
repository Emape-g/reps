import { useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, Trophy, Check, X } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { getGoalDefaults } from '../lib/goalDefaults'
import { muscleBadgeClass } from './ExerciseSearchModal'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MuscleSummaryItem {
  muscle: string
  weeklySets: number
  status: 'low' | 'optimal' | 'high'
  minRecommended: number
  maxRecommended: number
  recommendation: string
}

export interface ChainBalance {
  anteriorRatio: number
  posteriorRatio: number
  status: 'balanced' | 'anterior_dominant' | 'posterior_dominant'
  comment: string
}

export interface PriorityCoverage {
  muscle: string
  weeklySets: number
  covered: boolean
}

export interface Suggestion {
  dayId: string
  itemId: string | null
  type: 'replace' | 'add' | 'remove'
  currentExercise: string | null
  suggestedExercise: string
  suggestedExerciseId: string | null
  reason: string
  priority: 'high' | 'medium' | 'low'
}

export interface OptimizeResult {
  muscleSummary: MuscleSummaryItem[]
  chainBalance: ChainBalance
  priorityCoverage: PriorityCoverage[]
  suggestions: Suggestion[]
  overallScore: number
  summary: string
}

interface Props {
  result: OptimizeResult
  routineId: string
  userGoal: string | null | undefined
  onClose: () => void
  onApplied: () => void
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80 ? 'bg-success text-on-primary' : score >= 60 ? 'bg-warning text-on-primary' : 'bg-danger text-on-primary'
  return (
    <div className={`${cls} text-sm font-display font-bold px-3 py-1.5 rounded-full tabular-nums`}>
      {score}/100
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </section>
  )
}

function MuscleCard({ item }: { item: MuscleSummaryItem }) {
  const config = {
    low:     { dot: 'bg-danger',   border: 'border-danger/20 bg-danger/5',   count: 'text-danger'  },
    optimal: { dot: 'bg-success',  border: 'border-success/20 bg-success/5', count: 'text-success' },
    high:    { dot: 'bg-warning',  border: 'border-warning/20 bg-warning/5', count: 'text-warning' },
  }[item.status]

  return (
    <div className={`border rounded-2xl p-3 ${config.border}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${config.dot}`} />
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full truncate ${muscleBadgeClass(item.muscle)}`}>
          {item.muscle}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-display font-bold tabular-nums ${config.count}`}>
          {Math.round(item.weeklySets)}
        </span>
        <span className="text-xs text-muted">ser/sem</span>
      </div>
      <p className="text-xs text-muted mt-0.5">
        Meta: {item.minRecommended}–{item.maxRecommended}
      </p>
      <p className="text-xs text-muted mt-1.5 line-clamp-2 leading-relaxed">
        {item.recommendation}
      </p>
    </div>
  )
}

function ChainBalanceViz({ balance }: { balance: ChainBalance }) {
  const anteriorPct = Math.round(balance.anteriorRatio * 100)
  const posteriorPct = 100 - anteriorPct
  const isBalanced = balance.status === 'balanced'

  return (
    <div>
      <div className="flex rounded-xl overflow-hidden h-9 mb-2">
        <div
          className={`flex items-center justify-center text-xs font-bold text-on-primary transition-all ${
            balance.status === 'anterior_dominant' ? 'bg-warning' : 'bg-primary'
          }`}
          style={{ width: `${anteriorPct}%` }}
        >
          {anteriorPct >= 12 && `${anteriorPct}%`}
        </div>
        <div
          className={`flex items-center justify-center text-xs font-bold text-on-primary transition-all ${
            balance.status === 'posterior_dominant' ? 'bg-warning' : 'bg-blue-500'
          }`}
          style={{ width: `${posteriorPct}%` }}
        >
          {posteriorPct >= 12 && `${posteriorPct}%`}
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted mb-2 px-0.5">
        <span>← Anterior (push)</span>
        <span>Posterior (pull) →</span>
      </div>
      <p className={`text-xs px-3 py-2 rounded-xl leading-relaxed border ${
        isBalanced
          ? 'bg-success/8 text-success border-success/20'
          : 'bg-warning/8 text-warning border-warning/20'
      }`}>
        {balance.comment}
      </p>
    </div>
  )
}

function PriorityItem({ item }: { item: PriorityCoverage }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2">
        {item.covered
          ? <Check className="w-4 h-4 text-success shrink-0" />
          : <X className="w-4 h-4 text-danger shrink-0" />
        }
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${muscleBadgeClass(item.muscle)}`}>
          {item.muscle}
        </span>
      </div>
      <span className="text-xs text-muted tabular-nums">
        {Math.round(item.weeklySets)} series/sem
      </span>
    </div>
  )
}

const PRIORITY_CONFIG = {
  high:   { label: 'ALTA',  cls: 'bg-danger/10 text-danger'    },
  medium: { label: 'MEDIA', cls: 'bg-warning/10 text-warning'  },
  low:    { label: 'BAJA',  cls: 'bg-surface-hi text-muted'    },
}

const TYPE_LABELS: Record<Suggestion['type'], string> = {
  replace: 'Reemplazar',
  add:     'Agregar',
  remove:  'Eliminar',
}

function SuggestionCard({
  suggestion,
  isApplied,
  isApplying,
  onApply,
}: {
  suggestion: Suggestion
  isApplied: boolean
  isApplying: boolean
  onApply: () => void
}) {
  const pConf = PRIORITY_CONFIG[suggestion.priority]
  const canApply =
    !isApplied &&
    !isApplying &&
    suggestion.suggestedExerciseId !== null &&
    (suggestion.type !== 'replace' || suggestion.itemId !== null) &&
    (suggestion.type !== 'remove'  || suggestion.itemId !== null)

  return (
    <div className={`card p-4 transition-colors ${
      isApplied ? 'border-success/30 bg-success/5' : ''
    }`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pConf.cls}`}>
              {pConf.label}
            </span>
            <span className="text-xs font-medium text-muted">{TYPE_LABELS[suggestion.type]}</span>
          </div>

          {suggestion.type === 'replace' && (
            <div className="flex items-center gap-1.5 flex-wrap text-sm">
              <span className="text-muted line-through">{suggestion.currentExercise}</span>
              <span className="text-muted/50 text-xs">→</span>
              <span className="font-semibold text-text">{suggestion.suggestedExercise}</span>
            </div>
          )}
          {suggestion.type === 'add' && (
            <p className="text-sm font-semibold text-text">
              <span className="text-primary mr-1">+</span>{suggestion.suggestedExercise}
            </p>
          )}
          {suggestion.type === 'remove' && (
            <p className="text-sm text-muted line-through">{suggestion.currentExercise}</p>
          )}

          <p className="text-xs text-muted mt-2 leading-relaxed">{suggestion.reason}</p>

          {!canApply && !isApplied && suggestion.suggestedExerciseId === null && (
            <p className="text-xs text-muted/50 mt-1">
              Ejercicio no encontrado en catálogo — aplicá manualmente.
            </p>
          )}
        </div>

        <div className="shrink-0 mt-0.5">
          {isApplied ? (
            <div className="w-7 h-7 rounded-full bg-success/15 flex items-center justify-center">
              <Check className="w-4 h-4 text-success" />
            </div>
          ) : (
            <button
              onClick={onApply}
              disabled={!canApply}
              className="btn-primary text-xs px-3 py-1.5 disabled:opacity-30"
            >
              {isApplying ? '...' : 'Aplicar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OptimizePanel({ result, routineId, userGoal, onClose, onApplied }: Props) {
  const [applied, setApplied] = useState(new Set<number>())
  const [applying, setApplying] = useState<number | null>(null)

  async function applySuggestion(s: Suggestion, idx: number) {
    setApplying(idx)
    try {
      if (s.type === 'replace' && s.itemId && s.suggestedExerciseId) {
        await apiFetch(`/api/items/${s.itemId}`, {
          method: 'PUT',
          body: JSON.stringify({ exerciseId: s.suggestedExerciseId }),
        })
      } else if (s.type === 'remove' && s.itemId) {
        await apiFetch(`/api/items/${s.itemId}`, { method: 'DELETE' })
      } else if (s.type === 'add' && s.suggestedExerciseId) {
        const defaults = getGoalDefaults(userGoal)
        await apiFetch(`/api/routines/${routineId}/days/${s.dayId}/items`, {
          method: 'POST',
          body: JSON.stringify({ exerciseId: s.suggestedExerciseId, ...defaults }),
        })
      }
      setApplied((prev) => new Set([...prev, idx]))
      onApplied()
    } finally {
      setApplying(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col overflow-hidden">
      {/* Sticky header */}
      <header className="shrink-0 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="btn-ghost p-1.5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-display font-bold text-text">Análisis IA</h1>
            <p className="text-xs text-muted">Powered by Groq</p>
          </div>
        </div>
        <ScoreBadge score={result.overallScore} />
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-7">
          {/* AI summary */}
          <p className="text-sm text-text bg-primary/8 border border-primary/20 rounded-2xl px-4 py-3 leading-relaxed">
            {result.summary}
          </p>

          {/* Muscle volume semáforo */}
          <Section title="Volumen semanal por grupo muscular">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {result.muscleSummary.map((m) => (
                <MuscleCard key={m.muscle} item={m} />
              ))}
            </div>
          </Section>

          {/* Chain balance */}
          <Section title="Balance cadena anterior / posterior">
            <ChainBalanceViz balance={result.chainBalance} />
          </Section>

          {/* Priority coverage */}
          {result.priorityCoverage.length > 0 && (
            <Section title="Cobertura de grupos priorizados">
              <div className="card px-4">
                {result.priorityCoverage.map((p) => (
                  <PriorityItem key={p.muscle} item={p} />
                ))}
              </div>
            </Section>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 ? (
            <Section title="Sugerencias de optimización">
              <div className="space-y-3 pb-6">
                {result.suggestions.map((s, idx) => (
                  <SuggestionCard
                    key={idx}
                    suggestion={s}
                    isApplied={applied.has(idx)}
                    isApplying={applying === idx}
                    onApply={() => void applySuggestion(s, idx)}
                  />
                ))}
              </div>
            </Section>
          ) : (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-warning/10 rounded-2xl mb-4">
                <Trophy className="w-7 h-7 text-warning" />
              </div>
              <p className="text-sm font-semibold text-text">Tu rutina está bien optimizada.</p>
              <p className="text-xs text-muted mt-1">No hay sugerencias de cambio por ahora.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

