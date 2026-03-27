import type { VinylRecord, Condition } from "@/app/vinyl-vault/types"

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
  createdAt: string | number
  discogsId: string | null
  currentValue: number | null
  wantlistCount: number | null
  spotifyUrl: string | null
  addedBy: string | null
  addedByAvatar: string | null
  discogsUrl: string | null
  deletedAt?: number | null
  isDeleted?: boolean
}

const VALID_CONDITIONS = new Set(["M", "NM", "VG+", "VG", "G+", "G", "F", "P"])

function extractSpotifyAlbumId(url: string | null): string | undefined {
  if (!url) return undefined
  const match = url.match(/album\/([A-Za-z0-9]+)/)
  return match?.[1]
}

export function mapBackendVinyl(raw: BackendVinyl): VinylRecord {
  const rawCond = raw.condition?.toUpperCase() || ""
  const condition: Condition = VALID_CONDITIONS.has(rawCond) ? (rawCond as Condition) : "VG"

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
      ? (typeof raw.createdAt === "string"
          ? raw.createdAt.split("T")[0]
          : new Date(raw.createdAt).toISOString().split("T")[0])
      : new Date().toISOString().split("T")[0],
    deletedAt: raw.deletedAt ?? null,
    addedBy: raw.addedBy ?? undefined,
    addedByAvatar: raw.addedByAvatar ?? undefined,
    discogsUrl: raw.discogsUrl ?? undefined,
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
