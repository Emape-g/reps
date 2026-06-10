import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    const q = req.query.q as string | undefined
    const chain = req.query.chain as string | undefined

    const exercises = await prisma.exercise.findMany({
      where: {
        ...(q ? { name: { contains: q } } : {}),
        ...(chain && chain !== 'all' ? { chain } : {}),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, primaryMuscle: true, secondary: true, chain: true },
    })
    res.json(exercises)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:exerciseId/progress', requireAuth, async (req, res) => {
  try {
    const { exerciseId } = req.params
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, name: true, primaryMuscle: true, chain: true },
    })
    if (!exercise) {
      res.status(404).json({ error: 'Ejercicio no encontrado' })
      return
    }
    const logs = await prisma.progressLog.findMany({
      where: { exerciseId, userId: req.userId },
      orderBy: { loggedAt: 'asc' },
      select: { id: true, weight: true, reps: true, setNumber: true, loggedAt: true },
    })
    const pr = logs.reduce<(typeof logs)[0] | null>((best, log) => {
      if (!best || log.weight > best.weight) return log
      return best
    }, null)
    const dateMap = new Map<string, number>()
    for (const log of logs) {
      const date = new Date(log.loggedAt).toISOString().split('T')[0]
      const current = dateMap.get(date) ?? 0
      if (log.weight > current) dateMap.set(date, log.weight)
    }
    const chartData = Array.from(dateMap.entries()).map(([date, maxWeight]) => ({
      date,
      maxWeight,
    }))
    res.json({ exercise, logs, chartData, pr })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
