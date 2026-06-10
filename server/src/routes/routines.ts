import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { validate } from '../lib/validate'
import {
  CreateRoutineSchema,
  UpdateRoutineSchema,
  CreateDaySchema,
  UpdateDaySchema,
  CreateItemSchema,
  ReorderItemsSchema,
} from '../lib/schemas'

const router = Router()

// ── Routines ─────────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true },
    })
    const routines = await prisma.routine.findMany({
      where: { userId: req.userId },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            items: {
              select: { exercise: { select: { chain: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Compute exerciseCount + dominantChain per day; strip raw items from response
    const result = routines.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      userId: r.userId,
      days: r.days.map((d) => {
        const counts = new Map<string, number>()
        for (const it of d.items) {
          const c = it.exercise.chain
          counts.set(c, (counts.get(c) ?? 0) + 1)
        }
        let dominantChain: string | null = null
        let best = 0
        for (const [chain, n] of counts) {
          if (n > best) { best = n; dominantChain = chain }
        }
        return { id: d.id, dayNumber: d.dayNumber, label: d.label, exerciseCount: d.items.length, dominantChain }
      }),
    }))

    res.json({ user, routines: result })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', requireAuth, validate(CreateRoutineSchema), async (req, res) => {
  try {
    const { name } = req.body as { name: string }
    const routine = await prisma.routine.create({
      data: { name, userId: req.userId },
      include: { days: true },
    })
    res.status(201).json(routine)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const routine = await prisma.routine.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: { exercise: true },
            },
          },
        },
      },
    })
    if (!routine) {
      res.status(404).json({ error: 'Rutina no encontrada' })
      return
    }
    res.json(routine)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', requireAuth, validate(UpdateRoutineSchema), async (req, res) => {
  try {
    const { name } = req.body as { name: string }
    const existing = await prisma.routine.findFirst({
      where: { id: req.params.id, userId: req.userId },
    })
    if (!existing) {
      res.status(404).json({ error: 'Rutina no encontrada' })
      return
    }
    const updated = await prisma.routine.update({
      where: { id: req.params.id },
      data: { name },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.routine.findFirst({
      where: { id: req.params.id, userId: req.userId },
    })
    if (!existing) {
      res.status(404).json({ error: 'Rutina no encontrada' })
      return
    }
    // CASCADE: days → items → progress logs handled by DB
    await prisma.routine.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── Days ──────────────────────────────────────────────────────────────────────

router.get('/:id/days/:dayId', requireAuth, async (req, res) => {
  try {
    const { dayId } = req.params
    const day = await prisma.routineDay.findUnique({
      where: { id: dayId },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: { exercise: true },
        },
      },
    })
    if (!day) {
      res.status(404).json({ error: 'Día no encontrado' })
      return
    }
    const itemsWithLastLog = await Promise.all(
      day.items.map(async (item) => {
        const lastLog = await prisma.progressLog.findFirst({
          where: { exerciseId: item.exerciseId, userId: req.userId },
          orderBy: { loggedAt: 'desc' },
          select: { weight: true, reps: true, loggedAt: true },
        })
        return { ...item, lastLog }
      }),
    )
    res.json({ ...day, items: itemsWithLastLog })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/days', requireAuth, validate(CreateDaySchema), async (req, res) => {
  try {
    const { dayNumber, label } = req.body as { dayNumber: number; label: string }
    const routine = await prisma.routine.findFirst({
      where: { id: req.params.id, userId: req.userId },
    })
    if (!routine) {
      res.status(404).json({ error: 'Rutina no encontrada' })
      return
    }
    const day = await prisma.routineDay.create({
      data: { routineId: req.params.id, dayNumber, label },
      include: { items: true },
    })
    res.status(201).json(day)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id/days/:dayId', requireAuth, validate(UpdateDaySchema), async (req, res) => {
  try {
    const { label, dayNumber } = req.body as { label?: string; dayNumber?: number }
    const day = await prisma.routineDay.findFirst({
      where: { id: req.params.dayId, routineId: req.params.id },
    })
    if (!day) {
      res.status(404).json({ error: 'Día no encontrado' })
      return
    }
    const updated = await prisma.routineDay.update({
      where: { id: req.params.dayId },
      data: {
        ...(label != null && { label }),
        ...(dayNumber != null && { dayNumber }),
      },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id/days/:dayId', requireAuth, async (req, res) => {
  try {
    const day = await prisma.routineDay.findFirst({
      where: { id: req.params.dayId, routineId: req.params.id },
    })
    if (!day) {
      res.status(404).json({ error: 'Día no encontrado' })
      return
    }
    // CASCADE: items → progress logs handled by DB
    await prisma.routineDay.delete({ where: { id: req.params.dayId } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── Items ─────────────────────────────────────────────────────────────────────

router.post('/:id/days/:dayId/items', requireAuth, validate(CreateItemSchema), async (req, res) => {
  try {
    const { exerciseId, sets, reps, restSeconds } = req.body as {
      exerciseId: string
      sets: number
      reps: string
      restSeconds: number
    }
    const day = await prisma.routineDay.findFirst({
      where: { id: req.params.dayId, routineId: req.params.id },
    })
    if (!day) {
      res.status(404).json({ error: 'Día no encontrado' })
      return
    }
    const { _max } = await prisma.routineItem.aggregate({
      where: { dayId: req.params.dayId },
      _max: { order: true },
    })
    const item = await prisma.routineItem.create({
      data: {
        dayId: req.params.dayId,
        exerciseId,
        sets,
        reps,
        restSeconds,
        order: (_max.order ?? 0) + 1,
      },
      include: { exercise: true },
    })
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/:id/days/:dayId/reorder', requireAuth, validate(ReorderItemsSchema), async (req, res) => {
  try {
    const { itemIds } = req.body as { itemIds: string[] }
    await prisma.$transaction(
      itemIds.map((itemId, index) =>
        prisma.routineItem.update({
          where: { id: itemId },
          data: { order: index + 1 },
        }),
      ),
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
