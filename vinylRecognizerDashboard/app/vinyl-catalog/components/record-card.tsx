"use client"

import type { VinylRecord } from "../types"
import { ConditionBadge } from "./condition-badge"
import { useVinylCatalog } from "../context"
import { Play } from "lucide-react"

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
      className={`vinyl-card group relative flex flex-col overflow-hidden rounded-xl text-left cursor-pointer ${className ?? ""}`}
    >
      {/* Cover Image */}
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: "1 / 1", backgroundColor: getPlaceholderColor(record.id) }}
      >
        {record.coverUrl && (
          <div
            className="h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${record.coverUrl})` }}
          />
        )}

        {/* Spotify play overlay */}
        {record.spotify && (
          <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full shadow-lg"
              style={{ background: "#1DB954" }}
            >
              <Play className="h-4 w-4 fill-white text-white" style={{ marginLeft: "1px" }} />
            </div>
          </div>
        )}

        {/* Condition badge */}
        <div className="absolute left-2 top-2">
          <ConditionBadge condition={record.condition} />
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3">
        <h3
          className="line-clamp-1 text-sm font-semibold leading-tight"
          style={{ color: "var(--app-text-1)" }}
        >
          {record.title}
        </h3>
        <p className="line-clamp-1 text-xs" style={{ color: "var(--app-text-2)" }}>
          {record.artist}
        </p>

        {/* Meta row */}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                background: "var(--app-surface-3)",
                color: "var(--app-text-3)",
              }}
            >
              {record.year}
            </span>
            {record.genre && (
              <span
                className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: "var(--app-surface-3)",
                  color: "var(--app-text-3)",
                }}
              >
                {record.genre}
              </span>
            )}
          </div>

          {record.discogs?.value != null && (
            <span
              className="shrink-0 font-mono text-xs font-semibold"
              style={{ color: "var(--app-green)" }}
            >
              ${record.discogs.value}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function getPlaceholderColor(id: string): string {
  const colors = ["#1a1a2e", "#16213e", "#0f3460", "#533483", "#4a0e4e", "#2c3e50", "#1e3a5f", "#2d4059"]
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}
