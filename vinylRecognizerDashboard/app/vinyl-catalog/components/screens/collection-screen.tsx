"use client"

import { useVinylCatalog } from "../../context"
import { RecordCard } from "../record-card"
import { RecordListItem } from "../record-list-item"
import { FilterBar } from "../filter-bar"
import { Disc3 } from "lucide-react"

export function CollectionScreen() {
  const { filteredRecords, viewMode, filters } = useVinylCatalog()

  const hasActiveFilters = filters.genre || filters.decade || filters.condition || filters.artist || filters.searchQuery

  return (
    <div className="flex h-full flex-col">
      <FilterBar />

      {filteredRecords.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Disc3 className="h-8 w-8 text-zinc-400" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              No records found
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {hasActiveFilters
                ? "Try adjusting your filters to find more records"
                : "Start building your collection by scanning a record"}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
