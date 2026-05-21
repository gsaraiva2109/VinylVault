import { Router, type Request } from 'express'
import multer from 'multer'
import { parse as parseCsv } from 'csv-parse/sync'
import { eq, inArray } from 'drizzle-orm'
import { db, schema } from '../db'
import { broadcast } from '../sse/broadcaster'
import { requireWriteAccess } from '../middleware/requireWriteAccess'
import { validateCondition, validateStringFields } from './vinyls'

const router = Router()

// 5MB cap — at ~200 bytes per CSV row that allows ~25k rows in one shot,
// well beyond any realistic personal collection.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

// Columns exported AND accepted on import. Order matters for export header.
const CSV_COLUMNS = [
  'discogsId', 'title', 'artist', 'year', 'label', 'genre', 'format',
  'condition', 'conditionNotes', 'notes', 'currentValue', 'valueUpdatedAt',
  'coverImageUrl', 'discogsUrl', 'spotifyUrl', 'createdAt',
] as const

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * @swagger
 * /api/vinyls/export:
 *   get:
 *     summary: Export the active collection as CSV
 *     tags: [Vinyls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: text/csv attachment
 */
router.get('/export', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(schema.vinyls)
      .where(eq(schema.vinyls.isDeleted, false))

    const header = CSV_COLUMNS.join(',')
    const body = rows
      .map((r) => CSV_COLUMNS.map((c) => csvEscape((r as Record<string, unknown>)[c])).join(','))
      .join('\n')

    const filename = `vinylvault-${new Date().toISOString().slice(0, 10)}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(`${header}\n${body}\n`)
  } catch (err) {
    console.error('[import-export] GET /export error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

type ImportRow = Record<string, string>
type ImportError = { row: number; message: string }

function coerceRow(raw: ImportRow): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const c of CSV_COLUMNS) {
    const v = raw[c]
    if (v === undefined || v === '') continue
    if (c === 'year') {
      const n = Number(v)
      out.year = Number.isFinite(n) ? Math.trunc(n) : null
    } else if (c === 'currentValue') {
      const n = Number(v)
      out.currentValue = Number.isFinite(n) ? n : null
    } else if (c === 'valueUpdatedAt' || c === 'createdAt') {
      const n = Number(v)
      if (Number.isFinite(n)) out[c] = n
    } else {
      out[c] = v
    }
  }
  return out
}

/**
 * @swagger
 * /api/vinyls/import:
 *   post:
 *     summary: Bulk-import vinyls from a CSV file
 *     description: |
 *       Accepts a CSV (multipart field `file` OR raw `text/csv` body) with header row
 *       matching the export schema. Rows whose `discogsId` already exists are skipped.
 *     tags: [Vinyls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: '{ created, skipped, errors }'
 */
router.post(
  '/import',
  requireWriteAccess,
  upload.single('file'),
  // Need raw text/csv too; multer leaves req.body alone in that case so we read it ourselves.
  async (req: Request, res) => {
    try {
      let csvText = ''
      if (req.file?.buffer) {
        csvText = req.file.buffer.toString('utf-8')
      } else if (typeof req.body === 'string') {
        csvText = req.body
      } else if (typeof (req.body as { csv?: unknown })?.csv === 'string') {
        csvText = (req.body as { csv: string }).csv
      }

      if (!csvText.trim()) {
        return res.status(400).json({ error: 'No CSV body — send multipart `file`, text/csv body, or JSON { csv: "..." }' })
      }

      let parsed: ImportRow[]
      try {
        parsed = parseCsv(csvText, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }) as ImportRow[]
      } catch (err) {
        return res.status(400).json({ error: `CSV parse failed: ${(err as Error).message}` })
      }

      const errors: ImportError[] = []
      const validRows: Array<Record<string, unknown>> = []

      for (let i = 0; i < parsed.length; i++) {
        const raw = parsed[i]
        const row = coerceRow(raw)
        if (!row.title || typeof row.title !== 'string') {
          errors.push({ row: i + 2, message: 'title is required' })
          continue
        }
        if (!row.artist || typeof row.artist !== 'string') {
          errors.push({ row: i + 2, message: 'artist is required' })
          continue
        }
        const condErr = validateCondition(row.condition)
        if (condErr) { errors.push({ row: i + 2, message: condErr }); continue }
        const lenErr = validateStringFields(row)
        if (lenErr) { errors.push({ row: i + 2, message: lenErr }); continue }
        validRows.push(row)
      }

      // Filter out rows whose discogsId is already present (active or trashed).
      const incomingDiscogsIds = validRows
        .map((r) => r.discogsId)
        .filter((v): v is string => typeof v === 'string' && v.length > 0)

      const existing = incomingDiscogsIds.length
        ? await db
            .select({ discogsId: schema.vinyls.discogsId })
            .from(schema.vinyls)
            .where(inArray(schema.vinyls.discogsId, incomingDiscogsIds))
        : []

      const existingSet = new Set(existing.map((e) => e.discogsId).filter((s): s is string => !!s))

      const toInsert = validRows.filter((r) => {
        if (typeof r.discogsId === 'string' && r.discogsId.length > 0 && existingSet.has(r.discogsId)) {
          return false
        }
        return true
      })

      let created = 0
      if (toInsert.length > 0) {
        const now = Date.now()
        const values = toInsert.map((r) => ({
          ...r,
          createdAt: typeof r.createdAt === 'number' ? r.createdAt : now,
          updatedAt: now,
          addedBy: req.user?.name,
          addedByAvatar: req.user?.picture,
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inserted = await db.insert(schema.vinyls).values(values as any).returning()
        created = inserted.length
        for (const row of inserted) broadcast('vinyl.created', row)
      }

      const skipped = validRows.length - toInsert.length
      res.json({ created, skipped, errors })
    } catch (err) {
      console.error('[import-export] POST /import error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  },
)

export default router
