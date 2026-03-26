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
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface VinylCatalogContextType {
  // Records
  records: VinylRecord[]
  activeRecords: VinylRecord[]
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
  deleteRecord: (id: string) => Promise<void>
  recoverRecord: (id: string) => Promise<void>
  permanentlyDeleteRecord: (id: string) => Promise<void>
  isDeleting: boolean

  // Trash
  trashedRecords: VinylRecord[]
}

const VinylCatalogContext = createContext<VinylCatalogContextType | undefined>(undefined)

export function VinylCatalogProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<VinylRecord[]>([])
  const [trashedRecords, setTrashedRecords] = useState<VinylRecord[]>([])
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
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: session, status } = useSession()

  const refreshCollection = useCallback(() => {
    setRefreshTick((prev) => prev + 1)
  }, [])

  const updateRecord = useCallback(async (id: string, patch: Partial<VinylRecord>): Promise<void> => {
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

  // Fetch active + trashed records
  useEffect(() => {
    if (IS_DEV && USE_MOCK_DATA) {
      setRecords(MOCK_RECORDS)
      setTrashedRecords([])
      setIsLoading(false)
      return
    }

    if (status === "loading") return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const token = (session as { accessToken?: string })?.accessToken

    Promise.all([
      api.vinyls.getAll(token),
      api.vinyls.getTrash(token),
    ])
      .then(([active, trashed]: [BackendVinyl[], BackendVinyl[]]) => {
        if (!cancelled) {
          setRecords(active.map(mapBackendVinyl))
          setTrashedRecords(trashed.map(mapBackendVinyl))
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

  // SSE connection for real-time sync across tabs/devices
  useEffect(() => {
    if (IS_DEV && USE_MOCK_DATA) return

    const token = (session as { accessToken?: string })?.accessToken
    if (!token || status !== "authenticated") return

    const url = `${API_URL}/api/events?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)

    es.addEventListener("vinyl.created", (e) => {
      const vinyl = mapBackendVinyl(JSON.parse(e.data) as BackendVinyl)
      setRecords((prev) => {
        if (prev.some((r) => r.id === vinyl.id)) return prev
        return [vinyl, ...prev]
      })
    })

    es.addEventListener("vinyl.updated", (e) => {
      const vinyl = mapBackendVinyl(JSON.parse(e.data) as BackendVinyl)
      setRecords((prev) => prev.map((r) => (r.id === vinyl.id ? vinyl : r)))
    })

    es.addEventListener("vinyl.deleted", (e) => {
      const vinyl = mapBackendVinyl(JSON.parse(e.data) as BackendVinyl)
      setRecords((prev) => prev.filter((r) => r.id !== vinyl.id))
      setTrashedRecords((prev) => {
        if (prev.some((r) => r.id === vinyl.id)) return prev
        return [vinyl, ...prev]
      })
    })

    es.addEventListener("vinyl.recovered", (e) => {
      const vinyl = mapBackendVinyl(JSON.parse(e.data) as BackendVinyl)
      setTrashedRecords((prev) => prev.filter((r) => r.id !== vinyl.id))
      setRecords((prev) => {
        if (prev.some((r) => r.id === vinyl.id)) return prev
        return [vinyl, ...prev]
      })
    })

    es.addEventListener("vinyl.permanentlyDeleted", (e) => {
      const { id } = JSON.parse(e.data) as { id: number }
      const strId = String(id)
      setTrashedRecords((prev) => prev.filter((r) => r.id !== strId))
    })

    es.onerror = () => {
      // EventSource auto-reconnects; no action needed
    }

    return () => es.close()
  }, [session, status])

  // Soft-delete: moves to trash via API
  const deleteRecord = useCallback(async (id: string): Promise<void> => {
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return

    // Optimistic update
    const record = records.find((r) => r.id === id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
    if (record) {
      setTrashedRecords((prev) => [{ ...record, deletedAt: Date.now() }, ...prev])
    }

    if (!(IS_DEV && USE_MOCK_DATA)) {
      try {
        const token = (session as { accessToken?: string })?.accessToken
        const updated = await api.vinyls.delete(numId, token) as BackendVinyl
        // Sync with server response (has accurate deletedAt)
        if (updated) {
          setTrashedRecords((prev) =>
            prev.map((r) => r.id === id ? mapBackendVinyl(updated) : r)
          )
        }
      } catch (err) {
        // Rollback
        if (record) {
          setRecords((prev) => [record, ...prev])
          setTrashedRecords((prev) => prev.filter((r) => r.id !== id))
        }
        throw err
      }
    }
  }, [records, session])

  // Recover from trash via API
  const recoverRecord = useCallback(async (id: string): Promise<void> => {
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return

    // Optimistic update
    const record = trashedRecords.find((r) => r.id === id)
    setTrashedRecords((prev) => prev.filter((r) => r.id !== id))
    if (record) {
      setRecords((prev) => [{ ...record, deletedAt: null }, ...prev])
    }

    if (!(IS_DEV && USE_MOCK_DATA)) {
      try {
        const token = (session as { accessToken?: string })?.accessToken
        const recovered = await api.vinyls.recover(numId, token) as BackendVinyl
        if (recovered) {
          setRecords((prev) =>
            prev.map((r) => r.id === id ? mapBackendVinyl(recovered) : r)
          )
        }
      } catch (err) {
        // Rollback
        if (record) {
          setTrashedRecords((prev) => [record, ...prev])
          setRecords((prev) => prev.filter((r) => r.id !== id))
        }
        throw err
      }
    }
  }, [trashedRecords, session])

  // Permanent delete via API — removes the DB row entirely
  const permanentlyDeleteRecord = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true)
    const numId = parseInt(id, 10)

    // Optimistic update
    setTrashedRecords((prev) => prev.filter((r) => r.id !== id))

    if (!(IS_DEV && USE_MOCK_DATA) && !isNaN(numId)) {
      try {
        const token = (session as { accessToken?: string })?.accessToken
        await api.vinyls.permanentlyDelete(numId, token)
      } catch (err) {
        setIsDeleting(false)
        // Rollback
        refreshCollection()
        throw err
      }
    }
    setIsDeleting(false)
  }, [session, refreshCollection])

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

  // activeRecords = records (backend already filters isDeleted=false)
  const activeRecords = records

  const filteredRecords = sortRecords(
    filterRecords(activeRecords, {
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
        activeRecords,
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
        deleteRecord,
        recoverRecord,
        permanentlyDeleteRecord,
        isDeleting,
        trashedRecords,
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
