"use client"

import { useVinylCatalog } from "../context"
import { ConditionBadge } from "./condition-badge"
import {
  X,
  Calendar,
  Music,
  StickyNote,
  ExternalLink,
  Play,
  DollarSign,
  Heart,
  Share2,
  Edit3,
} from "lucide-react"
import { useEffect } from "react"

function SpotifyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}

export function RecordDetailModal() {
  const { selectedRecord, isDetailOpen, setIsDetailOpen, setSelectedRecord } = useVinylCatalog()

  // Close on escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsDetailOpen(false)
      }
    }
    if (isDetailOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [isDetailOpen, setIsDetailOpen])

  if (!isDetailOpen || !selectedRecord) return null

  const handleClose = () => {
    setIsDetailOpen(false)
    setSelectedRecord(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Record Details
          </h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-auto p-6 md:flex-row md:gap-8">
          {/* Cover Image */}
          <div className="shrink-0 md:w-72">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 shadow-lg dark:bg-zinc-800">
              <div
                className="h-full w-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${selectedRecord.coverUrl})`,
                  backgroundColor: getPlaceholderColor(selectedRecord.id),
                }}
              />
              {selectedRecord.spotify && (
                <button className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#1DB954] text-white shadow-lg transition-transform hover:scale-105">
                  <Play className="h-5 w-5 fill-current" />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-4 flex gap-2">
              <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
                <Heart className="h-4 w-4" />
                Favorite
              </button>
              <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 flex-1 md:mt-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedRecord.title}
                </h1>
                <p className="mt-1 text-lg text-zinc-600 dark:text-zinc-400">
                  {selectedRecord.artist}
                </p>
              </div>
              <ConditionBadge condition={selectedRecord.condition} size="md" />
            </div>

            {/* Meta Info */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <Calendar className="h-4 w-4" />
                  Year
                </div>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedRecord.year}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <Music className="h-4 w-4" />
                  Genre
                </div>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedRecord.genre}
                </p>
              </div>
            </div>

            {/* Value */}
            {selectedRecord.discogs?.value && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                  Estimated Value
                </div>
                <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  ${selectedRecord.discogs.value}
                </p>
                {selectedRecord.discogs.wantlistCount && (
                  <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-500">
                    {selectedRecord.discogs.wantlistCount.toLocaleString()} people want this
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            {selectedRecord.notes && (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <StickyNote className="h-4 w-4" />
                  Notes
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {selectedRecord.notes}
                </p>
              </div>
            )}

            {/* External Links */}
            <div className="mt-6 flex flex-wrap gap-3">
              {selectedRecord.discogs && (
                <a
                  href={`https://www.discogs.com/release/${selectedRecord.discogs.releaseId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  View on Discogs
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {selectedRecord.spotify && (
                <a
                  href={`https://open.spotify.com/album/${selectedRecord.spotify.albumId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-[#1DB954] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1aa34a]"
                >
                  <SpotifyIcon />
                  Open in Spotify
                </a>
              )}
            </div>

            {/* Date Added */}
            <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-500">
              Added on {new Date(selectedRecord.dateAdded).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <button className="flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100">
            <Edit3 className="h-4 w-4" />
            Edit Record
          </button>
          <button
            onClick={handleClose}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function getPlaceholderColor(id: string): string {
  const colors = [
    "#1a1a2e",
    "#16213e",
    "#0f3460",
    "#533483",
    "#4a0e4e",
    "#2c3e50",
    "#1e3a5f",
    "#2d4059",
  ]
  const index = parseInt(id, 10) % colors.length
  return colors[index]
}
