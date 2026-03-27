"use client"

import { useMemo, useRef } from "react"
import { cn } from "@/lib/utils"
import { useVinylCatalog } from "../context"
import { Disc3, Search, X } from "lucide-react"
import { useTauriAuth } from "@/lib/tauri-auth"

interface StatsStripProps {
  onSearchOpen: () => void
}

export function StatsStrip({ onSearchOpen }: StatsStripProps) {
  const { activeRecords, activeScreen, filters, setFilters, setActiveScreen } = useVinylCatalog()
  const { user } = useTauriAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  const stats = useMemo(() => {
    const totalRecords = activeRecords.length
    const totalValue = activeRecords.reduce((sum, r) => sum + (r.discogs?.value ?? 0), 0)
    const genreCounts = activeRecords.reduce<Record<string, number>>((acc, r) => {
      if (r.genre) acc[r.genre] = (acc[r.genre] ?? 0) + 1
      return acc
    }, {})
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"
    const valuedRecords = activeRecords.filter((r) => r.discogs?.value)
    const avgValue = valuedRecords.length > 0
      ? Math.round(totalValue / valuedRecords.length)
      : 0
    return { totalRecords, totalValue, topGenre, avgValue }
  }, [activeRecords])

  const fmtValue = (v: number) =>
    v > 0 ? `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—"

  const userName = user?.name ?? user?.email?.split("@")[0] ?? "You"
  const userInitial = userName.charAt(0).toUpperCase()
  const userAvatar = user?.image

  const isCollection = activeScreen === "collection"
  const searchQuery = filters.searchQuery ?? ""

  return (
    <header
      className="glass-panel flex h-14 shrink-0 items-center gap-0 px-5 border-b"
      style={{ borderBottomColor: "var(--app-glass-border)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0 mr-5">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            background: "var(--app-green-bg)",
            border: "1px solid var(--app-green-border)",
          }}
        >
          <Disc3 className="h-4 w-4" style={{ color: "var(--app-green)" }} />
        </div>
        <span
          className="text-xs font-bold uppercase"
          style={{ color: "var(--app-text-3)", letterSpacing: "0.12em" }}
        >
          Vinyl
        </span>
      </div>

      {/* Divider */}
      <div className="h-6 w-px shrink-0 mr-5" style={{ background: "var(--app-border)" }} />

      {/* Hero stat */}
      <div className="flex flex-col shrink-0 mr-6">
        <span
          className="text-[10px] font-medium uppercase"
          style={{ color: "var(--app-green)", opacity: 0.6, letterSpacing: "0.10em" }}
        >
          Collection
        </span>
        <span
          className="font-mono text-lg font-bold leading-tight"
          style={{ color: "var(--app-green)" }}
        >
          {fmtValue(stats.totalValue)}
        </span>
      </div>

      {/* Secondary stats */}
      <div
        className="flex items-center gap-5 pl-5"
        style={{ borderLeft: "1px solid var(--app-border)" }}
      >
        <SecondaryStat label="Records" value={String(stats.totalRecords)} />
        <SecondaryStat label="Top Genre" value={stats.topGenre} />
        <SecondaryStat label="Avg. Value" value={fmtValue(stats.avgValue)} />
      </div>

      <div className="flex-1" />

      {/* Search — inline input when on collection screen, modal trigger otherwise */}
      {isCollection ? (
        <div
          className="relative flex items-center mr-3"
          style={{ width: 280 }}
        >
          <Search
            className="absolute left-3 h-3.5 w-3.5 pointer-events-none"
            style={{ color: "var(--app-text-3)" }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search collection..."
            value={searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            className="h-9 w-full rounded-lg pl-9 pr-8 text-sm outline-none transition-colors"
            style={{
              background: "var(--app-surface-3)",
              border: "1px solid var(--app-border)",
              color: "var(--app-text-1)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--app-green-border)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--app-border)")}
          />
          {searchQuery && (
            <button
              onClick={() => { setFilters({ ...filters, searchQuery: "" }); inputRef.current?.focus() }}
              className="absolute right-2 flex h-5 w-5 items-center justify-center rounded cursor-pointer"
              style={{ color: "var(--app-text-3)" }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={onSearchOpen}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs mr-3 transition-colors cursor-pointer"
          style={{
            background: "var(--app-surface-3)",
            border: "1px solid var(--app-border)",
            color: "var(--app-text-3)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--app-hover)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--app-surface-3)" }}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
          <kbd
            className="rounded px-1 py-0.5 font-mono text-[10px]"
            style={{
              background: "var(--app-surface-3)",
              border: "1px solid var(--app-border)",
            }}
          >
            ⌘K
          </kbd>
        </button>
      )}

      {/* User avatar — always navigates to account */}
      <button
        onClick={() => setActiveScreen("account")}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold cursor-pointer transition-opacity hover:opacity-80",
          !userAvatar && "text-black/80"
        )}
        style={{
          background: userAvatar ? undefined : "var(--app-green)",
          backgroundImage: userAvatar ? `url(${userAvatar})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        title={`${userName} · Account`}
      >
        {!userAvatar && userInitial}
      </button>
    </header>
  )
}

function SecondaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-[10px] font-medium uppercase"
        style={{ color: "var(--app-text-3)", letterSpacing: "0.08em" }}
      >
        {label}
      </span>
      <span
        className="font-mono text-sm font-semibold"
        style={{ color: "var(--app-text-2)" }}
      >
        {value}
      </span>
    </div>
  )
}
