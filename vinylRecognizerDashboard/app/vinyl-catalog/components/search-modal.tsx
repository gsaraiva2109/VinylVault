"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Search, Clock, Plus, ScanLine, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVinylCatalog } from "../context"
import type { VinylRecord } from "../types"

const STORAGE_KEY = "vinyl-recent-searches"
const MAX_RECENT = 5

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  const recent = getRecentSearches().filter((s) => s !== query)
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([query, ...recent].slice(0, MAX_RECENT))
  )
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const { records, setSelectedRecord, setIsDetailOpen, setActiveScreen } =
    useVinylCatalog()

  const [query, setQuery] = useState("")
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery("")
      setHighlightedIdx(-1)
      setRecentSearches(getRecentSearches())
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  const filteredRecords: VinylRecord[] =
    query.length >= 2
      ? records
          .filter((r) => {
            const q = query.toLowerCase()
            return (
              r.title.toLowerCase().includes(q) ||
              r.artist.toLowerCase().includes(q) ||
              r.genre.toLowerCase().includes(q)
            )
          })
          .slice(0, 8)
      : []

  const handleSelectRecord = useCallback(
    (record: VinylRecord) => {
      saveRecentSearch(`${record.artist} — ${record.title}`)
      setSelectedRecord(record)
      setIsDetailOpen(true)
      onClose()
    },
    [setSelectedRecord, setIsDetailOpen, onClose]
  )

  const handleSelectRecent = useCallback((search: string) => {
    setQuery(search)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const handleScan = useCallback(() => {
    setActiveScreen("scan")
    onClose()
  }, [setActiveScreen, onClose])

  // Keyboard navigation within modal
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (filteredRecords.length === 0) return
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setHighlightedIdx((i) => Math.min(i + 1, filteredRecords.length - 1))
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setHighlightedIdx((i) => Math.max(i - 1, -1))
      }
      if (e.key === "Enter" && highlightedIdx >= 0) {
        handleSelectRecord(filteredRecords[highlightedIdx])
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, onClose, highlightedIdx, filteredRecords, handleSelectRecord])

  if (!open) return null

  const hasResults = filteredRecords.length > 0
  const showEmpty = query.length >= 2 && !hasResults

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/55"
        style={{
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-[18%] z-[70] w-full max-w-[600px] -translate-x-1/2 px-4"
        role="dialog"
        aria-modal
        aria-label="Search records"
      >
        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background: "rgba(18, 18, 18, 0.94)",
            backdropFilter: "blur(32px) saturate(200%)",
            WebkitBackdropFilter: "blur(32px) saturate(200%)",
            border: "1px solid rgba(255, 255, 255, 0.09)",
            boxShadow:
              "0 24px 64px rgba(0,0,0,0.75), 0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          {/* Search input row */}
          <div
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Search
              className="shrink-0 text-white/30"
              style={{ width: 17, height: 17 }}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setHighlightedIdx(-1)
              }}
              placeholder="Search by Artist, Album, or Catalog No."
              className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/25 outline-none"
            />
            {query ? (
              <button
                onClick={() => {
                  setQuery("")
                  inputRef.current?.focus()
                }}
                className="flex h-5 w-5 items-center justify-center rounded text-white/30 transition-colors hover:text-white/60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd
                className="rounded px-1.5 py-0.5 font-mono text-[10px] text-white/25"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                ESC
              </kbd>
            )}
          </div>

          {/* Body */}
          <div className="p-2">
            {/* Idle state — two columns */}
            {!query && (
              <div className="grid grid-cols-2 gap-0 p-2">
                {/* Recent Searches */}
                <div>
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.10em] text-white/25">
                    Recent Searches
                  </p>
                  {recentSearches.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-white/20">
                      No recent searches
                    </p>
                  ) : (
                    recentSearches.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSelectRecent(s)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white/85"
                      >
                        <Clock className="h-3.5 w-3.5 shrink-0 text-white/20" />
                        <span className="truncate">{s}</span>
                      </button>
                    ))
                  )}
                </div>

                {/* Quick Actions */}
                <div>
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.10em] text-white/25">
                    Quick Actions
                  </p>
                  <button
                    onClick={handleScan}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white/85"
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: "rgba(40, 215, 104, 0.14)",
                        border: "1px solid rgba(40, 215, 104, 0.25)",
                      }}
                    >
                      <Plus className="h-3 w-3 text-[#28d768]" />
                    </span>
                    Manually Add Record
                  </button>
                  <button
                    onClick={handleScan}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white/85"
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: "rgba(40, 215, 104, 0.08)",
                        border: "1px solid rgba(40, 215, 104, 0.18)",
                      }}
                    >
                      <ScanLine className="h-3 w-3 text-[#28d768]/60" />
                    </span>
                    Scan Barcode
                  </button>
                </div>
              </div>
            )}

            {/* Results list */}
            {query && hasResults && (
              <div className="px-2 py-1">
                {filteredRecords.map((record, idx) => (
                  <button
                    key={record.id}
                    onClick={() => handleSelectRecord(record)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                      idx === highlightedIdx
                        ? "bg-white/[0.07] text-white/90"
                        : "text-white/65 hover:bg-white/[0.05] hover:text-white/85"
                    )}
                  >
                    <div
                      className="h-9 w-9 shrink-0 rounded-md bg-cover bg-center"
                      style={{
                        backgroundImage: record.coverUrl
                          ? `url(${record.coverUrl})`
                          : undefined,
                        backgroundColor: "#1a1a1a",
                      }}
                    />
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">
                        {record.title}
                      </p>
                      <p className="truncate text-xs text-white/35">
                        {record.artist} · {record.year}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-white/20">
                      {record.genre}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {showEmpty && (
              <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
                <p className="text-sm text-white/35">
                  No records found for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-white/20">
                  Try a different search term
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
