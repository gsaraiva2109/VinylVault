"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useVinylCatalog } from "../../context"
import { useRecognition } from "../../../../hooks/use-recognition"
import { ConditionBadge } from "../condition-badge"
import { useSession } from "next-auth/react"
import { api } from "@/lib/api"
import {
  Camera,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  ExternalLink,
  Sparkles,
  MonitorDown,
} from "lucide-react"
import type { VinylRecord } from "../../types"

export function ScanScreen() {
  const { state: scanState, captureAndRecognize, reset } = useRecognition()
  const [isElectron, setIsElectron] = useState<boolean | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsElectron(navigator.userAgent.toLowerCase().includes("electron"))
    }
  }, [])

  // Start camera on mount if in Electron
  useEffect(() => {
    if (!isElectron) return

    let active = true
    let activeStream: MediaStream | null = null

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        activeStream = s
        setStream(s)
        if (videoRef.current) {
          videoRef.current.srcObject = s
        }
      })
      .catch((err) => {
        console.error("Camera access error:", err)
      })

    return () => {
      active = false
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [isElectron])

  const handleScan = useCallback(() => {
    if (videoRef.current) {
      captureAndRecognize(videoRef.current)
    }
  }, [captureAndRecognize])

  if (isElectron === null) {
    return null // Prevent hydration flash while checking userAgent
  }

  if (!isElectron) {
    return <WebEmptyState />
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {scanState.status === "idle" && (
          <IdleState onScan={handleScan} videoRef={videoRef} hasStream={!!stream} />
        )}
        {scanState.status === "scanning" && <ScanningState />}
        {scanState.status === "success" && scanState.scannedRecord && (
          <SuccessState record={scanState.scannedRecord} onReset={reset} />
        )}
        {scanState.status === "error" && (
          <ErrorState message={scanState.errorMessage} onRetry={handleScan} onReset={reset} />
        )}
      </div>
    </div>
  )
}

function WebEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-zinc-100 dark:bg-zinc-800/50">
        <MonitorDown className="h-10 w-10 text-zinc-500 dark:text-zinc-400" />
      </div>
      
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Desktop App Required
      </h2>
      
      <p className="mt-4 max-w-sm text-base text-zinc-500 dark:text-zinc-400">
        The AI Vinyl Scanner relies on local CPU and GPU processing to run vision models for album art recognition. 
        Because you are on the web version, this feature is disabled.
      </p>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        <a 
          href="https://github.com/gsaraiva2109/vinyl-catalog" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <MonitorDown className="h-4 w-4" />
          Download Desktop App
        </a>
      </div>
    </div>
  )
}

