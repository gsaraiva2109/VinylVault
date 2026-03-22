import { Router } from 'express'
import { discogsGet, refreshStalePrices } from '../services/discogs'

const router = Router()

// GET /api/discogs/search?q=
router.get('/search', async (req, res) => {
  const q = req.query.q as string
  if (!q) return res.status(400).json({ error: 'q parameter required' })

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
    res.status(502).json({ error: String(err) })
  }
})

// GET /api/discogs/release/:id
router.get('/release/:id', async (req, res) => {
  try {
    const [data, stats] = await Promise.all([
      discogsGet(`/releases/${req.params.id}`),
      discogsGet(`/marketplace/stats/${req.params.id}`)
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
    res.status(502).json({ error: String(err) })
  }
})

// POST /api/discogs/refresh-prices — manual trigger (also runs via nightly cron)
// Body: { stalePeriodHours?: number }  default: 24
router.post('/refresh-prices', async (req, res) => {
  const hours = typeof req.body?.stalePeriodHours === 'number' ? req.body.stalePeriodHours : 24
  const stalePeriodMs = hours * 60 * 60 * 1000

  // Respond immediately — refresh runs in background
  res.json({ message: `Price refresh started (stale threshold: ${hours}h)` })

  refreshStalePrices(stalePeriodMs).catch((err) =>
    console.error('[discogs] refresh-prices error:', err)
  )
})

export default router
