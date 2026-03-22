/**
 * OIDC PKCE authentication via Authentik.
 *
 * Flow:
 * 1. startAuthFlow() — generates PKCE verifier/challenge, builds auth URL, opens browser
 * 2. Authentik redirects to vinylapp://auth/callback?code=...
 * 3. Electron catches the URL (main.ts open-url handler) → handleAuthCallback()
 * 4. handleAuthCallback() exchanges code + verifier for tokens, stores in OS keychain
 * 5. getAccessToken() returns stored token, refreshing proactively if close to expiry
 */

import { shell } from 'electron'
import keytar from 'keytar'
import { Issuer, generators, type BaseClient } from 'openid-client'

const SERVICE = 'vinyl-catalog'
const AUTHENTIK_ISSUER =
  process.env.AUTHENTIK_ISSUER ?? 'https://auth.yourdomain.com/application/o/vinyl-catalog'
const CLIENT_ID = process.env.CLIENT_ID ?? 'vinyl-catalog'
const REDIRECT_URI = 'vinylapp://auth/callback'

// Cached per process lifetime — avoid re-discovering on every call
let _client: BaseClient | null = null

// In-flight PKCE verifier — set in startAuthFlow(), consumed in handleAuthCallback()
let _pendingVerifier: string | null = null

async function getClient(): Promise<BaseClient> {
  if (_client) return _client
  const issuer = await Issuer.discover(AUTHENTIK_ISSUER)
  _client = new issuer.Client({
    client_id: CLIENT_ID,
    redirect_uris: [REDIRECT_URI],
    response_types: ['code']
  })
  return _client
}

/** Returns true if the JWT exp claim is within 60 seconds of now. */
function isExpiredOrExpiringSoon(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    const exp: number = payload.exp ?? 0
    return Date.now() / 1000 > exp - 60
  } catch {
    return false
  }
}

export async function startAuthFlow(): Promise<void> {
  const client = await getClient()
  const verifier = generators.codeVerifier()
  const challenge = generators.codeChallenge(verifier)
  _pendingVerifier = verifier

  const url = client.authorizationUrl({
    scope: 'openid profile email',
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  })

  shell.openExternal(url)
}

export async function handleAuthCallback(url: string): Promise<void> {
  if (!_pendingVerifier) {
    console.warn('[auth] received callback but no pending verifier — ignoring')
    return
  }

  const verifier = _pendingVerifier
  _pendingVerifier = null

  try {
    const client = await getClient()
    const params = client.callbackParams(url)
    const tokens = await client.callback(REDIRECT_URI, params, { code_verifier: verifier })

    if (tokens.access_token) {
      await keytar.setPassword(SERVICE, 'access-token', tokens.access_token)
    }
    if (tokens.refresh_token) {
      await keytar.setPassword(SERVICE, 'refresh-token', tokens.refresh_token)
    }

    console.log('[auth] tokens stored successfully')
  } catch (err) {
    console.error('[auth] token exchange failed:', err)
  }
}

export async function getAccessToken(): Promise<string | null> {
  try {
    const stored = await keytar.getPassword(SERVICE, 'access-token')

    // Fast path: token present and not close to expiry
    if (stored && !isExpiredOrExpiringSoon(stored)) {
      return stored
    }

    // Attempt silent refresh
    const refreshToken = await keytar.getPassword(SERVICE, 'refresh-token')
    if (!refreshToken) return null

    const client = await getClient()
    const tokens = await client.refresh(refreshToken)

    if (tokens.access_token) {
      await keytar.setPassword(SERVICE, 'access-token', tokens.access_token)
      if (tokens.refresh_token) {
        await keytar.setPassword(SERVICE, 'refresh-token', tokens.refresh_token)
      }
      return tokens.access_token
    }

    return null
  } catch {
    return null
  }
}
