const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export type Vinyl = {
  id: number
  discogsId: string | null
  title: string
  artist: string
  year: number | null
  label: string | null
  genre: string | null
  format: string | null
  condition: string | null
  conditionNotes: string | null
  coverImageUrl: string | null
  discogsUrl: string | null
  spotifyUrl: string | null
  notes: string | null
  currentValue: number | null
  valueUpdatedAt: number | null
  createdAt: number
  updatedAt: number
}

export type CollectionValue = {
  total: number
  count: number
  byGenre: Record<string, number>
  byFormat: Record<string, number>
}

export type DiscogsSearchResult = {
  id: string
  title: string
  artist: string
  year: number | null
  label: string | null
  genre: string | null
  coverImage: string | null
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await window.vinylApp.getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...headers, ...init?.headers } })
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

export const api = {
  vinyls: {
    list: () => request<Vinyl[]>('/api/vinyls'),
    get: (id: number) => request<Vinyl>(`/api/vinyls/${id}`),
    create: (data: Omit<Vinyl, 'id' | 'createdAt' | 'updatedAt'>) =>
      request<Vinyl>('/api/vinyls', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Vinyl>) =>
      request<Vinyl>(`/api/vinyls/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/api/vinyls/${id}`, { method: 'DELETE' })
  },

  collection: {
    value: () => request<CollectionValue>('/api/collection/value')
  },

  discogs: {
    search: (q: string) =>
      request<DiscogsSearchResult[]>(`/api/discogs/search?q=${encodeURIComponent(q)}`),
    release: (id: string) =>
      request<DiscogsSearchResult>(`/api/discogs/release/${id}`)
  }
}
