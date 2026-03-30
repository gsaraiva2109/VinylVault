import { Router } from 'express'
import { eq, and } from 'drizzle-orm'
import { db, schema } from '../db'
import { broadcast } from '../sse/broadcaster'

const router = Router()

const VALID_CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'] as const

// Fields callers are allowed to set on create/update
const MUTABLE_FIELDS = [
  'discogsId', 'title', 'artist', 'year', 'label', 'genre', 'format',
  'condition', 'conditionNotes', 'coverImageUrl', 'discogsUrl', 'spotifyUrl',
  'notes', 'currentValue', 'valueUpdatedAt'
] as const

function pickMutable(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of MUTABLE_FIELDS) {
    if (field in body) result[field] = body[field]
  }
  return result
}

const STRING_FIELD_MAX_LENGTH = 1000
const NOTES_MAX_LENGTH = 5000

function validateStringFields(body: Record<string, unknown>): string | null {
  const shortFields = ['title', 'artist', 'label', 'genre', 'format', 'condition', 'coverImageUrl', 'discogsUrl', 'spotifyUrl', 'conditionNotes'] as const
  for (const field of shortFields) {
    const val = body[field]
    if (typeof val === 'string' && val.length > STRING_FIELD_MAX_LENGTH) {
      return `${field} exceeds maximum length of ${STRING_FIELD_MAX_LENGTH}`
    }
  }
  if (typeof body.notes === 'string' && body.notes.length > NOTES_MAX_LENGTH) {
    return `notes exceeds maximum length of ${NOTES_MAX_LENGTH}`
  }
  return null
}

function validateCondition(condition: unknown): string | null {
  if (condition === null || condition === undefined) return null
  if (typeof condition !== 'string' || !(VALID_CONDITIONS as readonly string[]).includes(condition)) {
    return `condition must be one of: ${VALID_CONDITIONS.join(', ')}`
  }
  return null
}

/**
 * @swagger
 * /api/vinyls:
 *   get:
 *     summary: Retrieve all active vinyls
 *     tags: [Vinyls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of vinyls
 */
router.get('/', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(schema.vinyls)
      .where(eq(schema.vinyls.isDeleted, false))
    res.json(rows)
  } catch (err) {
    console.error('[vinyls] GET / error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @swagger
 * /api/vinyls/trash:
 *   get:
 *     summary: Retrieve all soft-deleted (trashed) vinyls
 *     tags: [Vinyls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of trashed vinyls
 */
// NOTE: must be registered before /:id to prevent 'trash' being parsed as an ID
router.get('/trash', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(schema.vinyls)
      .where(eq(schema.vinyls.isDeleted, true))
    res.json(rows)
  } catch (err) {
    console.error('[vinyls] GET /trash error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @swagger
 * /api/vinyls/{id}:
 *   get:
 *     summary: Get a vinyl by ID
 *     tags: [Vinyls]
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
 *         description: The vinyl object
 *       404:
 *         description: Vinyl not found
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
    const [row] = await db
      .select()
      .from(schema.vinyls)
      .where(and(eq(schema.vinyls.id, id), eq(schema.vinyls.isDeleted, false)))
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (err) {
    console.error('[vinyls] GET /:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @swagger
 * /api/vinyls:
 *   post:
 *     summary: Create a new vinyl
 *     tags: [Vinyls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - artist
 *             properties:
 *               title:
 *                 type: string
 *               artist:
 *                 type: string
 *               year:
 *                 type: integer
 *               condition:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created vinyl
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>
    if (!body.title || typeof body.title !== 'string') {
      return res.status(400).json({ error: 'title is required' })
    }
    if (!body.artist || typeof body.artist !== 'string') {
      return res.status(400).json({ error: 'artist is required' })
    }
    const conditionErr = validateCondition(body.condition)
    if (conditionErr) return res.status(400).json({ error: conditionErr })

    const lengthErr = validateStringFields(body)
    if (lengthErr) return res.status(400).json({ error: lengthErr })

    const fields = pickMutable(body)
    const now = Date.now()
    const [created] = await db
      .insert(schema.vinyls)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .values({
        ...fields,
        createdAt: now,
        updatedAt: now,
        addedBy: req.user?.name,
        addedByAvatar: req.user?.picture
      } as any)
      .returning()
    broadcast('vinyl.created', created)
    res.status(201).json(created)
  } catch (err) {
    console.error('[vinyls] POST / error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @swagger
 * /api/vinyls/{id}:
 *   patch:
 *     summary: Update an existing vinyl
 *     tags: [Vinyls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated vinyl
 *       404:
 *         description: Vinyl not found
 */
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

    const body = req.body as Record<string, unknown>
    const conditionErr = validateCondition(body.condition)
    if (conditionErr) return res.status(400).json({ error: conditionErr })

    const lengthErr = validateStringFields(body)
    if (lengthErr) return res.status(400).json({ error: lengthErr })

    const fields = pickMutable(body)
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' })
    }

    const [updated] = await db
      .update(schema.vinyls)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set({ ...fields, updatedAt: Date.now() } as any)
      .where(and(eq(schema.vinyls.id, id), eq(schema.vinyls.isDeleted, false)))
      .returning()
    if (!updated) return res.status(404).json({ error: 'Not found' })
    broadcast('vinyl.updated', updated)
    res.json(updated)
  } catch (err) {
    console.error('[vinyls] PATCH /:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @swagger
 * /api/vinyls/{id}:
 *   delete:
 *     summary: Soft-delete a vinyl (move to trash)
 *     tags: [Vinyls]
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
 *         description: Soft-deleted vinyl
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
    const now = Date.now()
    const [updated] = await db
      .update(schema.vinyls)
      .set({ isDeleted: true, deletedAt: now, updatedAt: now })
      .where(and(eq(schema.vinyls.id, id), eq(schema.vinyls.isDeleted, false)))
      .returning()
    if (!updated) return res.status(404).json({ error: 'Not found or already deleted' })
    broadcast('vinyl.deleted', updated)
    res.json(updated)
  } catch (err) {
    console.error('[vinyls] DELETE /:id error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @swagger
 * /api/vinyls/{id}/recover:
 *   post:
 *     summary: Recover a soft-deleted vinyl from trash
 *     tags: [Vinyls]
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
 *         description: Recovered vinyl
 *       404:
 *         description: Vinyl not found in trash
 */
router.post('/:id/recover', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
    const [recovered] = await db
      .update(schema.vinyls)
      .set({ isDeleted: false, deletedAt: null, updatedAt: Date.now() })
      .where(and(eq(schema.vinyls.id, id), eq(schema.vinyls.isDeleted, true)))
      .returning()
    if (!recovered) return res.status(404).json({ error: 'Not found in trash' })
    broadcast('vinyl.recovered', recovered)
    res.json(recovered)
  } catch (err) {
    console.error('[vinyls] POST /:id/recover error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @swagger
 * /api/vinyls/{id}/permanent:
 *   delete:
 *     summary: Permanently delete a vinyl (cannot be undone)
 *     tags: [Vinyls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Permanently deleted
 */
router.delete('/:id/permanent', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
    await db
      .delete(schema.vinyls)
      .where(eq(schema.vinyls.id, id))
    broadcast('vinyl.permanentlyDeleted', { id })
    res.status(204).end()
  } catch (err) {
    console.error('[vinyls] DELETE /:id/permanent error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
