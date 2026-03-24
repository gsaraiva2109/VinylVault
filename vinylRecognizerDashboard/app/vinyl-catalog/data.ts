import type { VinylRecord, CollectionStats } from "./types"

export function getCollectionStats(records: VinylRecord[]): CollectionStats {
  const byDecade: Record<string, number> = {}
  const byGenre: Record<string, number> = {}
  const byCondition: Record<string, number> = { mint: 0, excellent: 0, good: 0, fair: 0 }
  let totalValue = 0

  records.forEach((record) => {
    // Decade
    const decade = `${Math.floor(record.year / 10) * 10}s`
    byDecade[decade] = (byDecade[decade] || 0) + 1

    // Genre
    byGenre[record.genre] = (byGenre[record.genre] || 0) + 1

    // Condition
    byCondition[record.condition] = (byCondition[record.condition] || 0) + 1

    // Value
    if (record.discogs?.value) {
      totalValue += record.discogs.value
    }
  })

  // Sort by date added for recently added
  const recentlyAdded = [...records]
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .slice(0, 5)

  return {
    totalRecords: records.length,
    totalValue,
    byDecade,
    byGenre,
    byCondition: byCondition as Record<"mint" | "excellent" | "good" | "fair", number>,
    recentlyAdded,
  }
}

export function filterRecords(
  records: VinylRecord[],
  filters: {
    genre?: string
    decade?: string
    condition?: string
    artist?: string
    searchQuery?: string
  }
): VinylRecord[] {
  return records.filter((record) => {
    if (filters.genre && record.genre !== filters.genre) return false
    if (filters.decade) {
      const recordDecade = `${Math.floor(record.year / 10) * 10}s`
      if (recordDecade !== filters.decade) return false
    }
    if (filters.condition && record.condition !== filters.condition) return false
    if (filters.artist && record.artist !== filters.artist) return false
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      const matchesTitle = record.title.toLowerCase().includes(query)
      const matchesArtist = record.artist.toLowerCase().includes(query)
      if (!matchesTitle && !matchesArtist) return false
    }
    return true
  })
}

export function sortRecords(
  records: VinylRecord[],
  sortBy: "title" | "artist" | "year" | "dateAdded" | "condition",
  direction: "asc" | "desc"
): VinylRecord[] {
  const sorted = [...records].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case "title":
        comparison = a.title.localeCompare(b.title)
        break
      case "artist":
        comparison = a.artist.localeCompare(b.artist)
        break
      case "year":
        comparison = a.year - b.year
        break
      case "dateAdded":
        comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()
        break
      case "condition":
        const conditionOrder = { mint: 4, excellent: 3, good: 2, fair: 1 }
        comparison = conditionOrder[a.condition] - conditionOrder[b.condition]
        break
    }
    return direction === "asc" ? comparison : -comparison
  })
  return sorted
}
