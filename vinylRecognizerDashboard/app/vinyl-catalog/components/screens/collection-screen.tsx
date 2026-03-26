"use client"

import { useVinylCatalog } from "../../context"
import { RecordCard } from "../record-card"
import { RecordListItem } from "../record-list-item"
import { FilterBar } from "../filter-bar"
import { Disc3, Loader2, AlertCircle } from "lucide-react"

export function CollectionScreen() {
  const { filteredRecords, viewMode, filters, isLoading, error } = useVinylCatalog()

  const hasActiveFilters = filters.genre || filters.decade || filters.condition || filters.artist || filters.searchQuery

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-white/30">
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
        <h3 className="text-lg font-semibold text-white/85">Failed to load collection</h3>
        <p className="text-sm text-white/40">{error}</p>
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
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <Disc3 className="h-8 w-8 text-white/25" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white/85">No records found</h3>
            <p className="mt-1 text-sm text-white/40">
              {hasActiveFilters
                ? "Try adjusting your filters to find more records"
                : "Start building your collection by scanning a record"}
            </p>
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
