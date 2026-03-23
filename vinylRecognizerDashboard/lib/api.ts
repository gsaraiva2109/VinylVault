const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function fetchApi(path: string, options: RequestInit = {}) {
  // Pass an empty token or a dummy token if auth middleware is enabled but frontend has no login
  // The user relies on infrastructure auth forwardAuth.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export const api = {
  vinyls: {
    getAll: () => fetchApi('/api/vinyls'),
    getById: (id: number) => fetchApi(`/api/vinyls/${id}`),
    create: (data: any) => fetchApi('/api/vinyls', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => fetchApi(`/api/vinyls/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => fetchApi(`/api/vinyls/${id}`, { method: 'DELETE' }),
  },
  collection: {
    getStats: () => fetchApi('/api/collection/value'),
  },
  discogs: {
    search: (q: string) => fetchApi(`/api/discogs/search?q=${encodeURIComponent(q)}`),
    getRelease: (id: number | string) => fetchApi(`/api/discogs/release/${id}`),
    refreshPrices: () => fetchApi('/api/discogs/refresh-prices', { method: 'POST' }),
  }
}
