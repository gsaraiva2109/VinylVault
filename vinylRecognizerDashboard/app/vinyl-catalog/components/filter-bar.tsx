"use client"

import { cn } from "@/lib/utils"
import { useVinylCatalog } from "../context"
import { getCollectionStats } from "../data"
import { ChevronDown, ArrowUpDown, Search, X } from "lucide-react"
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
  } = useVinylCatalog()

  const stats = getCollectionStats(records)
  const genres = Object.keys(stats.byGenre).sort()
  const decades = Object.keys(stats.byDecade).sort()
  const artists = [...new Set(records.map((r) => r.artist))].sort()
  const conditions = ["mint", "excellent", "good", "fair"] as const

  const hasActiveFilters = filters.genre || filters.decade || filters.condition || filters.artist || filters.searchQuery

  return (
    <div className="border-b border-zinc-200 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      {/* Search bar */}
      <div className="mb-3 flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search records or artists..."
            value={filters.searchQuery || ""}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-500 outline-none transition-colors focus:border-zinc-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-zinc-600"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Genre Filter */}
        <FilterDropdown
          label="Genre"
          value={filters.genre}
          options={genres}
          onChange={(value) => setFilters({ ...filters, genre: value })}
        />

        {/* Artist/Band Filter */}
        <FilterDropdown
          label="Band"
          value={filters.artist}
          options={artists}
          onChange={(value) => setFilters({ ...filters, artist: value })}
        />

        {/* Decade Filter */}
        <FilterDropdown
          label="Decade"
          value={filters.decade}
          options={decades}
          onChange={(value) => setFilters({ ...filters, decade: value })}
        />

        {/* Condition Filter */}
        <FilterDropdown
          label="Condition"
          value={filters.condition}
          options={[...conditions]}
          onChange={(value) => setFilters({ ...filters, condition: value as typeof conditions[number] })}
          formatOption={(opt) => opt.charAt(0).toUpperCase() + opt.slice(1)}
        />

        <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

        {/* Sort */}
        <SortDropdown
          sortBy={sortBy}
          direction={sortDirection}
          onChange={setSorting}
        />
      </div>
    </div>
  )
}

interface FilterDropdownProps {
  label: string
  value?: string
  options: string[]
  onChange: (value: string | undefined) => void
  formatOption?: (option: string) => string
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  formatOption = (opt) => opt,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
          value
            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600"
        )}
      >
        {value ? formatOption(value) : label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          {value && (
            <button
              onClick={() => {
                onChange(undefined)
                setIsOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              Clear
            </button>
          )}
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option)
                setIsOpen(false)
              }}
              className={cn(
                "block w-full px-3 py-2 text-left text-sm transition-colors",
                value === option
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700"
              )}
            >
              {formatOption(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface SortDropdownProps {
  sortBy: SortOption
  direction: "asc" | "desc"
  onChange: (sortBy: SortOption, direction: "asc" | "desc") => void
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "dateAdded", label: "Date Added" },
  { value: "title", label: "Title" },
  { value: "artist", label: "Artist" },
  { value: "year", label: "Year" },
  { value: "condition", label: "Condition" },
]

function SortDropdown({ sortBy, direction, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const currentLabel = sortOptions.find((opt) => opt.value === sortBy)?.label

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        {currentLabel}
        <span className="text-zinc-400">{direction === "asc" ? "↑" : "↓"}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                const newDirection =
                  sortBy === option.value
                    ? direction === "asc"
                      ? "desc"
                      : "asc"
                    : "desc"
                onChange(option.value, newDirection)
                setIsOpen(false)
              }}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                sortBy === option.value
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700"
              )}
            >
              {option.label}
              {sortBy === option.value && (
                <span className="text-zinc-400">
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
