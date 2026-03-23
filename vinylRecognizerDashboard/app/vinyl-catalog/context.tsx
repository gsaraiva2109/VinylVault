"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import type { VinylRecord, ViewMode, SortOption, SortDirection, FilterOptions, Condition } from "./types"
import { filterRecords, sortRecords } from "./data"
import { api } from "@/lib/api"
import { mapBackendVinyl, type BackendVinyl } from "@/lib/mappers"
import { useSession } from "next-auth/react"

interface VinylCatalogContextType {
  // Records
  records: VinylRecord[]
  filteredRecords: VinylRecord[]
  selectedRecord: VinylRecord | null
  setSelectedRecord: (record: VinylRecord | null) => void

  // Loading state
  isLoading: boolean
  error: string | null

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
  const [records, setRecords] = useState<VinylRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<VinylRecord | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [filters, setFiltersState] = useState<FilterOptions>({})
  const [sortBy, setSortBy] = useState<SortOption>("dateAdded")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [activeScreen, setActiveScreen] = useState<"collection" | "scan" | "stats" | "settings">("collection")
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") return // Wait for session

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const token = (session as { accessToken?: string })?.accessToken

    api.vinyls.getAll(token)
      .then((data: BackendVinyl[]) => {
        if (!cancelled) {
          setRecords(data.map(mapBackendVinyl))
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load collection")
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [session, status])

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
        isLoading,
        error,
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
