import type { Request, Response, NextFunction } from 'express'

const DEFAULT_COOLDOWN_MS = 5 * 60_000

let lastRefreshAt = 0
let refreshing = false

export function priceRefreshCooldown(_req: Request, res: Response, next: NextFunction) {
  const cooldownMs = Number(process.env.PRICE_REFRESH_COOLDOWN_MS) || DEFAULT_COOLDOWN_MS
  const now = Date.now()

  if (refreshing) {
    const elapsed = now - lastRefreshAt
    const retryAfterSec = Math.ceil((cooldownMs - elapsed) / 1000)
    res.setHeader('Retry-After', String(retryAfterSec))
    return res.status(429).json({
      error: 'Price refresh is on cooldown',
      retryAfterSeconds: retryAfterSec,
      code: 'REFRESH_COOLDOWN',
    })
  }

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

  refreshing = true
  lastRefreshAt = now

  // Release the lock after the cooldown period elapses
  setTimeout(() => { refreshing = false }, cooldownMs)

  next()
}

export function _resetRefreshCooldownForTests() {
  lastRefreshAt = 0
  refreshing = false
}
