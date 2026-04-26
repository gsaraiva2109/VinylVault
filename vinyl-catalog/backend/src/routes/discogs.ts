import { Router } from 'express'
import { discogsGet, refreshStalePrices } from '../services/discogs'
import { requireWriteAccess } from '../middleware/requireWriteAccess'
import { priceRefreshCooldown } from '../middleware/refreshCooldown'

const router = Router()

/**
 * @swagger
 * /api/discogs/search:
 *   get:
 *     summary: Search Discogs releases
 *     tags: [Discogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', async (req, res) => {
  const q = req.query.q as string
  if (!q) return res.status(400).json({ error: 'q parameter required' })
  if (q.length > 500) return res.status(400).json({ error: 'q parameter too long' })

  try {
    const data = (await discogsGet(
      `/database/search?q=${encodeURIComponent(q)}&type=release&per_page=5`
    )) as any

    const results = (data.results ?? []).slice(0, 5).map((r: any) => ({
      id: String(r.id),
      title: r.title,
      artist: r.title.split(' - ')[0] ?? '',
      year: r.year ? parseInt(r.year) : null,
      label: Array.isArray(r.label) ? r.label[0] : (r.label ?? null),
      genre: Array.isArray(r.genre) ? r.genre[0] : (r.genre ?? null),
      coverImage: r.cover_image ?? null
    }))

    res.json(results)
  } catch (err) {
    console.error('[discogs] GET /search error:', err)
    res.status(502).json({ error: 'Upstream service error' })
  }
})

/**
 * @swagger
 * /api/discogs/release/{id}:
 *   get:
 *     summary: Get Discogs release details
 *     tags: [Discogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Release details with pricing
 */
router.get('/release/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid release ID' })

  try {
    const [data, stats] = await Promise.all([
      discogsGet(`/releases/${id}`),
      discogsGet(`/marketplace/stats/${id}`)
    ]) as any[]

    res.json({
      id: String(data.id),
      title: data.title,
      artist: data.artists_sort ?? data.artists?.[0]?.name ?? '',
      year: data.year ?? null,
      label: data.labels?.[0]?.name ?? null,
      genre: data.genres?.[0] ?? null,
      coverImage: data.images?.[0]?.uri ?? null,
      lowestPrice: stats.lowest_price?.value ?? data.lowest_price ?? null
    })
  } catch (err) {
    console.error('[discogs] GET /release/:id error:', err)
    res.status(502).json({ error: 'Upstream service error' })
  }
})

/**
 * @swagger
 * /api/discogs/refresh-prices:
 *   post:
 *     summary: Manually trigger a stale price refresh
 *     tags: [Discogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stalePeriodHours:
 *                 type: integer
 *                 description: Hours until prices are considered stale (default 24)
 *     responses:
 *       200:
 *         description: Refresh job started
 */
router.post('/refresh-prices', requireWriteAccess, priceRefreshCooldown, async (req, res) => {
  const hours = typeof req.body?.stalePeriodHours === 'number' ? req.body.stalePeriodHours : 24
  const stalePeriodMs = hours * 60 * 60 * 1000

  // Respond immediately — refresh runs in background
  res.json({ message: `Price refresh started (stale threshold: ${hours}h)` })

  refreshStalePrices(stalePeriodMs).catch((err) =>
    console.error('[discogs] refresh-prices error:', err)
  )
})

export default router
