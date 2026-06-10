import { useEffect, useState, useRef } from 'react'
import { Search, X, Plus, Check } from 'lucide-react'
import { apiFetch } from '../lib/api'

export interface ExerciseCatalog {
  id: string
  name: string
  primaryMuscle: string
  secondary: string
  chain: string
}

interface Props {
  addedIds: string[]
  onAdd: (exercise: ExerciseCatalog) => void
  onClose: () => void
}

const CHAIN_LABELS: Record<string, string> = {
  all:  'Todos',
  push: 'Push',
  pull: 'Pull',
  legs: 'Piernas',
  core: 'Core',
}

// Opacity-based muscle badges that work in both light and dark
const MUSCLE_COLORS: Record<string, string> = {
  Pecho:          'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  Hombros:        'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  'Tríceps':      'bg-red-500/10 text-red-700 dark:text-red-400',
  Dorsal:         'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  Espalda:        'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  'Espalda baja': 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  'Bíceps':       'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  'Cuádriceps':   'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  Isquios:        'bg-teal-500/10 text-teal-700 dark:text-teal-400',
  'Glúteos':      'bg-pink-500/10 text-pink-700 dark:text-pink-400',
  Gemelos:        'bg-lime-500/10 text-lime-700 dark:text-lime-400',
  'Sóleos':       'bg-green-500/10 text-green-700 dark:text-green-400',
  Abdominales:    'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  Oblicuos:       'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400',
  Trapecios:      'bg-amber-500/10 text-amber-700 dark:text-amber-400',
}

export function muscleBadgeClass(muscle: string) {
  return MUSCLE_COLORS[muscle] ?? 'bg-surface-hi text-muted'
}

export default function ExerciseSearchModal({ addedIds, onAdd, onClose }: Props) {
  const [exercises, setExercises] = useState<ExerciseCatalog[]>([])
  const [query, setQuery] = useState('')
  const [chain, setChain] = useState('all')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiFetch('/api/exercises')
      .then((r) => r.json())
      .then(setExercises)
    inputRef.current?.focus()
  }, [])

  const filtered = exercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(query.toLowerCase()) &&
      (chain === 'all' || ex.chain === chain),
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative mt-auto w-full bg-surface rounded-t-2xl flex flex-col border-t border-border shadow-card-lg"
        style={{ maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Search bar */}
        <div className="px-4 pt-2 pb-3 border-b border-border">
          <div className="flex items-center gap-2 bg-surface-hi rounded-xl px-3 py-2.5">
            <Search className="w-4 h-4 text-muted shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ejercicio..."
              className="flex-1 bg-transparent text-sm outline-none text-text placeholder:text-muted/60"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-muted hover:text-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Chain filter tabs */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5 scrollbar-hide">
            {Object.entries(CHAIN_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setChain(key)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  chain === key
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-hi text-muted hover:text-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise list */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <p className="text-center text-muted text-sm py-10">Sin resultados</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {filtered.map((ex) => {
                const added = addedIds.includes(ex.id)
                return (
                  <li key={ex.id}>
                    <button
                      onClick={() => !added && onAdd(ex)}
                      disabled={added}
                      className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${
                        added ? 'opacity-40 cursor-default' : 'hover:bg-surface-hi active:bg-surface-hi'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text text-sm truncate">{ex.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${muscleBadgeClass(ex.primaryMuscle)}`}>
                            {ex.primaryMuscle}
                          </span>
                          <span className="text-xs text-muted capitalize">{ex.chain}</span>
                        </div>
                      </div>
                      {added ? (
                        <Check className="w-4 h-4 text-muted ml-3 shrink-0" />
                      ) : (
                        <Plus className="w-5 h-5 text-primary ml-3 shrink-0" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

