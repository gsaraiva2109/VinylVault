"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useVinylVault } from "../../context"
import { useRecognition } from "../../../../hooks/use-recognition"
import { ConditionBadge } from "../condition-badge"
import { ManualAddModal } from "../manual-add-modal"
import { useTauriAuth } from "@/lib/tauri-auth"
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
  Check,
  Disc3,
  CloudLightning,
  Music2,
} from "lucide-react"
import type { VinylRecord } from "../../types"

export function ScanScreen() {
  const { state: scanState, captureAndRecognize, reset } = useRecognition()
  const [canUseCamera, setCanUseCamera] = useState<boolean | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showFallback, setShowFallback] = useState(false)
  const [manualAddOpen, setManualAddOpen] = useState(false)
  const capturedBufferRef = useRef<ArrayBuffer | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Camera is available when running inside Tauri or in local dev
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
    const isLocalDev =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168."))
    setCanUseCamera(isTauri || isLocalDev)
  }, [])

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

  // Reset fallback when scan state resets to idle
  useEffect(() => {
    if (scanState.status === "idle") {
      setShowFallback(false)
      capturedBufferRef.current = null
    }
  }, [scanState.status])

  const handleScan = useCallback(() => {
    if (videoRef.current) {
      setShowFallback(false)
      captureAndRecognize(videoRef.current)
    }
  }, [captureAndRecognize])

  const handleCloudAI = useCallback(async () => {
    // Stub: connect to cloud vision endpoint when available
    // capturedBufferRef.current contains the last captured image buffer
    console.warn("Cloud AI endpoint not yet configured")
    setShowFallback(true)
  }, [])

  if (canUseCamera === null) return null

  if (!canUseCamera) {
    return (
      <>
        <WebEmptyState onManualAdd={() => setManualAddOpen(true)} />
        {manualAddOpen && <ManualAddModal onClose={() => setManualAddOpen(false)} />}
      </>
    )
  }

  const isScanning = scanState.status === "scanning"

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT: Immersive Camera Feed ── */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {/* Live video */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            stream ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Camera loading / error state */}
        {!stream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: cameraError
                  ? "rgba(245,47,18,0.10)"
                  : "rgba(255,255,255,0.06)",
              }}
            >
              <Camera
                className="h-9 w-9"
                style={{
                  color: cameraError ? "#f52f12" : "rgba(255,255,255,0.25)",
                }}
              />
            </div>
            <p
              className="max-w-xs text-center text-sm"
              style={{ color: cameraError ? "#f52f12" : "rgba(255,255,255,0.30)" }}
            >
              {cameraError ?? "Starting camera..."}
            </p>
          </div>
        )}

        {/* Scanning line overlay */}
        {isScanning && (
          <div
            className="pointer-events-none absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#28d768] to-transparent"
            style={{ animation: "scanLine 2s ease-in-out infinite" }}
          />
        )}

        {/* Corner brackets */}
        <div className="pointer-events-none absolute inset-6">
          {/* Top-left */}
          <div
            className={`absolute -left-0 -top-0 h-10 w-10 border-l-2 border-t-2 rounded-tl-sm ${isScanning ? "animate-pulse" : ""}`}
            style={{ borderColor: "#28d768" }}
          />
          {/* Top-right */}
          <div
            className={`absolute -right-0 -top-0 h-10 w-10 border-r-2 border-t-2 rounded-tr-sm ${isScanning ? "animate-pulse" : ""}`}
            style={{ borderColor: "#28d768" }}
          />
          {/* Bottom-left */}
          <div
            className={`absolute -bottom-0 -left-0 h-10 w-10 border-b-2 border-l-2 rounded-bl-sm ${isScanning ? "animate-pulse" : ""}`}
            style={{ borderColor: "#28d768" }}
          />
          {/* Bottom-right */}
          <div
            className={`absolute -bottom-0 -right-0 h-10 w-10 border-b-2 border-r-2 rounded-br-sm ${isScanning ? "animate-pulse" : ""}`}
            style={{ borderColor: "#28d768" }}
          />
        </div>

        {/* Shutter button — bottom center */}
        <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
          <button
            onClick={handleScan}
            disabled={!stream || isScanning}
            className="group relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              boxShadow: "0 0 0 3px rgba(255,255,255,0.20), 0 0 0 5px rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(8px)",
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.background = "rgba(40,215,104,0.30)"
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(40,215,104,0.50), 0 0 0 5px rgba(40,215,104,0.15)"
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.10)"
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.20), 0 0 0 5px rgba(255,255,255,0.06)"
            }}
          >
            {isScanning ? (
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/90 transition-transform duration-200 group-hover:scale-95" />
            )}
          </button>
          <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
            {isScanning ? "Analyzing..." : "Take Photo"}
          </p>
        </div>

        {/* Branding badge — bottom right */}
        <div
          className="absolute bottom-8 right-6 flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Sparkles className="h-3 w-3" style={{ color: "#28d768" }} />
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.40)" }}>
            Discogs + Ollama Vision
          </span>
        </div>
      </div>

      {/* ── RIGHT: Info Panel ── */}
      <div
        className="flex w-[340px] shrink-0 flex-col overflow-y-auto"
        style={{
          background: "var(--app-glass)",
          backdropFilter: "blur(28px) saturate(200%)",
          borderLeft: "1px solid var(--app-glass-border)",
        }}
      >
        {scanState.status === "idle" && (
          <IdlePanel hasStream={!!stream} onManualAdd={() => setManualAddOpen(true)} />
        )}
        {scanState.status === "scanning" && (
          <ScanningPanel />
        )}
        {scanState.status === "success" && scanState.scannedRecord && (
          <SuccessPanel
            record={scanState.scannedRecord}
            onReset={reset}
            onCloudAI={handleCloudAI}
          />
        )}
        {scanState.status === "error" && (
          <ErrorPanel
            message={scanState.errorMessage}
            onRetry={handleScan}
            onReset={reset}
            showFallback={showFallback}
            onShowFallback={() => setShowFallback(true)}
            onManualAdd={() => setManualAddOpen(true)}
          />
        )}
      </div>

      {manualAddOpen && <ManualAddModal onClose={() => setManualAddOpen(false)} />}

      {/* Keyframe animations */}
      <style jsx global>{`
        @keyframes scanLine {
          0%, 100% { top: 8%; }
          50% { top: 92%; }
        }
      `}</style>
    </div>
  )
}

