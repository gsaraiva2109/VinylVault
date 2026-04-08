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
  const [redFlash, setRedFlash] = useState(false)
  const [cancelPulse, setCancelPulse] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on Escape — skip bounce effect for keyboard dismiss
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [onCancel])

  function handleBackdropClick() {
    if (isDeleting || isConfirming) return
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }

  function handleConfirmWithEffects() {
    if (isDeleting || isConfirming) return
    setIsConfirming(true)
    setIsShaking(true)
    setRedFlash(true)
    setTimeout(() => {
      setIsShaking(false)
      setRedFlash(false)
      onConfirm()
    }, 450)
  }

  function handleCancelWithEffects() {
    if (isDeleting || isConfirming) return
    setCancelPulse(true)
    setTimeout(() => {
      setCancelPulse(false)
      onCancel()
    }, 580)
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
        @keyframes redScreenFlash {
          0%   { opacity: 0; }
          15%  { opacity: 0.42; }
          60%  { opacity: 0.28; }
          100% { opacity: 0; }
        }
        @keyframes elasticBounce {
          0%   { transform: scale(1); }
          25%  { transform: scale(0.94); }
          55%  { transform: scale(1.04); }
          75%  { transform: scale(0.98); }
          90%  { transform: scale(1.01); }
          100% { transform: scale(1); }
        }
        @keyframes greenPulseOverlay {
          0%   { opacity: 0; }
          30%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Red screen flash — full viewport overlay */}
      {redFlash && (
        <div
          className="fixed inset-0 z-[70] pointer-events-none"
          style={{
            background: "rgba(220, 38, 38, 0.38)",
            animation: "redScreenFlash 0.45s ease-out both",
          }}
        />
      )}

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
            animation: cancelPulse
              ? "elasticBounce 0.58s cubic-bezier(0.34, 1.56, 0.64, 1)"
              : isShaking
                ? "shake 0.5s ease-in-out"
                : "modal-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Green pulse overlay — cancel reassurance */}
          {cancelPulse && (
            <div
              className="pointer-events-none absolute inset-0 z-20 rounded-2xl"
              style={{
                background: "rgba(40, 215, 104, 0.10)",
                boxShadow: "inset 0 0 32px rgba(40, 215, 104, 0.22)",
                animation: "greenPulseOverlay 0.58s ease-out both",
              }}
            />
          )}
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
            {/* Cancel — elastic bounce + green pulse */}
            <button
              onClick={handleCancelWithEffects}
              disabled={isDeleting || isConfirming}
              className="flex-1 rounded-lg border border-zinc-200 bg-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
            >
              Cancel
            </button>

            {/* Delete — wipe fill animation + red flash on click */}
            <button
              onClick={handleConfirmWithEffects}
              disabled={isDeleting || isConfirming}
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
