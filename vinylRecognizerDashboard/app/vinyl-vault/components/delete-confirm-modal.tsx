"use client"

import { useEffect, useState, useRef } from "react"
import { Trash2, Loader2, AlertTriangle } from "lucide-react"
import type { VinylRecord } from "../types"

interface DeleteConfirmModalProps {
  record: VinylRecord
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

function getPlaceholderColor(id: string): string {
  const colors = ["#1a1a2e", "#16213e", "#0f3460", "#533483", "#4a0e4e", "#2c3e50", "#1e3a5f", "#2d4059"]
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function DeleteConfirmModal({ record, isDeleting, onConfirm, onCancel }: DeleteConfirmModalProps) {
  const [isShaking, setIsShaking] = useState(false)
  const [deleteHovered, setDeleteHovered] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [onCancel])

  function handleBackdropClick() {
    if (isDeleting) return
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-6px) rotate(-1deg); }
          30%       { transform: translateX(6px) rotate(1deg); }
          45%       { transform: translateX(-5px) rotate(-0.5deg); }
          60%       { transform: translateX(5px) rotate(0.5deg); }
          75%       { transform: translateX(-3px); }
          90%       { transform: translateX(3px); }
        }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
          onClick={handleBackdropClick}
        />

        {/* Modal */}
        <div
          ref={modalRef}
          className="relative z-10 mx-4 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
          style={{
            animation: isShaking
              ? "shake 0.5s ease-in-out"
              : "modal-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Blurred cover art header */}
          <div className="relative h-32 overflow-hidden">
            <div
              className="absolute inset-0 scale-110 bg-cover bg-center"
              style={{
                backgroundImage: record.coverUrl ? `url(${record.coverUrl})` : undefined,
                backgroundColor: getPlaceholderColor(record.id),
                filter: "blur(10px) grayscale(70%) brightness(0.35)",
              }}
            />
            {/* Warning badge */}
            <div className="relative flex h-full items-center justify-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background: "rgba(220, 38, 38, 0.18)",
                  border: "1.5px solid rgba(220, 38, 38, 0.4)",
                  boxShadow: "0 0 24px rgba(220, 38, 38, 0.15)",
                }}
              >
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-2 pt-5 text-center">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Move to trash?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              This will remove
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate px-4">
              &ldquo;{record.title}&rdquo;
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              by {record.artist}
            </p>
            <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-600">
              You can recover it from Settings → Data within 30 days.
            </p>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-2.5 p-4 pt-3">
            {/* Cancel */}
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 rounded-lg border border-zinc-200 bg-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
            >
              Cancel
            </button>

            {/* Delete — wipe fill animation */}
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              onMouseEnter={() => setDeleteHovered(true)}
              onMouseLeave={() => setDeleteHovered(false)}
              className="relative flex-1 overflow-hidden rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 cursor-pointer"
              style={{
                border: "1.5px solid rgba(220, 38, 38, 0.5)",
                color: deleteHovered && !isDeleting ? "white" : "rgb(248, 113, 113)",
                transition: "color 0.3s",
              }}
            >
              {/* Sliding fill */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgb(220, 38, 38)",
                  transform: deleteHovered && !isDeleting ? "translateX(0)" : "translateX(-100%)",
                  transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
              <span className="relative flex items-center justify-center gap-2">
                {isDeleting
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Trash2 className="h-4 w-4" />}
                {isDeleting ? "Moving…" : "Move to Trash"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
