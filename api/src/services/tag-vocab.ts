// Controlled vocabulary for AI-generated tags. The desktop Tauri `auto_tag`
// command pulls this list at runtime via `GET /api/tags/vocabulary` so its
// prompt stays in sync with what the API will accept on PATCH.

export const GENRE_TAGS = [
  'rock', 'jazz', 'electronic', 'hip-hop', 'classical', 'folk',
  'soul', 'metal', 'pop', 'punk', 'ambient', 'experimental',
  'world', 'blues', 'country', 'reggae',
] as const

export const MOODS = [
  'energetic', 'melancholic', 'dreamy', 'aggressive',
  'peaceful', 'dark', 'uplifting', 'nostalgic',
] as const

// Eras intentionally open-ended — the validator accepts a decade-shaped string
// (e.g. "1970s") rather than a fixed enum so we don't have to redeploy when
// the 2030s roll around. Matches /^\d{4}s$/.
export const ERA_PATTERN = /^\d{4}s$/

export const MAX_GENRE_TAGS = 8
export const MAX_TAG_LEN = 32
export const MAX_TAG_SOURCE_LEN = 32

export type GenreTag = typeof GENRE_TAGS[number]
export type Mood = typeof MOODS[number]

export function isGenreTag(v: unknown): v is GenreTag {
  return typeof v === 'string' && (GENRE_TAGS as readonly string[]).includes(v)
}

export function isMood(v: unknown): v is Mood {
  return typeof v === 'string' && (MOODS as readonly string[]).includes(v)
}

export function isEra(v: unknown): boolean {
  return typeof v === 'string' && ERA_PATTERN.test(v)
}

/** Returns null if all tag fields validate, otherwise an error message. */
export function validateTagFields(body: Record<string, unknown>): string | null {
  if ('genreTags' in body && body.genreTags !== null && body.genreTags !== undefined) {
    if (!Array.isArray(body.genreTags)) return 'genreTags must be an array'
    if (body.genreTags.length > MAX_GENRE_TAGS) return `genreTags exceeds ${MAX_GENRE_TAGS} items`
    for (const t of body.genreTags) {
      if (typeof t !== 'string' || t.length > MAX_TAG_LEN) return 'genreTags items must be short strings'
      if (!isGenreTag(t)) return `genreTags contains unknown tag: ${t}`
    }
  }
  if ('mood' in body && body.mood !== null && body.mood !== undefined) {
    if (!isMood(body.mood)) return `mood must be one of: ${MOODS.join(', ')}`
  }
  if ('era' in body && body.era !== null && body.era !== undefined) {
    if (!isEra(body.era)) return 'era must match pattern "YYYYs" (e.g. "1970s")'
  }
  if ('tagsConfidence' in body && body.tagsConfidence !== null && body.tagsConfidence !== undefined) {
    const n = Number(body.tagsConfidence)
    if (!Number.isFinite(n) || n < 0 || n > 1) return 'tagsConfidence must be a number between 0 and 1'
  }
  if ('tagsSource' in body && body.tagsSource !== null && body.tagsSource !== undefined) {
    if (typeof body.tagsSource !== 'string' || body.tagsSource.length > MAX_TAG_SOURCE_LEN) {
      return `tagsSource must be a string under ${MAX_TAG_SOURCE_LEN} chars`
    }
  }
  return null
}
