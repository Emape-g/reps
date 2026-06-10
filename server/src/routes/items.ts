import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { validate } from '../lib/validate'
import { UpdateItemSchema } from '../lib/schemas'

const router = Router()

router.post('/:itemId/logs', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params
    const { weight, reps, setNumber } = req.body as {
      weight: number
      reps: number
      setNumber?: number
    }
    if (weight == null || reps == null) {
      res.status(400).json({ error: 'weight y reps son requeridos' })
      return
    }
    const item = await prisma.routineItem.findUnique({ where: { id: itemId } })
    if (!item) {
      res.status(404).json({ error: 'Item no encontrado' })
      return
    }
    const log = await prisma.progressLog.create({
      data: {
        itemId,
        exerciseId: item.exerciseId,
        userId: req.userId,
        weight: Number(weight),
        reps: Number(reps),
        setNumber: setNumber ?? 1,
      },
    })

    // PR = beats the user's previous best weight for this exercise (first log is not a PR)
    const prevMax = await prisma.progressLog.aggregate({
      where: { exerciseId: item.exerciseId, userId: req.userId, id: { not: log.id } },
      _max: { weight: true },
    })
    const isPR = prevMax._max.weight !== null && Number(weight) > prevMax._max.weight

    res.status(201).json({ ...log, isPR })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:itemId', requireAuth, validate(UpdateItemSchema), async (req, res) => {
  try {
    const { exerciseId, sets, reps, restSeconds } = req.body as {
      exerciseId?: string
      sets?: number
      reps?: string
      restSeconds?: number
    }
    const item = await prisma.routineItem.findUnique({ where: { id: req.params.itemId } })
    if (!item) {
      res.status(404).json({ error: 'Item no encontrado' })
      return
    }
    const updated = await prisma.routineItem.update({
      where: { id: req.params.itemId },
      data: {
        ...(exerciseId  != null && { exerciseId }),
        ...(sets        != null && { sets }),
        ...(reps        != null && { reps }),
        ...(restSeconds != null && { restSeconds }),
      },
      include: { exercise: true },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:itemId', requireAuth, async (req, res) => {
  try {
    const item = await prisma.routineItem.findUnique({ where: { id: req.params.itemId } })
    if (!item) {
      res.status(404).json({ error: 'Item no encontrado' })
      return
    }
    // CASCADE: progress logs deleted by DB
    await prisma.routineItem.delete({ where: { id: req.params.itemId } })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
