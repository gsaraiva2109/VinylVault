import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export default function CollectionStats(): React.JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['collection-value'],
    queryFn: api.collection.value
  })

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">Collection Stats</h2>

      {isLoading && <div className="text-muted-foreground text-sm">Loading…</div>}

      {data && (
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Records</p>
            <p className="text-3xl font-bold mt-1">{data.count}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Value</p>
            <p className="text-3xl font-bold mt-1">${data.total.toFixed(2)}</p>
          </div>

          {Object.entries(data.byGenre).length > 0 && (
            <div className="col-span-2 rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">By Genre</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.byGenre).map(([genre, count]) => (
                  <span key={genre} className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                    {genre} ({count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
