import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { signToken } from '../middleware/auth'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body as {
      name: string
      email: string
      password: string
    }

    if (!name || !email || !password) {
      res.status(400).json({ error: 'name, email y password son requeridos' })
      return
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: 'El email ya está registrado' })
      return
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true, onboardingDone: true },
    })

    res.status(201).json({ token: signToken(user.id), user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string }

    if (!email || !password) {
      res.status(400).json({ error: 'email y password son requeridos' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(401).json({ error: 'Credenciales incorrectas' })
      return
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ error: 'Credenciales incorrectas' })
      return
    }

    const { password: _pw, ...safeUser } = user
    res.json({ token: signToken(user.id), user: safeUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