// ── Web-only empty state ──────────────────────────────────────────────────────

function WebEmptyState({ onManualAdd }: { onManualAdd: () => void }) {
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
          href="https://github.com/gsaraiva2109/vinyl-vault"
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
        <button
          onClick={onManualAdd}
          className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-colors cursor-pointer"
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.55)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
        >
          <Plus className="h-4 w-4" />
          Add Record Manually
        </button>
      </div>
    </div>
  )
}

// ── Panel: Idle ───────────────────────────────────────────────────────────────

function IdlePanel({ hasStream, onManualAdd }: { hasStream: boolean; onManualAdd: () => void }) {
  return (
    <div className="flex flex-1 flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold" style={{ color: "var(--app-text-1)" }}>
          Vinyl Scanner
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--app-text-3)" }}>
          {hasStream
            ? "Point camera at an album cover and take a photo"
            : "Waiting for camera..."}
        </p>
      </div>

      {/* Cover placeholder */}
      <div
        className="mb-5 flex aspect-square w-full items-center justify-center rounded-xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--app-border)",
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <Disc3 className="h-10 w-10" style={{ color: "rgba(255,255,255,0.12)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
            No record scanned yet
          </span>
        </div>
      </div>

      {/* Placeholder fields */}
      <PlaceholderFields />

      {/* Actions */}
      <div className="mt-auto pt-6 flex flex-col gap-3">
        <GreenPrimaryButton state="idle" onClick={onManualAdd} disabled={!hasStream} />
      </div>
    </div>
  )
}

// ── Panel: Scanning ───────────────────────────────────────────────────────────

function ScanningPanel() {
  return (
    <div className="flex flex-1 flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold" style={{ color: "var(--app-text-1)" }}>
          Analyzing Cover...
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--app-text-3)" }}>
          AI is identifying your record
        </p>
      </div>

      {/* Cover placeholder (dimmed) */}
      <div
        className="mb-5 flex aspect-square w-full items-center justify-center rounded-xl opacity-40"
        style={{
          background: "rgba(40,215,104,0.04)",
          border: "1px solid rgba(40,215,104,0.12)",
        }}
      >
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#28d768" }} />
      </div>

      {/* Skeleton fields */}
      <PlaceholderFields dimmed />

      {/* Step progress */}
      <div className="mt-6 flex flex-col gap-2.5">
        <StepRow label="Image captured" done />
        <StepRow label="Processing with Ollama Vision..." active />
        <StepRow label="Searching Discogs database" pending />
      </div>

      {/* Actions (disabled) */}
      <div className="mt-auto pt-6 flex flex-col gap-3">
        <GreenPrimaryButton state="scanning" onClick={() => {}} disabled />
      </div>
    </div>
  )
}

