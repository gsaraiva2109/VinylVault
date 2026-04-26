import type { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const AUTHENTIK_JWKS_URL = process.env.AUTHENTIK_JWKS_URL
const AUTH_ENABLED = process.env.AUTH_ENABLED !== 'false'
const DEV_AUTH_TOKEN = process.env.DEV_AUTH_TOKEN
const DEV_AUTH_AS_DEMO = process.env.DEV_AUTH_AS_DEMO === 'true'
const DEMO_GROUP_NAME = process.env.DEMO_GROUP_NAME || 'demo-users'

// Extend Express Request type to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        name: string
        picture?: string
        sub: string
        groups: string[]
        isDemo: boolean
      }
    }
  }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
let warnedNoGroupsClaim = false

function getJwks() {
  if (!jwks && AUTHENTIK_JWKS_URL) {
    jwks = createRemoteJWKSet(new URL(AUTHENTIK_JWKS_URL))
  }
  return jwks
}

function normalizeGroups(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') return raw.split(/[\s,]+/).filter(Boolean)
  return []
}

function devUser(): NonNullable<Request['user']> {
  const groups = DEV_AUTH_AS_DEMO ? [DEMO_GROUP_NAME] : []
  return {
    name: 'Developer',
    sub: 'dev',
    groups,
    isDemo: DEV_AUTH_AS_DEMO,
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. If auth is explicitly disabled, allow request
  if (!AUTH_ENABLED) return next()

  const authorization = req.headers.authorization

  // 2. Dev Mode Bypass: If a DEV_AUTH_TOKEN is set in .env, check if the Bearer token matches it
  if (DEV_AUTH_TOKEN && authorization === `Bearer ${DEV_AUTH_TOKEN}`) {
    req.user = devUser()
    return next()
  }

  // EventSource (SSE) cannot send custom headers — accept token as ?token= query param as fallback
  const rawToken = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : typeof req.query.token === 'string' ? req.query.token : null

  if (!rawToken) {
    return res.status(401).json({ error: 'Missing Bearer token' })
  }

  // Dev Mode Bypass via query param token
  if (DEV_AUTH_TOKEN && rawToken === DEV_AUTH_TOKEN) {
    req.user = devUser()
    return next()
  }

  const token = rawToken
  const keyset = getJwks()

  if (!keyset) {
    console.error('[auth] AUTHENTIK_JWKS_URL not set but AUTH_ENABLED=true — rejecting request')
    return res.status(500).json({ error: 'Internal server error' })
  }

  try {
    const { payload } = await jwtVerify(token, keyset, {
      issuer: process.env.AUTHENTIK_ISSUER
    })

    const groups = normalizeGroups((payload as Record<string, unknown>).groups)
    if (groups.length === 0 && !warnedNoGroupsClaim) {
      console.warn(
        '[auth] JWT contains no `groups` claim — verify that the Authentik scope mapping is attached to the provider. Demo-user enforcement requires it.'
      )
      warnedNoGroupsClaim = true
    }

    // Capture user info from Authentik payload
    req.user = {
      name: (payload.name as string) || (payload.preferred_username as string) || 'Unknown User',
      picture: payload.picture as string | undefined,
      sub: payload.sub as string,
      groups,
      isDemo: groups.includes(DEMO_GROUP_NAME),
    }

    next()
  } catch (err) {
    console.error('[auth] verification failed:', err)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