function IdleState({
  onScan,
  videoRef,
  hasStream,
}: {
  onScan: () => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  hasStream: boolean
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Scan Area */}
      <div className="relative mb-8">
        <div className="relative flex h-80 w-80 items-center justify-center overflow-hidden rounded-2xl border-2 border-zinc-900 bg-black dark:border-zinc-100">
          {!hasStream && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                <Camera className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Camera starting...
              </p>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full object-cover ${!hasStream ? "hidden" : ""}`}
          />
        </div>
        {/* Corner brackets */}
        <div className="absolute -left-1 -top-1 h-6 w-6 border-l-2 border-t-2 border-zinc-900 dark:border-zinc-100" />
        <div className="absolute -right-1 -top-1 h-6 w-6 border-r-2 border-t-2 border-zinc-900 dark:border-zinc-100" />
        <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-2 border-l-2 border-zinc-900 dark:border-zinc-100" />
        <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-2 border-r-2 border-zinc-900 dark:border-zinc-100" />
      </div>

      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Scan Your Record
      </h2>
      <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Take a photo of your vinyl cover to automatically identify and catalog it using AI
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onScan}
          disabled={!hasStream}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <Camera className="h-5 w-5" />
          Take Photo
        </button>
      </div>

      {/* Powered by */}
      <div className="mt-8 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
        <Sparkles className="h-3.5 w-3.5" />
        Powered by Discogs + Ollama Vision
      </div>
    </div>
  )
}

function ScanningState() {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Animated Scanner */}
      <div className="relative mb-8">
        <div className="flex h-80 w-80 items-center justify-center overflow-hidden rounded-2xl border-2 border-zinc-900 bg-zinc-900/5 dark:border-zinc-100 dark:bg-zinc-100/5">
          <div className="absolute inset-x-4 h-0.5 animate-scan bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
          <Loader2 className="h-12 w-12 animate-spin text-zinc-400" />
        </div>
        {/* Pulsing corners */}
        <div className="absolute -left-1 -top-1 h-6 w-6 animate-pulse border-l-2 border-t-2 border-emerald-500" />
        <div className="absolute -right-1 -top-1 h-6 w-6 animate-pulse border-r-2 border-t-2 border-emerald-500" />
        <div className="absolute -bottom-1 -left-1 h-6 w-6 animate-pulse border-b-2 border-l-2 border-emerald-500" />
        <div className="absolute -bottom-1 -right-1 h-6 w-6 animate-pulse border-b-2 border-r-2 border-emerald-500" />
      </div>

      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Analyzing Cover...
      </h2>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Identifying your record using AI vision
      </p>

      {/* Progress Steps */}
      <div className="mt-6 flex flex-col gap-2 text-left text-sm">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Image captured
        </div>
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing with Ollama Vision...
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <div className="h-4 w-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
          Searching Discogs database
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0%, 100% { top: 1rem; }
          50% { top: calc(100% - 1rem); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

function SuccessState({ record, onReset }: { record: VinylRecord; onReset: () => void }) {
  const { refreshCollection, setActiveScreen } = useVinylCatalog()
  const { data: session } = useSession()
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    setIsAdding(true)
    setError(null)
    try {
      const token = (session as { accessToken?: string })?.accessToken
      
      await api.vinyls.create({
        title: record.title,
        artist: record.artist,
        year: record.year,
        genre: record.genre,
        condition: record.condition,
        coverImageUrl: record.coverUrl,
        discogsId: record.discogs?.releaseId,
      }, token)
      
      refreshCollection()
      setActiveScreen("collection")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add record")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* Success Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>

      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Record Identified!
      </h2>

      {error && (
        <div className="mt-4 w-full rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Record Card */}
      <div className="mt-6 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex gap-4 p-4">
          <div
            className="h-24 w-24 shrink-0 rounded-lg bg-cover bg-center"
            style={{
              backgroundImage: `url(${record.coverUrl})`,
              backgroundColor: "#1a1a2e",
            }}
          />
          <div className="flex flex-1 flex-col">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {record.title}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {record.artist}
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              {record.year} · {record.genre}
            </p>
            <div className="mt-2">
              <ConditionBadge condition={record.condition} />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex w-full flex-col gap-3">
        <button 
          onClick={handleAdd}
          disabled={isAdding}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isAdding ? "Adding..." : "Add to Collection"}
        </button>
        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" />
            Scan Another
          </button>
          {record.discogs && (
            <a
              href={`https://www.discogs.com/release/${record.discogs.releaseId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <ExternalLink className="h-4 w-4" />
              View on Discogs
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
  onReset,
}: {
  message?: string
  onRetry: () => void
  onReset: () => void
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Error Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>

      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Recognition Failed
      </h2>
      <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        {message || "We couldn't identify this record. Please try again."}
      </p>

      {/* Tips */}
      <div className="mt-6 w-full rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-left dark:border-zinc-700 dark:bg-zinc-800/50">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tips for better results:
        </p>
        <ul className="mt-2 space-y-1 text-sm text-zinc-500 dark:text-zinc-400">
          <li>• Ensure good lighting on the cover</li>
          <li>• Avoid glare and reflections</li>
          <li>• Keep the cover flat and centered</li>
          <li>• Include the full cover in frame</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="mt-6 flex w-full gap-3">
        <button
          onClick={onRetry}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
        <button
          onClick={onReset}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