// ── Panel: Success ────────────────────────────────────────────────────────────

function SuccessPanel({
  record,
  onReset,
  onCloudAI,
}: {
  record: VinylRecord
  onReset: () => void
  onCloudAI: () => void
}) {
  const { refreshCollection, setActiveScreen } = useVinylVault()
  const { accessToken: token } = useTauriAuth()
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setIsAdding(true)
    setError(null)
    try {
      const payload = {
        title: record.title,
        artist: record.artist,
        year: record.year,
        genre: record.genre,
        condition: record.condition,
        coverImageUrl: record.coverUrl,
        discogsId: record.discogs?.releaseId ? String(record.discogs.releaseId) : null,
        discogsUrl: record.discogsUrl || null,
        spotifyUrl: record.spotify?.albumId ? `https://open.spotify.com/album/${record.spotify.albumId}` : null,
      }
      console.log("Confirming vinyl with payload:", payload)
      await api.vinyls.create(payload, token ?? undefined)
      refreshCollection()
      setActiveScreen("collection")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add record")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(40,215,104,0.12)" }}
        >
          <CheckCircle2 className="h-4 w-4" style={{ color: "#28d768" }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-tight" style={{ color: "var(--app-text-1)" }}>
            Record Identified
          </h2>
          <p className="text-xs" style={{ color: "var(--app-text-3)" }}>
            Verify the details below
          </p>
        </div>
      </div>

      {/* Album cover */}
      <div
        className="mb-5 aspect-square w-full overflow-hidden rounded-xl bg-cover bg-center"
        style={{
          backgroundImage: record.coverUrl ? `url(${record.coverUrl})` : undefined,
          background: record.coverUrl ? undefined : "#1a1a1a",
          border: "1px solid var(--app-border)",
        }}
      >
        {!record.coverUrl && (
          <div className="flex h-full items-center justify-center">
            <Music2 className="h-10 w-10" style={{ color: "rgba(255,255,255,0.15)" }} />
          </div>
        )}
      </div>

      {/* Filled fields */}
      <div className="flex flex-col gap-3">
        <RecordField label="Title" value={record.title} />
        <RecordField label="Artist" value={record.artist} />
        <div className="grid grid-cols-2 gap-3">
          <RecordField label="Year" value={String(record.year)} />
          <RecordField label="Genre" value={record.genre} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--app-text-3)" }}>
            Condition
          </p>
          <ConditionBadge condition={record.condition} />
        </div>
      </div>

      {error && (
        <div
          className="mt-4 rounded-lg p-3 text-sm"
          style={{
            background: "rgba(245,47,18,0.08)",
            color: "#f52f12",
            border: "1px solid rgba(245,47,18,0.18)",
          }}
        >
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto pt-6 flex flex-col gap-3">
        <GreenPrimaryButton state="success" onClick={handleConfirm} disabled={isAdding} isLoading={isAdding} />

        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors cursor-pointer"
            style={{
              border: "1px solid var(--app-border)",
              color: "var(--app-text-2)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--app-text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--app-text-2)")}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Scan Again
          </button>

          {record.discogs && (
            <a
              href={record.discogsUrl || `https://www.discogs.com/release/${record.discogs.releaseId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors cursor-pointer"
              style={{
                border: "1px solid var(--app-border)",
                color: "var(--app-text-2)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--app-text-1)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--app-text-2)")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Discogs
            </a>
          )}
        </div>

        {/* Cloud AI fallback link */}
        <button
          onClick={onCloudAI}
          className="flex items-center justify-center gap-1.5 py-1 text-xs transition-opacity cursor-pointer opacity-50 hover:opacity-80"
          style={{ color: "var(--app-text-3)" }}
        >
          <CloudLightning className="h-3 w-3" />
          Incorrect data? Try Cloud AI
        </button>
      </div>
    </div>
  )
}

// ── Panel: Error / Fallback ───────────────────────────────────────────────────

function ErrorPanel({
  message,
  onRetry,
  onReset,
  showFallback,
  onShowFallback,
  onManualAdd,
}: {
  message?: string
  onRetry: () => void
  onReset: () => void
  showFallback: boolean
  onShowFallback: () => void
  onManualAdd: () => void
}) {
  return (
    <div className="flex flex-1 flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(245,47,18,0.10)" }}
        >
          <XCircle className="h-4 w-4" style={{ color: "#f52f12" }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-tight" style={{ color: "var(--app-text-1)" }}>
            {showFallback ? "Cloud AI Analysis" : "Recognition Failed"}
          </h2>
          <p className="text-xs" style={{ color: "var(--app-text-3)" }}>
            {showFallback ? "Deeper analysis via cloud model" : "Could not identify this record"}
          </p>
        </div>
      </div>

      {/* Cover placeholder */}
      <div
        className="mb-5 flex aspect-square w-full items-center justify-center rounded-xl"
        style={{
          background: "rgba(245,47,18,0.04)",
          border: "1px solid rgba(245,47,18,0.10)",
        }}
      >
        <XCircle className="h-10 w-10" style={{ color: "rgba(245,47,18,0.25)" }} />
      </div>

      {/* Error message */}
      {!showFallback && (
        <div
          className="mb-4 rounded-xl p-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--app-border)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--app-text-2)" }}>
            {message || "We couldn't identify this record. Please try again."}
          </p>
          <ul className="mt-3 space-y-1 text-xs" style={{ color: "var(--app-text-3)" }}>
            <li>• Ensure good lighting on the cover</li>
            <li>• Avoid glare and reflections</li>
            <li>• Keep the cover flat and centered</li>
          </ul>
        </div>
      )}

      {showFallback && (
        <div
          className="mb-4 rounded-xl p-4"
          style={{
            background: "rgba(40,215,104,0.04)",
            border: "1px solid rgba(40,215,104,0.12)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--app-text-2)" }}>
            Cloud AI will perform a deeper visual analysis of your album cover using an online model.
          </p>
          <p className="mt-2 text-xs" style={{ color: "var(--app-text-3)" }}>
            Note: Cloud AI endpoint is not yet configured.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto flex flex-col gap-3">
        {/* Primary: Manually Add */}
        <GreenPrimaryButton state="idle" onClick={onManualAdd} />

        {/* Cloud AI button */}
        {!showFallback ? (
          <button
            onClick={onShowFallback}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer"
            style={{
              border: "1px solid rgba(40,215,104,0.30)",
              color: "#28d768",
              background: "rgba(40,215,104,0.05)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(40,215,104,0.10)"
              e.currentTarget.style.borderColor = "rgba(40,215,104,0.50)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(40,215,104,0.05)"
              e.currentTarget.style.borderColor = "rgba(40,215,104,0.30)"
            }}
          >
            <CloudLightning className="h-4 w-4" />
            Try Cloud AI Analysis
          </button>
        ) : (
          <button
            onClick={() => {}}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer opacity-50"
            style={{
              border: "1px solid rgba(40,215,104,0.30)",
              color: "#28d768",
              background: "rgba(40,215,104,0.05)",
            }}
          >
            <CloudLightning className="h-4 w-4" />
            Cloud AI Not Configured
          </button>
        )}

        {/* Try Again / Cancel row */}
        <div className="flex gap-2">
          <button
            onClick={onRetry}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors cursor-pointer"
            style={{
              border: "1px solid var(--app-border)",
              color: "var(--app-text-2)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--app-text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--app-text-2)")}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
          <button
            onClick={onReset}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors cursor-pointer"
            style={{
              border: "1px solid var(--app-border)",
              color: "var(--app-text-2)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--app-text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--app-text-2)")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Shared Sub-components ─────────────────────────────────────────────────────

type PrimaryBtnState = "idle" | "scanning" | "success"

function GreenPrimaryButton({
  state,
  onClick,
  disabled,
  isLoading,
}: {
  state: PrimaryBtnState
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
}) {
  const config = {
    idle: { icon: <Plus className="h-4 w-4" />, label: "Manually Add Record" },
    scanning: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      label: "Scanning...",
    },
    success: {
      icon: isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Check className="h-4 w-4" />
      ),
      label: isLoading ? "Adding..." : "Confirm & Add",
    },
  }

  const { icon, label } = config[state]

  return (
    <button
      onClick={onClick}
      disabled={disabled || state === "scanning"}
      className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ background: "#28d768", color: "#0a0a0a" }}
      onMouseEnter={(e) => {
        if (!e.currentTarget.disabled) e.currentTarget.style.background = "#22c55e"
      }}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#28d768")}
    >
      {icon}
      {label}
    </button>
  )
}

function PlaceholderFields({ dimmed = false }: { dimmed?: boolean }) {
  const opacity = dimmed ? 0.4 : 1

  return (
    <div className="flex flex-col gap-3" style={{ opacity, transition: "opacity 0.3s" }}>
      <SkeletonField label="Title" wide />
      <SkeletonField label="Artist" />
      <div className="grid grid-cols-2 gap-3">
        <SkeletonField label="Year" narrow />
        <SkeletonField label="Genre" narrow />
      </div>
      <SkeletonField label="Condition" narrow />
    </div>
  )
}

function SkeletonField({
  label,
  wide,
  narrow,
}: {
  label: string
  wide?: boolean
  narrow?: boolean
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--app-text-3)" }}>
        {label}
      </p>
      <div
        className={`h-8 rounded-lg ${wide ? "w-full" : narrow ? "w-3/4" : "w-5/6"}`}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--app-border)",
        }}
      />
    </div>
  )
}

function RecordField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--app-text-3)" }}>
        {label}
      </p>
      <div
        className="flex h-8 items-center rounded-lg px-3"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--app-border)",
        }}
      >
        <span className="truncate text-sm" style={{ color: "var(--app-text-1)" }}>
          {value}
        </span>
      </div>
    </div>
  )
}

function StepRow({
  label,
  done,
  active,
  pending,
}: {
  label: string
  done?: boolean
  active?: boolean
  pending?: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done && <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#28d768" }} />}
      {active && <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: "#28d768" }} />}
      {pending && (
        <div
          className="h-4 w-4 shrink-0 rounded-full border-2"
          style={{ borderColor: "rgba(255,255,255,0.15)" }}
        />
      )}
      <span
        style={{
          color: done || active ? "var(--app-text-1)" : "var(--app-text-3)",
        }}
      >
        {label}
      </span>
    </div>
  )
}
