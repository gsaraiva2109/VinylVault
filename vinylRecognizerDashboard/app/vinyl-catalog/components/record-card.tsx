"use client"

import { cn } from "@/lib/utils"
import type { VinylRecord } from "../types"
import { ConditionBadge } from "./condition-badge"
import { useVinylCatalog } from "../context"
import { Play, DollarSign } from "lucide-react"

interface RecordCardProps {
  record: VinylRecord
  className?: string
}

export function RecordCard({ record, className }: RecordCardProps) {
  const { setSelectedRecord, setIsDetailOpen } = useVinylCatalog()

  const handleClick = () => {
    setSelectedRecord(record)
    setIsDetailOpen(true)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white text-left transition-all hover:border-zinc-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
        className
      )}
    >
      {/* Cover Image */}
      <div className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
          style={{
            backgroundImage: `url(${record.coverUrl})`,
            backgroundColor: getPlaceholderColor(record.id),
          }}
        />
        {/* Spotify Play Overlay */}
        {record.spotify && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1DB954] text-white shadow-lg">
              <Play className="h-5 w-5 fill-current" />
            </div>
          </div>
        )}
        {/* Condition Badge */}
        <div className="absolute right-2 top-2">
          <ConditionBadge condition={record.condition} />
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {record.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-zinc-500 dark:text-zinc-400">
          {record.artist}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {record.year} · {record.genre}
          </span>
          {record.discogs?.value && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-3 w-3" />
              {record.discogs.value}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// Generate a consistent placeholder color based on record ID
function getPlaceholderColor(id: string): string {
  const colors = [
    "#1a1a2e",
    "#16213e",
    "#0f3460",
    "#533483",
    "#4a0e4e",
    "#2c3e50",
    "#1e3a5f",
    "#2d4059",
  ]
  const index = parseInt(id, 10) % colors.length
  return colors[index]
}
