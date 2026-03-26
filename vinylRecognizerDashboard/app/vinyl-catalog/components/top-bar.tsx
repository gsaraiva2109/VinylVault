"use client"

import { useVinylCatalog } from "../context"
import { Search, Grid3X3, List, SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"

const screenTitles = {
  collection: "Collection",
  scan: "Scan Record",
  stats: "Statistics",
  settings: "Settings",
  account: "Account",
}

export function TopBar() {
  const {
    activeScreen,
    viewMode,
    setViewMode,
    filters,
    setFilters,
    clearFilters,
  } = useVinylCatalog()

  const hasActiveFilters = filters.genre || filters.decade || filters.condition || filters.searchQuery

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Title */}
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {screenTitles[activeScreen]}
      </h1>

      {/* Actions - only show on collection screen */}
      {activeScreen === "collection" && (
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={filters.searchQuery || ""}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="h-9 w-64 rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-500 outline-none transition-colors focus:border-zinc-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-zinc-600 dark:focus:bg-zinc-800"
            />
          </div>

          {/* Filter indicator */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Clear Filters
              <X className="h-3 w-3" />
            </button>
          )}

          {/* View Toggle */}
          <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
