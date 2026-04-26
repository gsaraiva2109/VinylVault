"use client"

import { useVinylVault } from "../../context"
import { RecordCard } from "../record-card"
import { RecordListItem } from "../record-list-item"
import { FilterBar } from "../filter-bar"
import { Disc3, Loader2, AlertCircle, RefreshCw, Plus } from "lucide-react"

export function CollectionScreen() {
  const { filteredRecords, viewMode, filters, isLoading, error, setActiveScreen, refreshCollection } = useVinylVault()

  const hasActiveFilters = filters.genre || filters.decade || filters.condition || filters.artist || filters.searchQuery

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3" style={{ color: "var(--app-text-3)" }}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading your collection...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "rgba(245,47,18,0.10)" }}
        >
          <AlertCircle className="h-8 w-8" style={{ color: "#f52f12" }} />
        </div>
        <h3 className="text-lg font-semibold" style={{ color: "var(--app-text-1)" }}>Failed to load collection</h3>
        <p className="max-w-md text-sm" style={{ color: "var(--app-text-2)" }}>{error}</p>
        <button
          onClick={refreshCollection}
          className="mt-4 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer"
          style={{ border: "1px solid var(--app-border-md)", background: "var(--app-surface-3)", color: "var(--app-text-2)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--app-hover)"; e.currentTarget.style.color = "var(--app-text-1)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--app-surface-3)"; e.currentTarget.style.color = "var(--app-text-2)" }}
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">

      <FilterBar />

      {filteredRecords.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "var(--app-surface-3)" }}
          >
            <Disc3 className="h-8 w-8" style={{ color: "var(--app-text-3)" }} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold" style={{ color: "var(--app-text-1)" }}>No records found</h3>
            <p className="mt-1 text-sm" style={{ color: "var(--app-text-2)" }}>
              {hasActiveFilters
                ? "Try adjusting your filters to find more records"
                : "Start building your collection by scanning a record"}
            </p>
            {!hasActiveFilters && (
              <button
                onClick={() => setActiveScreen("scan")}
                className="mx-auto mt-6 flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-colors cursor-pointer"
                style={{ background: "#28d768", color: "#0a0a0a" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#22c55e")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#28d768")}
              >
                <Plus className="h-4 w-4" />
                Scan Your First Record
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6 pb-28">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4">
              {filteredRecords.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredRecords.map((record) => (
                <RecordListItem key={record.id} record={record} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
