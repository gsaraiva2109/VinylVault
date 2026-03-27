const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function fetchApi(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers as Record<string, string>,
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export const api = {
  vinyls: {
    getAll: (token?: string) => fetchApi('/api/vinyls', {}, token),
    getTrash: (token?: string) => fetchApi('/api/vinyls/trash', {}, token),
    getById: (id: number, token?: string) => fetchApi(`/api/vinyls/${id}`, {}, token),
    create: (data: Record<string, unknown>, token?: string) => fetchApi('/api/vinyls', { method: 'POST', body: JSON.stringify(data) }, token),
    update: (id: number, data: Record<string, unknown>, token?: string) => fetchApi(`/api/vinyls/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    delete: (id: number, token?: string) => fetchApi(`/api/vinyls/${id}`, { method: 'DELETE' }, token),
    recover: (id: number, token?: string) => fetchApi(`/api/vinyls/${id}/recover`, { method: 'POST' }, token),
    permanentlyDelete: (id: number, token?: string) => fetchApi(`/api/vinyls/${id}/permanent`, { method: 'DELETE' }, token),
  },
  collection: {
    getStats: (token?: string) => fetchApi('/api/collection/value', {}, token),
  },
  discogs: {
    search: (q: string, token?: string) => fetchApi(`/api/discogs/search?q=${encodeURIComponent(q)}`, {}, token),
    getRelease: (id: number | string, token?: string) => fetchApi(`/api/discogs/release/${id}`, {}, token),
    getMaster: async (id: number | string) => {
      // Proxy via Tauri Rust command (avoids CORS, no API route needed)
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke('discogs_get_master', { id: String(id) })
    },
    refreshPrices: (token?: string) => fetchApi('/api/discogs/refresh-prices', { method: 'POST' }, token),
  }
}
