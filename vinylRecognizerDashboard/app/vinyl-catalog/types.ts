// Vinyl Catalog Types

export type Condition = "mint" | "excellent" | "good" | "fair"

export interface VinylRecord {
  id: string
  title: string
  artist: string
  year: number
  genre: string
  condition: Condition
  coverUrl: string
  notes?: string
  dateAdded: string
  addedBy?: string
  addedByAvatar?: string
  discogs?: {
    releaseId: string
    value?: number
    wantlistCount?: number
  }
  spotify?: {
    albumId: string
    previewUrl?: string
  }
}

export interface CollectionStats {
  totalRecords: number
  totalValue: number
  byDecade: Record<string, number>
  byGenre: Record<string, number>
  byCondition: Record<Condition, number>
  recentlyAdded: VinylRecord[]
}

export interface ScanState {
  status: "idle" | "scanning" | "success" | "error"
  scannedRecord?: VinylRecord
  errorMessage?: string
}

export type ViewMode = "grid" | "list"
export type SortOption = "title" | "artist" | "year" | "dateAdded" | "condition"
export type SortDirection = "asc" | "desc"

export interface FilterOptions {
  genre?: string
  decade?: string
  condition?: Condition
  artist?: string
  searchQuery?: string
}

export interface ApiKeys {
  chatgpt?: string
  gemini?: string
}

export interface SortOptions {
  sortBy: SortOption
  direction: SortDirection
}
