import type { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const AUTHENTIK_JWKS_URL = process.env.AUTHENTIK_JWKS_URL
const AUTH_ENABLED = process.env.AUTH_ENABLED !== 'false'

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!jwks && AUTHENTIK_JWKS_URL) {
    jwks = createRemoteJWKSet(new URL(AUTHENTIK_JWKS_URL))
  }
  return jwks
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // In Phase 1, auth is disabled by default — set AUTH_ENABLED=true in production
  if (!AUTH_ENABLED) return next()

  const authorization = req.headers.authorization
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' })
  }

  const token = authorization.slice(7)
  const keyset = getJwks()

  if (!keyset) {
    console.warn('[auth] AUTHENTIK_JWKS_URL not set — passing through')
    return next()
  }

  try {
    await jwtVerify(token, keyset, {
      issuer: process.env.AUTHENTIK_ISSUER
    })
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
