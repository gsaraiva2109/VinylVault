import type { VinylRecord, CollectionStats } from "./types"

export const mockRecords: VinylRecord[] = [
  {
    id: "1",
    title: "Kind of Blue",
    artist: "Miles Davis",
    year: 1959,
    genre: "Jazz",
    condition: "excellent",
    coverUrl: "/vinyl-catalog/covers/kind-of-blue.jpg",
    notes: "Original pressing, slight wear on sleeve",
    dateAdded: "2024-01-15",
    discogs: { releaseId: "1038383", value: 150, wantlistCount: 12500 },
    spotify: { albumId: "1weenld61qoidwYuZ1GESA" },
  },
  {
    id: "2",
    title: "Abbey Road",
    artist: "The Beatles",
    year: 1969,
    genre: "Rock",
    condition: "mint",
    coverUrl: "/vinyl-catalog/covers/abbey-road.jpg",
    notes: "2019 Anniversary Edition remaster",
    dateAdded: "2024-02-20",
    discogs: { releaseId: "14238", value: 35, wantlistCount: 45000 },
    spotify: { albumId: "0ETFjACtuP2ADo6LFhL6HN" },
  },
  {
    id: "3",
    title: "Rumours",
    artist: "Fleetwood Mac",
    year: 1977,
    genre: "Rock",
    condition: "good",
    coverUrl: "/vinyl-catalog/covers/rumours.jpg",
    dateAdded: "2023-11-10",
    discogs: { releaseId: "392011", value: 28, wantlistCount: 32000 },
    spotify: { albumId: "1bt6q2SruMsBtcerNVtpZB" },
  },
  {
    id: "4",
    title: "The Dark Side of the Moon",
    artist: "Pink Floyd",
    year: 1973,
    genre: "Progressive Rock",
    condition: "excellent",
    coverUrl: "/vinyl-catalog/covers/dark-side.jpg",
    notes: "UK first pressing with posters",
    dateAdded: "2023-08-05",
    discogs: { releaseId: "367114", value: 200, wantlistCount: 58000 },
    spotify: { albumId: "4LH4d3cOWNNsVw41Gqt2kv" },
  },
  {
    id: "5",
    title: "Blue Train",
    artist: "John Coltrane",
    year: 1958,
    genre: "Jazz",
    condition: "fair",
    coverUrl: "/vinyl-catalog/covers/blue-train.jpg",
    notes: "Well-loved copy, plays through with some crackle",
    dateAdded: "2024-03-01",
    discogs: { releaseId: "371532", value: 45, wantlistCount: 8900 },
    spotify: { albumId: "6qnuEpM3FfD3zEbAfnN8sJ" },
  },
  {
    id: "6",
    title: "Random Access Memories",
    artist: "Daft Punk",
    year: 2013,
    genre: "Electronic",
    condition: "mint",
    coverUrl: "/vinyl-catalog/covers/ram.jpg",
    notes: "Limited edition gatefold",
    dateAdded: "2024-01-28",
    discogs: { releaseId: "4581909", value: 55, wantlistCount: 28000 },
    spotify: { albumId: "4m2880jivSbbyEGAKfITCa" },
  },
  {
    id: "7",
    title: "A Love Supreme",
    artist: "John Coltrane",
    year: 1965,
    genre: "Jazz",
    condition: "excellent",
    coverUrl: "/vinyl-catalog/covers/love-supreme.jpg",
    dateAdded: "2023-12-15",
    discogs: { releaseId: "383432", value: 120, wantlistCount: 15600 },
    spotify: { albumId: "3xFSLs4FcCJLwxGOfQNAmj" },
  },
  {
    id: "8",
    title: "Purple Rain",
    artist: "Prince",
    year: 1984,
    genre: "Pop",
    condition: "good",
    coverUrl: "/vinyl-catalog/covers/purple-rain.jpg",
    dateAdded: "2023-09-22",
    discogs: { releaseId: "169227", value: 25, wantlistCount: 21000 },
    spotify: { albumId: "7nXJ5k4XgRj5OLg9m8V3zc" },
  },
  {
    id: "9",
    title: "Blonde",
    artist: "Frank Ocean",
    year: 2016,
    genre: "R&B",
    condition: "mint",
    coverUrl: "/vinyl-catalog/covers/blonde.jpg",
    notes: "Black Friday edition, sealed",
    dateAdded: "2024-02-14",
    discogs: { releaseId: "9251190", value: 380, wantlistCount: 42000 },
    spotify: { albumId: "3mH6qwIy9crq0I9YQbOuDf" },
  },
  {
    id: "10",
    title: "Thriller",
    artist: "Michael Jackson",
    year: 1982,
    genre: "Pop",
    condition: "excellent",
    coverUrl: "/vinyl-catalog/covers/thriller.jpg",
    dateAdded: "2023-07-18",
    discogs: { releaseId: "176126", value: 22, wantlistCount: 35000 },
    spotify: { albumId: "2ANVost0y2y52eMu9xGF7A" },
  },
  {
    id: "11",
    title: "In Rainbows",
    artist: "Radiohead",
    year: 2007,
    genre: "Alternative",
    condition: "mint",
    coverUrl: "/vinyl-catalog/covers/in-rainbows.jpg",
    notes: "Discbox edition with bonus disc",
    dateAdded: "2024-01-05",
    discogs: { releaseId: "1161626", value: 85, wantlistCount: 19000 },
    spotify: { albumId: "5vkqYmiPBYLaalcmjujWxK" },
  },
  {
    id: "12",
    title: "What's Going On",
    artist: "Marvin Gaye",
    year: 1971,
    genre: "Soul",
    condition: "good",
    coverUrl: "/vinyl-catalog/covers/whats-going-on.jpg",
    dateAdded: "2023-10-30",
    discogs: { releaseId: "366854", value: 40, wantlistCount: 18500 },
    spotify: { albumId: "2v6ANhWhZBUKkg6pJJAV6o" },
  },
]

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
