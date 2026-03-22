import { useState, useEffect } from 'react'
import type { RecognitionResult } from '../types'
import { api, type DiscogsSearchResult } from '../api/client'
import { useCreateVinyl } from '../hooks/useVinyls'

type Props = {
  result: RecognitionResult
  onClose: () => void
}

export default function MatchConfirmDialog({ result, onClose }: Props): React.JSX.Element {
  const [matches, setMatches] = useState<DiscogsSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(`${result.artist} ${result.album}`.trim())
  const createVinyl = useCreateVinyl()

  useEffect(() => {
    if (!query) return
    setLoading(true)
    api.discogs
      .search(query)
      .then((r) => setMatches(r.slice(0, 3)))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false))
  }, [query])

  async function handleConfirm(match: DiscogsSearchResult) {
    await createVinyl.mutateAsync({
      discogsId: match.id,
      title: match.title,
      artist: match.artist,
      year: match.year,
      label: match.label,
      genre: match.genre,
      format: null,
      condition: null,
      conditionNotes: null,
      coverImageUrl: match.coverImage,
      discogsUrl: `https://www.discogs.com/release/${match.id}`,
      spotifyUrl: null,
      notes: null,
      currentValue: null,
      valueUpdatedAt: null
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Confirm Match</h3>
            <p className="text-xs text-muted-foreground">
              Source: {result.source} · confidence {(result.confidence * 100).toFixed(0)}%
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">
            ×
          </button>
        </div>

        {/* Search override */}
        <div className="px-6 pt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Refine search…"
            className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="px-6 py-4 flex flex-col gap-3 max-h-96 overflow-y-auto">
          {loading && <p className="text-sm text-muted-foreground text-center py-4">Searching Discogs…</p>}

          {!loading && matches.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No matches found — try a different search</p>
          )}

          {matches.map((match) => (
            <button
              key={match.id}
              onClick={() => handleConfirm(match)}
              className="flex gap-4 items-start p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
            >
              {match.coverImage ? (
                <img src={match.coverImage} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded bg-muted shrink-0 flex items-center justify-center text-2xl">🎵</div>
              )}
              <div>
                <p className="text-sm font-medium leading-tight">{match.title}</p>
                <p className="text-xs text-muted-foreground">{match.artist}</p>
                {match.year && <p className="text-xs text-muted-foreground">{match.year} · {match.label}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
