import { useState } from 'react'
import { useVinyls } from '../hooks/useVinyls'
import VinylCard from './VinylCard'
import FilterBar from './FilterBar'
import type { Vinyl } from '../api/client'

export default function VinylGrid(): React.JSX.Element {
  const { data: vinyls, isLoading, isError, isFetching } = useVinyls()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Vinyl | null>(null)

  const filtered = (vinyls ?? []).filter((v) => {
    const q = search.toLowerCase()
    return (
      v.title.toLowerCase().includes(q) ||
      v.artist.toLowerCase().includes(q) ||
      (v.label?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="text-xl font-semibold">Collection</h2>
          {vinyls && (
            <p className="text-sm text-muted-foreground">
              {vinyls.length} record{vinyls.length !== 1 ? 's' : ''}
              {isFetching && ' · syncing…'}
            </p>
          )}
        </div>
      </div>

      <FilterBar search={search} onSearchChange={setSearch} />

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
            <span className="text-4xl">📡</span>
            <p className="text-sm">Could not reach homelab — showing cached data</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
            <span className="text-4xl">🎵</span>
            <p className="text-sm">
              {search ? 'No records match your search' : 'No records yet — scan one to get started'}
            </p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {filtered.map((vinyl) => (
              <VinylCard key={vinyl.id} vinyl={vinyl} onClick={() => setSelected(vinyl)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal placeholder */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">{selected.title}</h3>
            <p className="text-muted-foreground">{selected.artist}</p>
            <button
              onClick={() => setSelected(null)}
              className="mt-4 px-4 py-2 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
