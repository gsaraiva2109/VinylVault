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
  const [canUseCamera, setCanUseCamera] = useState<boolean | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const isElectron =
      typeof navigator !== "undefined" &&
      navigator.userAgent.toLowerCase().includes("electron")
    const isLocalDev =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168."))
    setCanUseCamera(isElectron || isLocalDev)
  }, [])

  // Start camera when access is confirmed
  useEffect(() => {
    if (!canUseCamera) return

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
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Camera access denied"
        setCameraError(
          msg.includes("Permission") || msg.includes("NotAllowed")
            ? "Camera permission denied. Please allow camera access in your browser settings."
            : "Could not start camera. Make sure no other app is using it."
        )
      })

    return () => {
      active = false
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [canUseCamera])

  const handleScan = useCallback(() => {
    if (videoRef.current) {
      captureAndRecognize(videoRef.current)
    }
  }, [captureAndRecognize])

  if (canUseCamera === null) {
    return null // Prevent hydration flash
  }

  if (!canUseCamera) {
    return <WebEmptyState />
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {scanState.status === "idle" && (
          <IdleState onScan={handleScan} videoRef={videoRef} hasStream={!!stream} cameraError={cameraError} />
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
      <div
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <MonitorDown className="h-10 w-10 text-white/30" />
      </div>

      <h2 className="text-2xl font-bold text-white/90">Desktop App Required</h2>

      <p className="mt-4 max-w-sm text-sm text-white/40">
        The AI Vinyl Scanner relies on local CPU and GPU processing to run vision models for album
        art recognition. Because you are on the web version, this feature is disabled.
      </p>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        <a
          href="https://github.com/gsaraiva2109/vinyl-catalog"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-semibold transition-colors cursor-pointer"
          style={{ background: "#28d768", color: "#0a0a0a" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#22c55e")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#28d768")}
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
  cameraError,
}: {
  onScan: () => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  hasStream: boolean
  cameraError: string | null
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Viewfinder */}
      <div className="relative mb-8">
        <div
          className="relative flex h-80 w-80 items-center justify-center overflow-hidden rounded-2xl"
          style={{
            background: "#0a0a0a",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          {!hasStream && (
            <div className="flex flex-col items-center gap-3 px-4 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: cameraError ? "rgba(245,47,18,0.10)" : "rgba(255,255,255,0.06)",
                }}
              >
                <Camera
                  className="h-8 w-8"
                  style={{ color: cameraError ? "#f52f12" : "rgba(255,255,255,0.30)" }}
                />
              </div>
              <p className="text-sm" style={{ color: cameraError ? "#f52f12" : "rgba(255,255,255,0.35)" }}>
                {cameraError ?? "Camera starting..."}
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
        <div className="absolute -left-1 -top-1 h-6 w-6 border-l-2 border-t-2" style={{ borderColor: "#28d768" }} />
        <div className="absolute -right-1 -top-1 h-6 w-6 border-r-2 border-t-2" style={{ borderColor: "#28d768" }} />
        <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-2 border-l-2" style={{ borderColor: "#28d768" }} />
        <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-2 border-r-2" style={{ borderColor: "#28d768" }} />
      </div>

      <h2 className="text-xl font-semibold text-white/90">Scan Your Record</h2>
      <p className="mt-2 max-w-sm text-sm text-white/40">
        Take a photo of your vinyl cover to automatically identify and catalog it using AI
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onScan}
          disabled={!hasStream}
          className="flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-semibold transition-all cursor-pointer disabled:opacity-40"
          style={{ background: "#28d768", color: "#0a0a0a" }}
          onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = "#22c55e")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#28d768")}
        >
          <Camera className="h-5 w-5" />
          Take Photo
        </button>
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-white/25">
        <Sparkles className="h-3.5 w-3.5" />
        Powered by Discogs + Ollama Vision
      </div>
    </div>
  )
}

function ScanningState() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-8">
        <div
          className="flex h-80 w-80 items-center justify-center overflow-hidden rounded-2xl"
          style={{
            background: "rgba(40,215,104,0.04)",
            border: "1px solid rgba(40,215,104,0.15)",
          }}
        >
          <div className="absolute inset-x-4 h-0.5 animate-scan bg-gradient-to-r from-transparent via-[#28d768] to-transparent" />
          <Loader2 className="h-12 w-12 animate-spin text-white/20" />
        </div>
        {/* Pulsing green corners */}
        <div className="absolute -left-1 -top-1 h-6 w-6 animate-pulse border-l-2 border-t-2" style={{ borderColor: "#28d768" }} />
        <div className="absolute -right-1 -top-1 h-6 w-6 animate-pulse border-r-2 border-t-2" style={{ borderColor: "#28d768" }} />
        <div className="absolute -bottom-1 -left-1 h-6 w-6 animate-pulse border-b-2 border-l-2" style={{ borderColor: "#28d768" }} />
        <div className="absolute -bottom-1 -right-1 h-6 w-6 animate-pulse border-b-2 border-r-2" style={{ borderColor: "#28d768" }} />
      </div>

      <h2 className="text-xl font-semibold text-white/90">Analyzing Cover...</h2>
      <p className="mt-2 text-sm text-white/40">Identifying your record using AI vision</p>

      <div className="mt-6 flex flex-col gap-2 text-left text-sm">
        <div className="flex items-center gap-2" style={{ color: "#28d768" }}>
          <CheckCircle2 className="h-4 w-4" />
          Image captured
        </div>
        <div className="flex items-center gap-2" style={{ color: "#28d768" }}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing with Ollama Vision...
        </div>
        <div className="flex items-center gap-2 text-white/25">
          <div className="h-4 w-4 rounded-full border-2" style={{ borderColor: "rgba(255,255,255,0.15)" }} />
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

      await api.vinyls.create(
        {
          title: record.title,
          artist: record.artist,
          year: record.year,
          genre: record.genre,
          condition: record.condition,
          coverImageUrl: record.coverUrl,
          discogsId: record.discogs?.releaseId,
        },
        token
      )

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
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: "rgba(40,215,104,0.12)" }}
      >
        <CheckCircle2 className="h-8 w-8" style={{ color: "#28d768" }} />
      </div>

      <h2 className="text-xl font-semibold text-white/90">Record Identified!</h2>

      {error && (
        <div
          className="mt-4 w-full rounded-lg p-3 text-sm"
          style={{
            background: "rgba(245,47,18,0.08)",
            color: "#f52f12",
            border: "1px solid rgba(245,47,18,0.18)",
          }}
        >
          {error}
        </div>
      )}

      {/* Record card */}
      <div
        className="mt-6 w-full overflow-hidden rounded-xl"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex gap-4 p-4">
          <div
            className="h-24 w-24 shrink-0 rounded-lg bg-cover bg-center"
            style={{
              backgroundImage: `url(${record.coverUrl})`,
              backgroundColor: "#1a1a1a",
            }}
          />
          <div className="flex flex-1 flex-col">
            <h3 className="font-semibold text-white/90">{record.title}</h3>
            <p className="text-sm text-white/50">{record.artist}</p>
            <p className="mt-1 text-xs text-white/30">
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
          className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40"
          style={{ background: "#28d768", color: "#0a0a0a" }}
          onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = "#22c55e")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#28d768")}
        >
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {isAdding ? "Adding..." : "Add to Collection"}
        </button>
        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white/50 transition-colors cursor-pointer"
            style={{ border: "1px solid rgba(255,255,255,0.09)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.80)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.50)")}
          >
            <RefreshCw className="h-4 w-4" />
            Scan Another
          </button>
          {record.discogs && (
            <a
              href={`https://www.discogs.com/release/${record.discogs.releaseId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white/50 transition-colors cursor-pointer"
              style={{ border: "1px solid rgba(255,255,255,0.09)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.80)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.50)")}
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
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: "rgba(245,47,18,0.10)" }}
      >
        <XCircle className="h-8 w-8" style={{ color: "#f52f12" }} />
      </div>

      <h2 className="text-xl font-semibold text-white/90">Recognition Failed</h2>
      <p className="mt-2 max-w-sm text-sm text-white/40">
        {message || "We couldn't identify this record. Please try again."}
      </p>

      {/* Tips */}
      <div
        className="mt-6 w-full rounded-xl p-4 text-left"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <p className="text-sm font-medium text-white/65">Tips for better results:</p>
        <ul className="mt-2 space-y-1 text-sm text-white/35">
          <li>• Ensure good lighting on the cover</li>
          <li>• Avoid glare and reflections</li>
          <li>• Keep the cover flat and centered</li>
          <li>• Include the full cover in frame</li>
        </ul>
      </div>

      <div className="mt-6 flex w-full gap-3">
        <button
          onClick={onRetry}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-colors cursor-pointer"
          style={{ background: "#28d768", color: "#0a0a0a" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#22c55e")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#28d768")}
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
        <button
          onClick={onReset}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white/50 transition-colors cursor-pointer"
          style={{ border: "1px solid rgba(255,255,255,0.09)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.80)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.50)")}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
