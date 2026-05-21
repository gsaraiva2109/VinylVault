"use client"

import { Sparkles } from "lucide-react"

interface Props {
  genreTags?: string[]
  mood?: string
  era?: string
  confidence?: number
  source?: string
  compact?: boolean
}

function confidenceColor(c?: number): string {
  if (c == null) return "var(--app-text-3)"
  if (c >= 0.85) return "#22c55e"
  if (c >= 0.7) return "#f59e0b"
  return "#f43f5e"
}

export function TagChips({ genreTags, mood, era, confidence, source, compact = false }: Props) {
  const hasAny = (genreTags && genreTags.length > 0) || mood || era
  if (!hasAny) return null

  const chipBase = compact
    ? "rounded-full px-1.5 py-0.5 text-[10px] font-medium"
    : "rounded-full px-2 py-0.5 text-xs font-medium"

  return (
    <div className={compact ? "flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-1.5"}>
      {genreTags?.map((tag) => (
        <span
          key={`g-${tag}`}
          className={chipBase}
          style={{
            background: "color-mix(in srgb, var(--app-green) 12%, transparent)",
            color: "var(--app-green)",
            border: "1px solid color-mix(in srgb, var(--app-green) 25%, transparent)",
          }}
        >
          {tag}
        </span>
      ))}
      {mood && (
        <span
          className={chipBase}
          style={{
            background: "rgba(99, 102, 241, 0.12)",
            color: "rgb(129, 140, 248)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
          }}
        >
          {mood}
        </span>
      )}
      {era && (
        <span
          className={chipBase}
          style={{
            background: "rgba(244, 114, 182, 0.12)",
            color: "rgb(244, 114, 182)",
            border: "1px solid rgba(244, 114, 182, 0.25)",
          }}
        >
          {era}
        </span>
      )}
      {confidence != null && !compact && (
        <span
          className="ml-1 inline-flex items-center gap-1 text-[10px]"
          style={{ color: "var(--app-text-3)" }}
          title={source ? `Source: ${source}` : undefined}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: confidenceColor(confidence) }}
          />
          {Math.round(confidence * 100)}%
          <Sparkles className="h-3 w-3" />
        </span>
      )}
    </div>
  )
}
