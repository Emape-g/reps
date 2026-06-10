import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      userId: string
    }
  }
}

function secret(): string {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET is not set')
  return s
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, secret(), { expiresIn: '7d' })
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), secret()) as { sub: string }
    req.userId = payload.sub
    next()
  } catch (_err) {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
