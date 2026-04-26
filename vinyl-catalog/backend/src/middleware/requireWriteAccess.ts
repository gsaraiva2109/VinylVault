import type { Request, Response, NextFunction } from 'express'

/**
 * Reject mutating requests when the authenticated user is in the demo group.
 * Composes after `authMiddleware`, which populates `req.user.isDemo`.
 *
 * The `code` discriminator lets the frontend distinguish demo blocks
 * from generic 403s and surface a tailored message.
 */
export function requireWriteAccess(req: Request, res: Response, next: NextFunction) {
  if (req.user?.isDemo) {
    return res.status(403).json({
      error: 'Demo users cannot modify the shared collection',
      code: 'DEMO_READ_ONLY',
    })
  }
  next()
}
