"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { VinylRecord, ViewMode, SortOption, SortDirection, FilterOptions, Condition } from "./types"
import { mockRecords, filterRecords, sortRecords } from "./data"

interface VinylCatalogContextType {
  // Records
  records: VinylRecord[]
  filteredRecords: VinylRecord[]
  selectedRecord: VinylRecord | null
  setSelectedRecord: (record: VinylRecord | null) => void

  // View
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Filters
  filters: FilterOptions
  setFilters: (filters: FilterOptions) => void
  clearFilters: () => void

  // Sort
  sortBy: SortOption
  sortDirection: SortDirection
  setSorting: (sortBy: SortOption, direction: SortDirection) => void

  // Navigation
  activeScreen: "collection" | "scan" | "stats" | "settings"
  setActiveScreen: (screen: "collection" | "scan" | "stats" | "settings") => void

  // Detail modal
  isDetailOpen: boolean
  setIsDetailOpen: (open: boolean) => void
}

const VinylCatalogContext = createContext<VinylCatalogContextType | undefined>(undefined)

export function VinylCatalogProvider({ children }: { children: ReactNode }) {
  const [records] = useState<VinylRecord[]>(mockRecords)
  const [selectedRecord, setSelectedRecord] = useState<VinylRecord | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [filters, setFiltersState] = useState<FilterOptions>({})
  const [sortBy, setSortBy] = useState<SortOption>("dateAdded")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [activeScreen, setActiveScreen] = useState<"collection" | "scan" | "stats" | "settings">("collection")
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const setFilters = useCallback((newFilters: FilterOptions) => {
    setFiltersState(newFilters)
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState({})
  }, [])

  const setSorting = useCallback((newSortBy: SortOption, newDirection: SortDirection) => {
    setSortBy(newSortBy)
    setSortDirection(newDirection)
  }, [])

  // Apply filters and sorting
  const filteredRecords = sortRecords(
    filterRecords(records, {
      genre: filters.genre,
      decade: filters.decade,
      condition: filters.condition as Condition | undefined,
      artist: filters.artist,
      searchQuery: filters.searchQuery,
    }),
    sortBy,
    sortDirection
  )

  return (
    <VinylCatalogContext.Provider
      value={{
        records,
        filteredRecords,
        selectedRecord,
        setSelectedRecord,
        viewMode,
        setViewMode,
        filters,
        setFilters,
        clearFilters,
        sortBy,
        sortDirection,
        setSorting,
        activeScreen,
        setActiveScreen,
        isDetailOpen,
        setIsDetailOpen,
      }}
    >
      {children}
    </VinylCatalogContext.Provider>
  )
}

export function useVinylCatalog() {
  const context = useContext(VinylCatalogContext)
  if (context === undefined) {
    throw new Error("useVinylCatalog must be used within a VinylCatalogProvider")
  }
  return context
}
