import type { Vinyl } from '../api/client'
import ConditionBadge from './ConditionBadge'

type Props = {
  vinyl: Vinyl
  onClick: () => void
}

export default function VinylCard({ vinyl, onClick }: Props): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-lg border border-border bg-card overflow-hidden hover:shadow-md transition-shadow text-left w-full"
    >
      {/* Cover image */}
      <div className="aspect-square bg-muted overflow-hidden">
        {vinyl.coverImageUrl ? (
          <img
            src={vinyl.coverImageUrl}
            alt={`${vinyl.title} cover`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl">
            🎵
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1">
        <p className="text-sm font-medium leading-tight line-clamp-2">{vinyl.title}</p>
        <p className="text-xs text-muted-foreground truncate">{vinyl.artist}</p>
        <div className="flex items-center justify-between mt-1">
          {vinyl.condition && <ConditionBadge condition={vinyl.condition} />}
          {vinyl.currentValue != null && (
            <span className="text-xs text-muted-foreground ml-auto">
              ${vinyl.currentValue.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
