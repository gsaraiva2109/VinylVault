import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string | undefined) || randomUUID()
  req.headers['x-request-id'] = id
  res.setHeader('X-Request-ID', id)
  next()
}
