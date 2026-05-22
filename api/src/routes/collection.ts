import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db'
import { logger } from '../logger'

const log = logger.child({ module: 'collection' })

// Any future write endpoints in this router must use the requireWriteAccess middleware
// (see api/src/middleware/requireWriteAccess.ts), as enforced in vinyls.ts and discogs.ts.
const router = Router()

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
    const vinyls = await db
      .select()
      .from(schema.vinyls)
      .where(eq(schema.vinyls.isDeleted, false))

    const total = vinyls.reduce((sum, v) => sum + (v.currentValue ?? 0), 0)

    const byGenre: Record<string, number> = {}
    const byFormat: Record<string, number> = {}

    for (const v of vinyls) {
      if (v.genre) byGenre[v.genre] = (byGenre[v.genre] ?? 0) + 1
      if (v.format) byFormat[v.format] = (byFormat[v.format] ?? 0) + 1
    }

    res.json({ total, count: vinyls.length, byGenre, byFormat })
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
    const vinyls = await db
      .select()
      .from(schema.vinyls)
      .where(eq(schema.vinyls.isDeleted, false))

    // Build cumulative value history from record creation dates.
    // Each month shows the total value of all records added up to that point.
    const now = new Date()
    const months: { key: string; label: Date }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d,
      })
    }

    const history = months.map((m) => {
      const monthEnd = new Date(m.label.getFullYear(), m.label.getMonth() + 1, 0, 23, 59, 59, 999)
      const recordsUpToMonth = vinyls.filter(
        (v) => v.createdAt <= monthEnd.getTime()
      )
      const totalValue = recordsUpToMonth.reduce((sum, v) => sum + (v.currentValue ?? 0), 0)
      return {
        month: m.key,
        totalValue: Math.round(totalValue * 100) / 100,
        count: recordsUpToMonth.length,
      }
    })

    res.json(history)
  } catch (err) {
    log.error({ err }, 'GET /value/history error')
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
