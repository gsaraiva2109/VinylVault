import { Router } from 'express'
import { eq, and, isNotNull, sql } from 'drizzle-orm'
import { db, schema } from '../db'
import { logger } from '../logger'

const log = logger.child({ module: 'collection' })

const router = Router()

// Simple in-memory cache with TTL
interface CacheEntry<T> { data: T; ts: number }
const cache = new Map<string, CacheEntry<unknown>>()
function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (entry && Date.now() - entry.ts < ttlMs) return Promise.resolve(entry.data)
  return fn().then((data) => {
    cache.set(key, { data, ts: Date.now() })
    return data
  })
}

/**
 * @swagger
 * /api/collection/value:
 *   get:
 *     summary: Get total collection value and stats
 *     tags: [Collection]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Collection statistics including total value
 */
router.get('/value', async (_req, res) => {
  try {
    const data = await cached('collection-value', 30_000, async () => {
      const [totalResult] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${schema.vinyls.currentValue}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.vinyls)
        .where(eq(schema.vinyls.isDeleted, false))

      const genreCounts = await db
        .select({
          genre: schema.vinyls.genre,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.vinyls)
        .where(and(eq(schema.vinyls.isDeleted, false), isNotNull(schema.vinyls.genre)))
        .groupBy(schema.vinyls.genre)

      const formatCounts = await db
        .select({
          format: schema.vinyls.format,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.vinyls)
        .where(and(eq(schema.vinyls.isDeleted, false), isNotNull(schema.vinyls.format)))
        .groupBy(schema.vinyls.format)

      const byGenre: Record<string, number> = {}
      for (const g of genreCounts) {
        if (g.genre) byGenre[g.genre] = Number(g.count)
      }
      const byFormat: Record<string, number> = {}
      for (const f of formatCounts) {
        if (f.format) byFormat[f.format] = Number(f.count)
      }

      return {
        total: Number(totalResult.total),
        count: Number(totalResult.count),
        byGenre,
        byFormat,
      }
    })

    res.setHeader('Cache-Control', 'public, max-age=30')
    res.json(data)
  } catch (err) {
    log.error({ err }, 'GET /value error')
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @swagger
 * /api/collection/value/history:
 *   get:
 *     summary: Get monthly collection value history (last 12 months)
 *     tags: [Collection]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of { month, totalValue, count } points
 */
router.get('/value/history', async (_req, res) => {
  try {
    const data = await cached('collection-history', 60_000, async () => {
      const rows = await db
        .select({
          month: sql<string>`to_char(date_trunc('month', to_timestamp(${schema.vinyls.createdAt} / 1000.0)), 'YYYY-MM')`,
          totalValue: sql<number>`COALESCE(SUM(${schema.vinyls.currentValue}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(schema.vinyls)
        .where(eq(schema.vinyls.isDeleted, false))
        .groupBy(sql`date_trunc('month', to_timestamp(${schema.vinyls.createdAt} / 1000.0))`)
        .orderBy(sql`date_trunc('month', to_timestamp(${schema.vinyls.createdAt} / 1000.0))`)

      let cumulativeValue = 0
      let cumulativeCount = 0
      const history = rows.map((r) => {
        cumulativeValue += Number(r.totalValue)
        cumulativeCount += Number(r.count)
        return {
          month: r.month,
          totalValue: Math.round(cumulativeValue * 100) / 100,
          count: cumulativeCount,
        }
      })

      const now = new Date()
      const expected: { key: string; label: Date }[] = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        expected.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          label: d,
        })
      }

      const historyMap = new Map(history.map((h) => [h.month, h]))
      const filled = expected.map((m) => {
        const existing = historyMap.get(m.key)
        if (existing) return existing
        let lastBefore: typeof history[0] | undefined
        for (const h of history) {
          if (h.month <= m.key) lastBefore = h
        }
        return {
          month: m.key,
          totalValue: lastBefore ? lastBefore.totalValue : 0,
          count: lastBefore ? lastBefore.count : 0,
        }
      })

      return filled
    })

    res.setHeader('Cache-Control', 'public, max-age=60')
    res.json(data)
  } catch (err) {
    log.error({ err }, 'GET /value/history error')
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
