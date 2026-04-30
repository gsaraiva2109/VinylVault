import https from 'https'
import { eq, and, isNull, isNotNull, lt, or } from 'drizzle-orm'
import { db, schema } from '../db'

/** Maps our condition codes to Discogs price_suggestions response keys */
const CONDITION_KEY_MAP: Record<string, string> = {
  M:    'Mint (M)',
  NM:   'Near Mint (NM or M-)',
  'VG+': 'Very Good Plus (VG+)',
  VG:   'Very Good (VG)',
  'G+': 'Good Plus (G+)',
  G:    'Good (G)',
  F:    'Fair (F)',
  P:    'Poor (P)',
}

const DISCOGS_BASE = 'https://api.discogs.com'
const USER_AGENT = 'VinylVaultApp/0.1 +https://github.com/gsaraiva2109/VinylVault'

// Same exponential-backoff pattern as Gemini/OpenAI retry in desktop/src-tauri/src/commands/llm.rs —
// keep both in sync if changing retry strategy.
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function discogsGetOnce(path: string): Promise<{ status: number; body: unknown }> {
  const token = process.env.DISCOGS_TOKEN
  return new Promise((resolve, reject) => {
    const req = https.get(
      `${DISCOGS_BASE}${path}`,
      {
        headers: {
          ...(token ? { Authorization: `Discogs token=${token}` } : {}),
          'User-Agent': USER_AGENT
        }
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode ?? 200, body: JSON.parse(data) })
          } catch {
            reject(new Error('Discogs JSON parse failed'))
          }
        })
      }
    )
    req.on('error', reject)
  })
}

export async function discogsGet(path: string, retries = 3): Promise<unknown> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const { status, body } = await discogsGetOnce(path)
    if (status === 429) {
      const backoffMs = Math.pow(2, attempt) * 2000
      console.warn(`[discogs] rate limited (429), backing off ${backoffMs}ms`)
      await sleep(backoffMs)
      continue
    }
    if (status >= 400) {
      throw new Error(`Discogs API error: HTTP ${status}`)
    }
    return body
  }
  throw new Error('Discogs API rate limit exceeded after retries')
}

export async function refreshStalePrices(
  stalePeriodMs = 24 * 60 * 60 * 1000
): Promise<{ updated: number; errors: number }> {
  const staleThreshold = Date.now() - stalePeriodMs

  const stale = await db
    .select({ id: schema.vinyls.id, discogsId: schema.vinyls.discogsId, condition: schema.vinyls.condition })
    .from(schema.vinyls)
    .where(
      and(
        eq(schema.vinyls.isDeleted, false),
        isNotNull(schema.vinyls.discogsId),
        or(
          isNull(schema.vinyls.valueUpdatedAt),
          lt(schema.vinyls.valueUpdatedAt, staleThreshold)
        )
      )
    )

  let updated = 0
  let errors = 0

  for (const vinyl of stale) {
    try {
      let conditionPrice: number | null = null

      // Primary: price_suggestions gives per-condition market value
      if (vinyl.condition) {
        const suggestionsKey = CONDITION_KEY_MAP[vinyl.condition]
        if (suggestionsKey) {
          try {
            const suggestions = (await discogsGet(`/marketplace/price_suggestions/${vinyl.discogsId}`)) as any
            conditionPrice = suggestions[suggestionsKey]?.value ?? null
          } catch {
            // price_suggestions may 404 for releases with no marketplace history — fall through
          }
        }
      }

      // Fallback: lowest listed price from marketplace/stats
      if (conditionPrice === null) {
        const stats = (await discogsGet(`/marketplace/stats/${vinyl.discogsId}`)) as any
        conditionPrice = stats.lowest_price?.value ?? null
        await sleep(1100) // extra delay for the second request
      }

      await db
        .update(schema.vinyls)
        .set({ currentValue: conditionPrice, valueUpdatedAt: Date.now(), updatedAt: Date.now() })
        .where(eq(schema.vinyls.id, vinyl.id))

      updated++
    } catch (err) {
      console.error(`[discogs] price refresh failed for vinyl ${vinyl.id} (${vinyl.discogsId}): ${err}`)
      errors++
    }

    // Discogs rate limit: 60 req/min authenticated, 25/min unauthenticated → 1 req/sec is safe
    await sleep(1100)
  }

  console.log(`[discogs] price refresh complete — updated: ${updated}, errors: ${errors}`)
  return { updated, errors }
}
