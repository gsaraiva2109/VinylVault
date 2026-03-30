"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import { toast } from "sonner"
import type { VinylRecord, ViewMode, SortOption, SortDirection, FilterOptions, Condition } from "./types"
import { filterRecords, sortRecords } from "./data"
import { api, UnauthorizedError, isTokenExpired } from "@/lib/api"
import { mapBackendVinyl, type BackendVinyl } from "@/lib/mappers"
import { useTauriAuth } from "@/lib/tauri-auth"
import { MOCK_RECORDS } from "./mock-data"

const IS_DEV = process.env.NODE_ENV === "development"
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface VinylVaultContextType {
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

const VinylVaultContext = createContext<VinylVaultContextType | undefined>(undefined)

export function VinylVaultProvider({ children }: { children: ReactNode }) {
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

  const { accessToken: token, status, signOut } = useTauriAuth()

  const signingOutRef = useRef(false)
  const handleUnauthorized = useCallback(() => {
    if (signingOutRef.current) return
    signingOutRef.current = true
    toast.error("Session expired", {
      description: "Redirecting to sign in…",
      duration: 3000,
    })
    setTimeout(() => signOut(), 1500)
  }, [signOut])

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
      const numId = parseInt(id, 10)
      if (!isNaN(numId)) {
        try {
          await api.vinyls.update(numId, patch as Record<string, unknown>, token ?? undefined)
        } catch (err) {
          if (original) {
            const orig = original
            setRecords((prev) => prev.map((r) => (r.id === id ? orig : r)))
          }
          throw err
        }
      }
    }
  }, [token])

  // status goes "unauthenticated" when the Rust refresh fails; page.tsx will show login screen

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

    Promise.all([
      api.vinyls.getAll(token ?? undefined),
      api.vinyls.getTrash(token ?? undefined),
    ])
      .then(([active, trashed]: [BackendVinyl[], BackendVinyl[]]) => {
        if (!cancelled) {
          setRecords(active.map(mapBackendVinyl))
          setTrashedRecords(trashed.map(mapBackendVinyl))
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          if (err instanceof UnauthorizedError) {
            handleUnauthorized()
          } else {
            setError(err instanceof Error ? err.message : "Failed to load collection")
          }
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [token, status, refreshTick, handleUnauthorized])

  // SSE connection for real-time sync across tabs/devices
  useEffect(() => {
    if (IS_DEV && USE_MOCK_DATA) return

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
      // EventSource doesn't expose the HTTP status code, but if the token
      // is expired we know auth is the cause — sign out instead of looping.
      if (token && isTokenExpired(token)) {
        es.close()
        handleUnauthorized()
      }
    }

    return () => es.close()
  }, [token, status, handleUnauthorized])

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
        // token comes from useTauriAuth above
        const updated = await api.vinyls.delete(numId, token ?? undefined) as BackendVinyl
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
  }, [records, token])

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
        // token comes from useTauriAuth above
        const recovered = await api.vinyls.recover(numId, token ?? undefined) as BackendVinyl
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
  }, [trashedRecords, token])

  // Permanent delete via API — removes the DB row entirely
  const permanentlyDeleteRecord = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true)
    const numId = parseInt(id, 10)

    // Optimistic update
    setTrashedRecords((prev) => prev.filter((r) => r.id !== id))

    if (!(IS_DEV && USE_MOCK_DATA) && !isNaN(numId)) {
      try {
        // token comes from useTauriAuth above
        await api.vinyls.permanentlyDelete(numId, token ?? undefined)
      } catch (err) {
        setIsDeleting(false)
        // Rollback
        refreshCollection()
        throw err
      }
    }
    setIsDeleting(false)
  }, [token, refreshCollection])

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
    <VinylVaultContext.Provider
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
    </VinylVaultContext.Provider>
  )
}

export function useVinylVault() {
  const context = useContext(VinylVaultContext)
  if (context === undefined) {
    throw new Error("useVinylVault must be used within a VinylVaultProvider")
  }
  return context
}
