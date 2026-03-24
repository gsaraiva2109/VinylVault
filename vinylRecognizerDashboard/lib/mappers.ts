import type { VinylRecord, Condition } from "@/app/vinyl-catalog/types"

// Shape returned by the backend Drizzle API
export interface BackendVinyl {
  id: number
  title: string
  artist: string
  year: number
  genre: string
  condition: string
  coverImageUrl: string | null
  notes: string | null
  createdAt: string
  discogsId: string | null
  currentValue: number | null
  wantlistCount: number | null
  spotifyUrl: string | null
  addedBy: string | null
  addedByAvatar: string | null
}

const CONDITION_MAP: Record<string, Condition> = {
  mint: "mint",
  excellent: "excellent",
  good: "good",
  fair: "fair",
  nm: "mint",
  vg: "good",
  "vg+": "excellent",
  g: "fair",
}

function extractSpotifyAlbumId(url: string | null): string | undefined {
  if (!url) return undefined
  const match = url.match(/album\/([A-Za-z0-9]+)/)
  return match?.[1]
}

export function mapBackendVinyl(raw: BackendVinyl): VinylRecord {
  const condition: Condition = CONDITION_MAP[raw.condition?.toLowerCase()] ?? "good"

  return {
    id: String(raw.id),
    title: raw.title,
    artist: raw.artist,
    year: raw.year,
    genre: raw.genre,
    condition,
    coverUrl: raw.coverImageUrl ?? "",
    notes: raw.notes ?? undefined,
    dateAdded: raw.createdAt
      ? raw.createdAt.split("T")[0]
      : new Date().toISOString().split("T")[0],
    addedBy: raw.addedBy ?? undefined,
    addedByAvatar: raw.addedByAvatar ?? undefined,
    discogs: raw.discogsId
      ? {
          releaseId: String(raw.discogsId),
          value: raw.currentValue ?? undefined,
          wantlistCount: raw.wantlistCount ?? undefined,
        }
      : undefined,
    spotify: raw.spotifyUrl
      ? {
          albumId: extractSpotifyAlbumId(raw.spotifyUrl) ?? raw.spotifyUrl,
        }
      : undefined,
  }
}
