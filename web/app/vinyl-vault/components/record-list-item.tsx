"use client"

import { cn } from "@/lib/utils"
import type { VinylRecord } from "../types"
import { ConditionBadge } from "./condition-badge"
import { useVinylVault } from "../context"
import { Play, DollarSign, Calendar, Music } from "lucide-react"

interface RecordListItemProps {
  record: VinylRecord
  className?: string
}

export function RecordListItem({ record, className }: RecordListItemProps) {
  const { setSelectedRecord, setIsDetailOpen } = useVinylVault()

  const handleClick = () => {
    setSelectedRecord(record)
    setIsDetailOpen(true)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group flex w-full items-center gap-4 rounded-lg border border-zinc-200 bg-white p-3 text-left transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
        className
      )}
    >
      {/* Cover Image */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full w-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${record.coverUrl})`,
            backgroundColor: getPlaceholderColor(record.id),
          }}
        />
        {record.spotify && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="h-4 w-4 fill-white text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {record.title}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {record.artist}
            </p>
          </div>
          <ConditionBadge condition={record.condition} />
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {record.year}
          </span>
          <span className="flex items-center gap-1">
            <Music className="h-3 w-3" />
            {record.genre}
          </span>
          {record.discogs?.value && (
            <span className="flex items-center gap-0.5 font-medium text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-3 w-3" />
              {record.discogs.value}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

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
