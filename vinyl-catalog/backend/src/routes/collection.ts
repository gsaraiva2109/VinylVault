import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db'

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
    res.status(500).json({ error: String(err) })
  }
})

export default router
