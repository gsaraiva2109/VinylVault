import { Router } from 'express'
import { eq, and } from 'drizzle-orm'
import { db, schema } from '../db'

const router = Router()

const VALID_CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'] as const

// Fields callers are allowed to set on create/update
const MUTABLE_FIELDS = [
  'discogsId', 'title', 'artist', 'year', 'label', 'genre', 'format',
  'condition', 'conditionNotes', 'coverImageUrl', 'discogsUrl', 'spotifyUrl',
  'notes', 'currentValue', 'valueUpdatedAt'
] as const

type MutableField = typeof MUTABLE_FIELDS[number]

function pickMutable(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of MUTABLE_FIELDS) {
    if (field in body) result[field] = body[field]
  }
  return result
}

function validateCondition(condition: unknown): string | null {
  if (condition === null || condition === undefined) return null
  if (typeof condition !== 'string' || !(VALID_CONDITIONS as readonly string[]).includes(condition)) {
    return `condition must be one of: ${VALID_CONDITIONS.join(', ')}`
  }
  return null
}

// GET /api/vinyls
router.get('/', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(schema.vinyls)
      .where(eq(schema.vinyls.isDeleted, false))
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/vinyls/:id
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
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/vinyls
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

    const fields = pickMutable(body)
    const now = Date.now()
    const [created] = await db
      .insert(schema.vinyls)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .values({ ...fields, createdAt: now, updatedAt: now } as any)
      .returning()
    res.status(201).json(created)
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

// PATCH /api/vinyls/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

    const body = req.body as Record<string, unknown>
    const conditionErr = validateCondition(body.condition)
    if (conditionErr) return res.status(400).json({ error: conditionErr })

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
    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

// DELETE /api/vinyls/:id — soft delete
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' })
    await db
      .update(schema.vinyls)
      .set({ isDeleted: true, deletedAt: Date.now(), updatedAt: Date.now() })
      .where(eq(schema.vinyls.id, id))
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
