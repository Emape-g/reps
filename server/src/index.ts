import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import usersRouter from './routes/users'
import generateRouter from './routes/generate'
import routinesRouter from './routes/routines'
import optimizeRouter from './routes/optimize'
import itemsRouter from './routes/items'
import exercisesRouter from './routes/exercises'

const app = express()
const PORT = process.env.PORT ?? 3001

const allowedOrigin = process.env.CLIENT_URL ?? '*'
app.use(cors({ origin: allowedOrigin, credentials: true }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/routines', generateRouter)
app.use('/api/routines', routinesRouter)
app.use('/api/routines', optimizeRouter)
app.use('/api/items', itemsRouter)
app.use('/api/exercises', exercisesRouter)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
