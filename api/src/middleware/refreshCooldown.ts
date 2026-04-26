import type { Request, Response, NextFunction } from 'express'

const DEFAULT_COOLDOWN_MS = 5 * 60_000

let lastRefreshAt = 0

export function priceRefreshCooldown(_req: Request, res: Response, next: NextFunction) {
  const cooldownMs = Number(process.env.PRICE_REFRESH_COOLDOWN_MS) || DEFAULT_COOLDOWN_MS
  const now = Date.now()
  const elapsed = now - lastRefreshAt

  if (elapsed < cooldownMs) {
    const retryAfterSec = Math.ceil((cooldownMs - elapsed) / 1000)
    res.setHeader('Retry-After', String(retryAfterSec))
    return res.status(429).json({
      error: 'Price refresh is on cooldown',
      retryAfterSeconds: retryAfterSec,
      code: 'REFRESH_COOLDOWN',
    })
  }

  lastRefreshAt = now
  next()
}

export function _resetRefreshCooldownForTests() {
  lastRefreshAt = 0
}
