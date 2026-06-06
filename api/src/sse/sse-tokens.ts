// Short-lived token store for SSE connections.
// EventSource cannot send custom headers, so we issue a short-lived
// token via /api/sse-token (auth'd with Bearer) and pass it in the
// SSE URL query string instead of the user's main JWT.

const tokens = new Map<string, { sub: string; expires: number }>()
const TTL_MS = 60_000

// Prune expired tokens every 30s
setInterval(() => {
  const now = Date.now()
  for (const [token, entry] of tokens) {
    if (entry.expires < now) tokens.delete(token)
  }
}, 30_000).unref()

export function createSseToken(sub: string): string {
  const token = require('crypto').randomBytes(32).toString('hex')
  tokens.set(token, { sub, expires: Date.now() + TTL_MS })
  return token
}

export function consumeSseToken(token: string): string | null {
  const entry = tokens.get(token)
  if (!entry || entry.expires < Date.now()) return null
  tokens.delete(token) // single-use
  return entry.sub
}
