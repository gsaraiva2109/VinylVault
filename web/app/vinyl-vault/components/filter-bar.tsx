"use client"

import { useVinylVault } from "../context"
import { getCollectionStats } from "../data"
import { ChevronDown, ArrowUpDown, Grid3X3, List, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { SortOption } from "../types"

export function FilterBar() {
  const {
    records,
    filters,
    setFilters,
    sortBy,
    sortDirection,
    setSorting,
    clearFilters,
    viewMode,
    setViewMode,
  } = useVinylVault()

  const stats = getCollectionStats(records)
  const genres = Object.keys(stats.byGenre).sort()
  const decades = Object.keys(stats.byDecade).sort()
  const artists = [...new Set(records.map((r) => r.artist))].sort()
  const conditions = ["M", "NM", "VG+", "VG", "G+", "G", "F", "P"] as const

  const activeFilterCount = [
    filters.genre, filters.decade, filters.condition, filters.artist,
  ].filter(Boolean).length

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-5 py-2.5"
      style={{ borderBottom: "1px solid var(--app-border)" }}
    >
      {/* Filter chips */}
      <FilterChip
        label="Genre"
        value={filters.genre}
        options={genres}
        onChange={(v) => setFilters({ ...filters, genre: v })}
      />
      <FilterChip
        label="Artist"
        value={filters.artist}
        options={artists}
        onChange={(v) => setFilters({ ...filters, artist: v })}
      />
      <FilterChip
        label="Decade"
        value={filters.decade}
        options={decades}
        onChange={(v) => setFilters({ ...filters, decade: v })}
      />
      <FilterChip
        label="Condition"
        value={filters.condition}
        options={[...conditions]}
        onChange={(v) => setFilters({ ...filters, condition: v as typeof conditions[number] })}
        formatOption={(o) => o.charAt(0).toUpperCase() + o.slice(1)}
      />

      {/* Clear all */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors cursor-pointer"
          style={{ color: "var(--app-text-3)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--app-text-1)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--app-text-3)")}
        >
          <X className="h-3 w-3" />
          {activeFilterCount > 1 ? `Clear ${activeFilterCount}` : "Clear"}
        </button>
      )}

      <div className="flex-1" />

      {/* Sort */}
      <SortChip sortBy={sortBy} direction={sortDirection} onChange={setSorting} />

      {/* Divider */}
      <div className="h-4 w-px" style={{ background: "var(--app-border)" }} />

      {/* View toggle */}
      <div
        className="flex rounded-lg p-0.5"
        style={{
          background: "var(--app-surface-3)",
          border: "1px solid var(--app-border)",
        }}
      >
        <ViewBtn active={viewMode === "grid"} onClick={() => setViewMode("grid")} title="Grid view">
          <Grid3X3 className="h-3.5 w-3.5" />
        </ViewBtn>
        <ViewBtn active={viewMode === "list"} onClick={() => setViewMode("list")} title="List view">
          <List className="h-3.5 w-3.5" />
        </ViewBtn>
      </div>
    </div>
  )
}

function ViewBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded-md transition-all cursor-pointer"
      style={{
        background: active ? "var(--app-surface)" : "transparent",
        color: active ? "var(--app-text-1)" : "var(--app-text-3)",
        boxShadow: active ? "var(--app-shadow)" : "none",
      }}
    >
      {children}
    </button>
  )
}

interface FilterChipProps {
  label: string
  value?: string
  options: string[]
  onChange: (value: string | undefined) => void
  formatOption?: (option: string) => string
}

function FilterChip({
  label,
  value,
  options,
  onChange,
  formatOption = (o) => o,
}: FilterChipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleOut)
    return () => document.removeEventListener("mousedown", handleOut)
  }, [])

  const isActive = !!value

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition-all cursor-pointer"
        style={{
          background: isActive ? "var(--app-green-bg)" : "var(--app-surface-3)",
          border: isActive
            ? "1px solid var(--app-green-border)"
            : "1px solid var(--app-border)",
          color: isActive ? "var(--app-green)" : "var(--app-text-2)",
        }}
      >
        {value ? formatOption(value) : label}
        <ChevronDown
          className="h-3 w-3 transition-transform"
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      {isOpen && (
        <div
          className="glass-dropdown absolute left-0 top-full z-50 mt-1.5 min-w-[140px] overflow-hidden rounded-xl py-1"
        >
          {value && (
            <button
              onClick={() => { onChange(undefined); setIsOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors cursor-pointer"
              style={{ color: "var(--app-text-3)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--app-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setIsOpen(false) }}
              className="block w-full px-3 py-1.5 text-left text-xs transition-colors cursor-pointer"
              style={{
                color: value === opt ? "var(--app-green)" : "var(--app-text-2)",
                fontWeight: value === opt ? 600 : 400,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--app-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {formatOption(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "dateAdded", label: "Date Added" },
  { value: "title", label: "Title" },
  { value: "artist", label: "Artist" },
  { value: "year", label: "Year" },
  { value: "condition", label: "Condition" },
]

function SortChip({
  sortBy,
  direction,
  onChange,
}: {
  sortBy: SortOption
  direction: "asc" | "desc"
  onChange: (s: SortOption, d: "asc" | "desc") => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleOut)
    return () => document.removeEventListener("mousedown", handleOut)
  }, [])

  const label = sortOptions.find((o) => o.value === sortBy)?.label

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-all cursor-pointer"
        style={{
          background: "var(--app-surface-3)",
          border: "1px solid var(--app-border)",
          color: "var(--app-text-2)",
        }}
      >
        <ArrowUpDown className="h-3 w-3" />
        {label}
        <span style={{ color: "var(--app-text-3)", fontSize: "10px" }}>
          {direction === "asc" ? "↑" : "↓"}
        </span>
      </button>

      {isOpen && (
        <div className="glass-dropdown absolute right-0 top-full z-50 mt-1.5 min-w-[160px] overflow-hidden rounded-xl py-1">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                const d = sortBy === opt.value ? (direction === "asc" ? "desc" : "asc") : "desc"
                onChange(opt.value, d)
                setIsOpen(false)
              }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors cursor-pointer"
              style={{
                color: sortBy === opt.value ? "var(--app-green)" : "var(--app-text-2)",
                fontWeight: sortBy === opt.value ? 600 : 400,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--app-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {opt.label}
              {sortBy === opt.value && (
                <span style={{ color: "var(--app-text-3)", fontSize: "11px" }}>
                  {direction === "asc" ? "↑" : "↓"}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
