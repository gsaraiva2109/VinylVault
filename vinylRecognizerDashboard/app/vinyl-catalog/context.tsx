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
import { useSession, signOut } from "next-auth/react"
import { MOCK_RECORDS } from "./mock-data"

const IS_DEV = process.env.NODE_ENV === "development"
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"

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
  activeScreen: "collection" | "scan" | "stats" | "settings" | "account"
  setActiveScreen: (screen: "collection" | "scan" | "stats" | "settings" | "account") => void

  // Detail modal
  isDetailOpen: boolean
  setIsDetailOpen: (open: boolean) => void

  // Actions
  refreshCollection: () => void
  updateRecord: (id: string, patch: Partial<VinylRecord>) => Promise<void>
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
  type Screen = "collection" | "scan" | "stats" | "settings" | "account"
  const [activeScreen, setActiveScreen] = useState<Screen>("collection")
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  const { data: session, status } = useSession()

  const refreshCollection = useCallback(() => {
    setRefreshTick((prev) => prev + 1)
  }, [])

  const updateRecord = useCallback(async (id: string, patch: Partial<VinylRecord>): Promise<void> => {
    // Capture original for rollback, then apply optimistic update
    let original: VinylRecord | undefined
    setRecords((prev) => {
      original = prev.find((r) => r.id === id)
      return prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    })
    if (!IS_DEV) {
      const token = (session as { accessToken?: string })?.accessToken
      const numId = parseInt(id, 10)
      if (!isNaN(numId)) {
        try {
          await api.vinyls.update(numId, patch as Record<string, unknown>, token)
        } catch (err) {
          // Roll back optimistic update
          if (original) {
            const orig = original
            setRecords((prev) => prev.map((r) => (r.id === id ? orig : r)))
          }
          throw err
        }
      }
    }
  }, [session])

  useEffect(() => {
    if ((session as { error?: string })?.error === "RefreshAccessTokenError") {
      signOut({ callbackUrl: "/" })
    }
  }, [session])

  useEffect(() => {
    // In development, skip the API and use local mock data IF explicitly enabled
    if (IS_DEV && USE_MOCK_DATA) {
      setRecords(MOCK_RECORDS)
      setIsLoading(false)
      return
    }

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
          const errorMessage = err instanceof Error ? err.message : "Failed to load collection"
          if (errorMessage.includes("401 Unauthorized")) {
            signOut({ callbackUrl: "/" })
          } else {
            setError(errorMessage)
          }
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [session, status, refreshTick])

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
        refreshCollection,
        updateRecord,
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
