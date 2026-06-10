import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft, Trash2, Plus, Sparkles, RotateCw, GripVertical, X, CheckCircle2,
} from 'lucide-react'
import { apiFetch } from '../lib/api'
import { getGoalDefaults } from '../lib/goalDefaults'
import ExerciseSearchModal, { ExerciseCatalog, muscleBadgeClass } from '../components/ExerciseSearchModal'
import OptimizePanel, { OptimizeResult } from '../components/OptimizePanel'
import ConfirmModal from '../components/ConfirmModal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExerciseInfo {
  id: string
  name: string
  primaryMuscle: string
  chain: string
}

interface ItemState {
  id: string
  exerciseId: string
  sets: number
  reps: string
  restSeconds: number
  order: number
  exercise: ExerciseInfo
}

interface DayState {
  id: string
  dayNumber: number
  label: string
  items: ItemState[]
}

interface RoutineState {
  id: string
  name: string
  days: DayState[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const WEEKDAY: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom',
}

// ── SortableExerciseItem ──────────────────────────────────────────────────────

interface ItemProps {
  item: ItemState
  onUpdated: (itemId: string, patch: Partial<ItemState>) => void
  onDeleted: (item: ItemState) => void
}

function SortableExerciseItem({ item, onUpdated, onDeleted }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  const toast = useToast()

  const [sets, setSets] = useState(String(item.sets))
  const [reps, setReps] = useState(item.reps)
  const [rest, setRest] = useState(String(item.restSeconds))
  const [saved, setSaved] = useState(false)

  useEffect(() => { setSets(String(item.sets)) }, [item.sets])
  useEffect(() => { setReps(item.reps) }, [item.reps])
  useEffect(() => { setRest(String(item.restSeconds)) }, [item.restSeconds])

  async function saveItem() {
    const parsedSets = parseInt(sets)
    const parsedRest = parseInt(rest)
    const patch = {
      sets: isNaN(parsedSets) ? item.sets : parsedSets,
      reps: reps.trim() || item.reps,
      restSeconds: isNaN(parsedRest) ? item.restSeconds : parsedRest,
    }
    // Skip if nothing changed
    if (patch.sets === item.sets && patch.reps === item.reps && patch.restSeconds === item.restSeconds) return

    const prevPatch = { sets: item.sets, reps: item.reps, restSeconds: item.restSeconds }
    onUpdated(item.id, patch)
    try {
      const res = await apiFetch(`/api/items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {
      setSets(String(prevPatch.sets))
      setReps(prevPatch.reps)
      setRest(String(prevPatch.restSeconds))
      onUpdated(item.id, prevPatch)
      toast.error('No se pudo guardar el ejercicio')
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2 bg-surface border border-border rounded-2xl px-3 py-3 mb-2 shadow-card transition-shadow"
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="touch-none text-muted/40 hover:text-muted cursor-grab active:cursor-grabbing px-0.5 select-none transition-colors"
        title="Arrastrar"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Exercise info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-text truncate">{item.exercise.name}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${muscleBadgeClass(item.exercise.primaryMuscle)}`}>
            {item.exercise.primaryMuscle}
          </span>
        </div>

        {/* Inline inputs */}
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={20}
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              onBlur={() => void saveItem()}
              className="w-10 text-center text-xs bg-surface-hi border border-border rounded-lg py-1 text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
            />
            <span className="text-xs text-muted">series</span>
          </div>
          <span className="text-border">×</span>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              onBlur={() => void saveItem()}
              className="w-14 text-center text-xs bg-surface-hi border border-border rounded-lg py-1 text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
              placeholder="8-12"
            />
            <span className="text-xs text-muted">reps</span>
          </div>
          <span className="text-border">·</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={600}
              step={15}
              value={rest}
              onChange={(e) => setRest(e.target.value)}
              onBlur={() => void saveItem()}
              className="w-12 text-center text-xs bg-surface-hi border border-border rounded-lg py-1 text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
            />
            <span className="text-xs text-muted">s</span>
          </div>
          {saved && (
            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 ml-0.5" />
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDeleted(item)}
        className="text-muted/40 hover:text-danger transition-colors p-1 rounded-lg hover:bg-danger/8 shrink-0"
        title="Quitar ejercicio"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── DayCard ───────────────────────────────────────────────────────────────────

interface DayCardProps {
  day: DayState
  routineId: string
  onLabelChange: (dayId: string, label: string) => void
  onAddExercise: (dayId: string) => void
  onDeleteDay: (dayId: string) => void
  onItemUpdated: (dayId: string, itemId: string, patch: Partial<ItemState>) => void
  onItemDeleted: (dayId: string, item: ItemState) => void
  onReorder: (dayId: string, newItems: ItemState[]) => void
}

function DayCard({
  day,
  routineId,
  onLabelChange,
  onAddExercise,
  onDeleteDay,
  onItemUpdated,
  onItemDeleted,
  onReorder,
}: DayCardProps) {
  const toast = useToast()
  const [label, setLabel] = useState(day.label)
  const [labelSaved, setLabelSaved] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => { setLabel(day.label) }, [day.label])

  async function saveLabel() {
    const newLabel = label.trim()
    if (!newLabel || newLabel === day.label) return
    const prevLabel = day.label
    onLabelChange(day.id, newLabel)
    try {
      const res = await apiFetch(`/api/routines/${routineId}/days/${day.id}`, {
        method: 'PUT',
        body: JSON.stringify({ label: newLabel }),
      })
      if (!res.ok) throw new Error()
      setLabelSaved(true)
      setTimeout(() => setLabelSaved(false), 1500)
    } catch {
      setLabel(prevLabel)
      onLabelChange(day.id, prevLabel)
      toast.error('No se pudo guardar el nombre del día')
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const oldIndex = day.items.findIndex((i) => i.id === activeId)
    const newIndex = day.items.findIndex((i) => i.id === overId)
    const prevItems = [...day.items]
    const newItems = arrayMove(day.items, oldIndex, newIndex)
    onReorder(day.id, newItems)
    try {
      const res = await apiFetch(`/api/routines/${routineId}/days/${day.id}/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ itemIds: newItems.map((i) => i.id) }),
      })
      if (!res.ok) throw new Error()
    } catch {
      onReorder(day.id, prevItems)
      toast.error('No se pudo guardar el orden')
    }
  }

  return (
    <div className="bg-surface-hi border border-border rounded-2xl overflow-hidden">
      {/* Day header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-border">
        <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
          {WEEKDAY[day.dayNumber] ?? `Día ${day.dayNumber}`}
        </span>
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => void saveLabel()}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="flex-1 min-w-0 text-sm font-semibold text-text bg-transparent border-b-2 border-transparent focus:border-primary focus:outline-none py-0.5 transition-colors"
            placeholder="Nombre del entrenamiento"
          />
          {labelSaved && (
            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
          )}
        </div>
        <button
          onClick={() => onDeleteDay(day.id)}
          className="text-muted/40 hover:text-danger transition-colors p-1 rounded-lg hover:bg-danger/8 shrink-0"
          title="Eliminar día"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Items */}
      <div className="px-4 pt-3 pb-2">
        {day.items.length === 0 ? (
          <p className="text-center text-muted text-xs py-4">Sin ejercicios. Agregá uno abajo.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={day.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {day.items.map((item) => (
                <SortableExerciseItem
                  key={item.id}
                  item={item}
                  onUpdated={(itemId, patch) => onItemUpdated(day.id, itemId, patch)}
                  onDeleted={(deletedItem) => onItemDeleted(day.id, deletedItem)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        <button
          onClick={() => onAddExercise(day.id)}
          className="w-full mt-1 flex items-center justify-center gap-2 text-primary text-sm font-medium py-2.5 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar ejercicio
        </button>
      </div>
    </div>
  )
}

// ── RoutineEditor ─────────────────────────────────────────────────────────────

export default function RoutineEditor() {
  const { id: routineId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [routine, setRoutine] = useState<RoutineState | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalDayId, setModalDayId] = useState<string | null>(null)
  const [routineName, setRoutineName] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [addingDay, setAddingDay] = useState(false)
  const [confirmDeleteDay, setConfirmDeleteDay] = useState<DayState | null>(null)
  const [showDeleteRoutineModal, setShowDeleteRoutineModal] = useState(false)
  const [deletingRoutine, setDeletingRoutine] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Tracks items removed optimistically but whose DELETE hasn't fired yet (undo window)
  const pendingDeletesRef = useRef<Map<string, {
    item: ItemState
    dayId: string
    timerId: ReturnType<typeof setTimeout>
  }>>(new Map())

  useEffect(() => {
    if (!routineId) return
    apiFetch(`/api/routines/${routineId}`)
      .then((r) => r.json())
      .then((data: RoutineState) => {
        setRoutine(data)
        setRoutineName(data.name)
      })
      .finally(() => setLoading(false))
  }, [routineId])

  // On unmount, fire any pending deletes immediately so items don't ghost back
  useEffect(() => {
    return () => {
      pendingDeletesRef.current.forEach(({ item, timerId }) => {
        clearTimeout(timerId)
        void apiFetch(`/api/items/${item.id}`, { method: 'DELETE' })
      })
    }
  }, [])

  async function saveName() {
    if (!routine || !routineName.trim() || routineName === routine.name) return
    const newName = routineName.trim()
    const prevName = routine.name
    setRoutine((r) => r && { ...r, name: newName })
    try {
      const res = await apiFetch(`/api/routines/${routineId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName }),
      })
      if (!res.ok) throw new Error()
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 1500)
    } catch {
      setRoutineName(prevName)
      setRoutine((r) => r && { ...r, name: prevName })
      toast.error('No se pudo guardar el nombre de la rutina')
    }
  }

  async function addDay() {
    if (!routineId || !routine || addingDay) return
    setAddingDay(true)
    try {
      const nextDayNumber = Math.min(
        7,
        routine.days.reduce((max, d) => Math.max(max, d.dayNumber), 0) + 1,
      )
      const res = await apiFetch(`/api/routines/${routineId}/days`, {
        method: 'POST',
        body: JSON.stringify({ dayNumber: nextDayNumber, label: 'Nuevo entrenamiento' }),
      })
      if (!res.ok) throw new Error()
      const day: DayState = await res.json()
      setRoutine((r) => r && { ...r, days: [...r.days, { ...day, items: [] }] })
    } catch {
      toast.error('No se pudo agregar el día')
    } finally {
      setAddingDay(false)
    }
  }

  function deleteDay(dayId: string) {
    const day = routine?.days.find((d) => d.id === dayId)
    if (day) setConfirmDeleteDay(day)
  }

  async function handleDeleteDayConfirm() {
    if (!confirmDeleteDay || !routineId) return
    const day = confirmDeleteDay
    setConfirmDeleteDay(null)
    setRoutine((r) => r && { ...r, days: r.days.filter((d) => d.id !== day.id) })
    try {
      const res = await apiFetch(`/api/routines/${routineId}/days/${day.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
    } catch {
      setRoutine((r) =>
        r && { ...r, days: [...r.days, day].sort((a, b) => a.dayNumber - b.dayNumber) },
      )
      toast.error('No se pudo eliminar el día')
    }
  }

  function handleLabelChange(dayId: string, label: string) {
    setRoutine((r) =>
      r && { ...r, days: r.days.map((d) => (d.id === dayId ? { ...d, label } : d)) },
    )
  }

  function handleAddExercise(dayId: string) {
    setModalDayId(dayId)
  }

  async function handleModalAdd(exercise: ExerciseCatalog) {
    if (!routineId || !modalDayId) return
    const defaults = getGoalDefaults(user?.goal)
    try {
      const res = await apiFetch(`/api/routines/${routineId}/days/${modalDayId}/items`, {
        method: 'POST',
        body: JSON.stringify({ exerciseId: exercise.id, ...defaults }),
      })
      if (!res.ok) throw new Error()
      const item: ItemState = await res.json()
      setRoutine((r) =>
        r && {
          ...r,
          days: r.days.map((d) =>
            d.id === modalDayId ? { ...d, items: [...d.items, item] } : d,
          ),
        },
      )
    } catch {
      toast.error('No se pudo agregar el ejercicio')
    }
  }

  function handleItemUpdated(dayId: string, itemId: string, patch: Partial<ItemState>) {
    setRoutine((r) =>
      r && {
        ...r,
        days: r.days.map((d) =>
          d.id === dayId
            ? { ...d, items: d.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
            : d,
        ),
      },
    )
  }

  function handleItemDeleteRequested(dayId: string, item: ItemState) {
    // Optimistic remove from UI
    setRoutine((r) =>
      r && {
        ...r,
        days: r.days.map((d) =>
          d.id === dayId ? { ...d, items: d.items.filter((i) => i.id !== item.id) } : d,
        ),
      },
    )

    // Schedule actual DELETE after the undo window closes (5.5s = 500ms after toast dismisses)
    const timerId = setTimeout(async () => {
      pendingDeletesRef.current.delete(item.id)
      try {
        const res = await apiFetch(`/api/items/${item.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error()
      } catch {
        // DELETE failed — restore item
        setRoutine((r) =>
          r && {
            ...r,
            days: r.days.map((d) =>
              d.id === dayId
                ? { ...d, items: [...d.items, item].sort((a, b) => a.order - b.order) }
                : d,
            ),
          },
        )
        toast.error('No se pudo eliminar el ejercicio')
      }
    }, 5500)

    pendingDeletesRef.current.set(item.id, { item, dayId, timerId })

    toast.info('Ejercicio quitado', {
      label: 'Deshacer',
      onClick: () => {
        const pending = pendingDeletesRef.current.get(item.id)
        if (!pending) return
        clearTimeout(pending.timerId)
        pendingDeletesRef.current.delete(item.id)
        setRoutine((r) =>
          r && {
            ...r,
            days: r.days.map((d) =>
              d.id === dayId
                ? { ...d, items: [...d.items, item].sort((a, b) => a.order - b.order) }
                : d,
            ),
          },
        )
      },
    })
  }

  function handleReorder(dayId: string, newItems: ItemState[]) {
    setRoutine((r) =>
      r && {
        ...r,
        days: r.days.map((d) => (d.id === dayId ? { ...d, items: newItems } : d)),
      },
    )
  }

  function deleteRoutine() {
    setShowDeleteRoutineModal(true)
  }

  async function handleDeleteRoutineConfirm() {
    setShowDeleteRoutineModal(false)
    setDeletingRoutine(true)
    try {
      const res = await apiFetch(`/api/routines/${routineId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      navigate('/', { replace: true })
    } catch {
      toast.error('No se pudo eliminar la rutina')
      setDeletingRoutine(false)
    }
  }

  async function refetchRoutine() {
    if (!routineId) return
    const res = await apiFetch(`/api/routines/${routineId}`)
    if (!res.ok) return
    const data: RoutineState = await res.json()
    setRoutine(data)
    setRoutineName(data.name)
  }

  async function handleOptimize() {
    if (!routineId) return
    setOptimizing(true)
    try {
      const res = await apiFetch(`/api/routines/${routineId}/optimize`, { method: 'POST' })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Error al analizar la rutina')
      }
      const result: OptimizeResult = await res.json()
      setOptimizeResult(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al contactar con el servidor')
    } finally {
      setOptimizing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-muted text-lg">Cargando editor...</div>
      </div>
    )
  }

  if (!routine) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-danger">Rutina no encontrada.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-surface border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="btn-ghost p-1.5 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-1.5 min-w-0">
            <input
              ref={nameInputRef}
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              onBlur={() => void saveName()}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="flex-1 min-w-0 text-lg font-display font-bold text-text bg-transparent border-b-2 border-transparent focus:border-primary focus:outline-none py-0.5 transition-colors"
            />
            {nameSaved && (
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            )}
          </div>
          <button
            onClick={() => void handleOptimize()}
            disabled={optimizing}
            title="Analizar y optimizar con IA"
            className="shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-primary text-on-primary text-xs font-semibold px-3 py-1.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {optimizing
              ? <RotateCw className="w-3.5 h-3.5 animate-spin" />
              : <Sparkles className="w-3.5 h-3.5" />
            }
            <span className="hidden sm:inline">
              {optimizing ? 'Analizando...' : 'Optimizar'}
            </span>
          </button>
          <button
            onClick={deleteRoutine}
            disabled={deletingRoutine}
            className="text-muted/40 hover:text-danger transition-colors p-2 rounded-xl hover:bg-danger/8 shrink-0 disabled:opacity-40"
            title="Eliminar rutina"
          >
            {deletingRoutine
              ? <RotateCw className="w-5 h-5 animate-spin text-danger" />
              : <Trash2 className="w-5 h-5" />
            }
          </button>
        </div>
      </header>

      {/* Days */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {routine.days.length === 0 && (
          <p className="text-center text-muted text-sm py-6">
            Rutina vacía. Agregá días de entrenamiento.
          </p>
        )}

        {routine.days.map((day) => (
          <DayCard
            key={day.id}
            day={day}
            routineId={routine.id}
            onLabelChange={handleLabelChange}
            onAddExercise={handleAddExercise}
            onDeleteDay={deleteDay}
            onItemUpdated={handleItemUpdated}
            onItemDeleted={handleItemDeleteRequested}
            onReorder={handleReorder}
          />
        ))}

        {routine.days.length < 7 && (
          <button
            onClick={() => void addDay()}
            disabled={addingDay}
            className="w-full flex items-center justify-center gap-2 text-muted font-medium py-3.5 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingDay
              ? <RotateCw className="w-5 h-5 animate-spin" />
              : <Plus className="w-5 h-5" />
            }
            {addingDay ? 'Agregando...' : 'Agregar día'}
          </button>
        )}
      </main>

      {/* Exercise search modal */}
      {modalDayId && (
        <ExerciseSearchModal
          addedIds={routine.days.find((d) => d.id === modalDayId)?.items.map((i) => i.exerciseId) ?? []}
          onAdd={(ex) => { void handleModalAdd(ex) }}
          onClose={() => setModalDayId(null)}
        />
      )}

      {/* Optimize panel */}
      {optimizeResult && (
        <OptimizePanel
          result={optimizeResult}
          routineId={routine.id}
          userGoal={user?.goal}
          onClose={() => setOptimizeResult(null)}
          onApplied={() => void refetchRoutine()}
        />
      )}

      {/* Delete day confirmation */}
      <ConfirmModal
        open={confirmDeleteDay !== null}
        title={`¿Eliminar "${confirmDeleteDay?.label ?? ''}"?`}
        description={
          (confirmDeleteDay?.items.length ?? 0) > 0
            ? `Se perderán los ${confirmDeleteDay!.items.length} ejercicios de este día.`
            : 'Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => void handleDeleteDayConfirm()}
        onCancel={() => setConfirmDeleteDay(null)}
      />

      {/* Delete routine confirmation */}
      <ConfirmModal
        open={showDeleteRoutineModal}
        title="¿Eliminar esta rutina?"
        description="Esta acción no se puede deshacer. Se eliminarán todos los días y ejercicios."
        confirmLabel="Eliminar rutina"
        destructive
        onConfirm={() => void handleDeleteRoutineConfirm()}
        onCancel={() => setShowDeleteRoutineModal(false)}
      />
    </div>
  )
}
