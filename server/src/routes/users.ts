import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  daysPerWeek: true,
  goal: true,
  priorities: true,
  onboardingDone: true,
  theme: true,
  weight: true,
  height: true,
  age: true,
  gender: true,
  createdAt: true,
} as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWeekStartISO(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  const diff = day === 0 ? 6 : day - 1
  d.setUTCDate(d.getUTCDate() - diff)
  return d.toISOString().split('T')[0]
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get('/me/stats', requireAuth, async (req, res) => {
  try {
    const currentWeekStartStr = getWeekStartISO(new Date())
    const weekStartDate = new Date(currentWeekStartStr + 'T00:00:00Z')

    const [logsThisWeek, allLogs] = await Promise.all([
      prisma.progressLog.findMany({
        where: { userId: req.userId, loggedAt: { gte: weekStartDate } },
        select: { loggedAt: true, weight: true, reps: true },
      }),
      prisma.progressLog.findMany({
        where: { userId: req.userId },
        select: { loggedAt: true },
      }),
    ])

    const distinctDays = new Set(logsThisWeek.map((l) => l.loggedAt.toISOString().split('T')[0]))
    const trainingsThisWeek = distinctDays.size
    const weeklyVolume = Math.round(logsThisWeek.reduce((sum, l) => sum + l.weight * l.reps, 0))

    const weeksWithLogs = new Set(allLogs.map((l) => getWeekStartISO(l.loggedAt)))
    let checkStr = currentWeekStartStr
    if (!weeksWithLogs.has(checkStr)) {
      const d = new Date(checkStr + 'T00:00:00Z')
      d.setUTCDate(d.getUTCDate() - 7)
      checkStr = d.toISOString().split('T')[0]
    }
    let weekStreak = 0
    while (weeksWithLogs.has(checkStr)) {
      weekStreak++
      const d = new Date(checkStr + 'T00:00:00Z')
      d.setUTCDate(d.getUTCDate() - 7)
      checkStr = d.toISOString().split('T')[0]
    }

    res.json({ trainingsThisWeek, weeklyVolume, weekStreak })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/me/exercise-stats', requireAuth, async (req, res) => {
  try {
    const groups = await prisma.progressLog.groupBy({
      by: ['exerciseId'],
      where: { userId: req.userId },
      _count: { id: true },
      _max: { loggedAt: true },
    })

    if (groups.length === 0) {
      res.json([])
      return
    }

    const exerciseIds = groups.map((g) => g.exerciseId)

    const [exercises, recentLogs] = await Promise.all([
      prisma.exercise.findMany({
        where: { id: { in: exerciseIds } },
        select: { id: true, name: true, primaryMuscle: true },
      }),
      prisma.progressLog.findMany({
        where: { userId: req.userId, exerciseId: { in: exerciseIds } },
        orderBy: { loggedAt: 'desc' },
        select: { exerciseId: true, weight: true, loggedAt: true },
      }),
    ])

    const exerciseMap = new Map(exercises.map((e) => [e.id, e]))

    const sessionMaxByExercise = new Map<string, Map<string, number>>()
    for (const log of recentLogs) {
      const dateKey = log.loggedAt.toISOString().split('T')[0]
      const byDate = sessionMaxByExercise.get(log.exerciseId) ?? new Map<string, number>()
      const cur = byDate.get(dateKey) ?? 0
      if (log.weight > cur) byDate.set(dateKey, log.weight)
      sessionMaxByExercise.set(log.exerciseId, byDate)
    }

    const stats = groups.map((g) => {
      const ex = exerciseMap.get(g.exerciseId)
      const byDate = sessionMaxByExercise.get(g.exerciseId) ?? new Map<string, number>()
      const weights = [...byDate.entries()]
        .sort(([a], [b]) => (a > b ? -1 : 1))
        .map(([, w]) => w)

      const lastWeight = weights[0] ?? 0
      let trend: 'up' | 'down' | 'stable' | null = null
      if (weights.length >= 2) {
        trend = weights[0] > weights[1] ? 'up' : weights[0] < weights[1] ? 'down' : 'stable'
      }

      return {
        exerciseId: g.exerciseId,
        exerciseName: ex?.name ?? '',
        primaryMuscle: ex?.primaryMuscle ?? '',
        lastWeight,
        lastLoggedAt: g._max.loggedAt?.toISOString() ?? '',
        trend,
        totalLogs: g._count.id,
      }
    })

    stats.sort((a, b) => new Date(b.lastLoggedAt).getTime() - new Date(a.lastLoggedAt).getTime())
    res.json(stats)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: USER_SELECT,
    })
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }
    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name, daysPerWeek, goal, priorities, onboardingDone, theme, weight, height, age, gender } = req.body as {
      name?: string
      daysPerWeek?: number
      goal?: string
      priorities?: string
      onboardingDone?: boolean
      theme?: string
      weight?: number | null
      height?: number | null
      age?: number | null
      gender?: string | null
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name           != null  && { name }),
        ...(daysPerWeek    != null  && { daysPerWeek }),
        ...(goal           != null  && { goal }),
        ...(priorities     != null  && { priorities }),
        ...(onboardingDone != null  && { onboardingDone }),
        ...(theme          != null  && { theme }),
        ...(weight         !== undefined && { weight }),
        ...(height         !== undefined && { height }),
        ...(age            !== undefined && { age }),
        ...(gender         !== undefined && { gender }),
      },
      select: USER_SELECT,
    })
    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
