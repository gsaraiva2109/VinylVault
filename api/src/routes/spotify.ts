import { Router } from 'express'
import { logger } from '../logger'

const log = logger.child({ module: 'spotify' })

const router = Router()

let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getSpotifyToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in server environment')
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!resp.ok) {
    throw new Error(`Spotify token request failed: HTTP ${resp.status}`)
  }

  const data = (await resp.json()) as { access_token: string; expires_in: number }
  cachedToken = data.access_token
  tokenExpiresAt = now + data.expires_in * 1000
  return cachedToken
}

/**
 * @swagger
 * /api/spotify/search:
 *   post:
 *     summary: Search Spotify for an album
 *     tags: [Spotify]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - q
 *             properties:
 *               q:
 *                 type: string
 *     responses:
 *       200:
 *         description: Spotify search result
 */
router.post('/search', async (req, res) => {
  const q = (req.body as Record<string, unknown>).q as string | undefined
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'q (search query string) is required' })
  }
  if (q.length > 500) {
    return res.status(400).json({ error: 'q parameter too long' })
  }

  try {
    const token = await getSpotifyToken()

    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=1`
    const resp = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!resp.ok) {
      log.error({ status: resp.status }, 'Spotify search failed')
      return res.status(502).json({ error: 'Upstream Spotify search failed' })
    }

    const data = (await resp.json()) as {
      albums?: { items?: { id: string; external_urls?: { spotify?: string }; images?: { url: string }[] }[] }
    }
    const album = data.albums?.items?.[0]

    if (!album) {
      return res.json({ albumId: null, albumUrl: null, previewUrl: null })
    }

    res.json({
      albumId: album.id,
      albumUrl: album.external_urls?.spotify ?? null,
      previewUrl: album.images?.[0]?.url ?? null,
    })
  } catch (err) {
    log.error({ err }, 'Spotify search error')
    res.status(502).json({ error: 'Upstream service error' })
  }
})

export default router
