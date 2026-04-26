"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import { useVinylVault } from "../../context"
import { useRecognition } from "../../../../hooks/use-recognition"
import { ManualAddModal } from "../manual-add-modal"
import { api, ConflictError } from "@/lib/api"
import ReactCrop, { type Crop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
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
  SquareDashedMousePointer
} from "lucide-react"
import type { VinylRecord } from "../../types"
import { VinylCard } from "@/components/ui/vinyl-card"
import { useCameraContext } from "../../context/camera-context"

export function ScanScreen() {
  const { addScanError } = useVinylVault()
  const { state: scanState, captureFromVideo, recognizeFromCrop, retryWithCloud, retryWithSameImage, setStatus, selectCandidate, reset } = useRecognition(addScanError)
  const { stream, canUseCamera } = useCameraContext()
  const [flash, setFlash] = useState(false)
  const [manualAddOpen, setManualAddOpen] = useState(false)
  const [aiProvider, setAiProvider] = useState<"auto" | "local" | "cloud">("cloud")
  const [cloudConfigured, setCloudConfigured] = useState(false)
  const [scanningWithCloud, setScanningWithCloud] = useState(false)
  const [localMaxDim, setLocalMaxDim] = useState(512)
  const [cloudMaxDim, setCloudMaxDim] = useState(1024)
  const capturedBufferRef = useRef<ArrayBuffer | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Read AI provider settings + cloud key status on mount
  useEffect(() => {
    async function loadAiConfig() {
      try {
        const { invoke } = await import("@tauri-apps/api/core")
        const settings = await invoke<{
          llm: { provider: string; cloudProvider: string; localMaxDim?: number; cloudMaxDim?: number }
        }>("read_settings")
        setAiProvider(settings.llm.provider as "auto" | "local" | "cloud")
        setLocalMaxDim(settings.llm.localMaxDim ?? 512)
        setCloudMaxDim(settings.llm.cloudMaxDim ?? 1024)
        const cloudKey = settings.llm.cloudProvider === "gemini" ? "gemini" : "openai"
        const isSet = await invoke<boolean>("check_api_key", { provider: cloudKey })
        setCloudConfigured(isSet)
      } catch { /* not in Tauri context */ }
    }
    loadAiConfig()
  }, [])

  // Reset cloud-retry flag when scan resolves (error or success)
  useEffect(() => {
    if (scanState.status === "error" || scanState.status === "success" || scanState.status === "idle") {
      setScanningWithCloud(false)
    }
  }, [scanState.status])

  const handleRetryWithCloud = useCallback(() => {
    setScanningWithCloud(true)
    retryWithCloud()
  }, [retryWithCloud])

  // Retry recognition on the same captured frame, re-reading the current maxDim setting.
  // The image size dropdowns write to Tauri settings; this fn re-reads them before re-scaling.
  const handleRetryWithSameImage = useCallback(() => {
    const provider = scanningWithCloud ? "cloud" : aiProvider !== "auto" ? aiProvider : undefined
    retryWithSameImage(provider)
  }, [retryWithSameImage, scanningWithCloud, aiProvider])

  const handleChangeImageSize = useCallback(async (type: "local" | "cloud", dim: number) => {
    if (type === "local") setLocalMaxDim(dim)
    else setCloudMaxDim(dim)
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      const current = await invoke<{
        ocr: { enabled: boolean; threshold: number }
        llm: { provider: string; ollamaModel: string; cloudProvider: string; cloudModel: string; localMaxDim?: number; cloudMaxDim?: number }
      }>("read_settings")
      await invoke("write_settings", {
        settings: {
          ...current,
          llm: {
            ...current.llm,
            localMaxDim: type === "local" ? dim : (current.llm.localMaxDim ?? 512),
            cloudMaxDim: type === "cloud" ? dim : (current.llm.cloudMaxDim ?? 1024),
          },
        },
      })
    } catch { /* ignore */ }
  }, [])

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // Reset captured buffer when scan state resets to idle
  useEffect(() => {
    if (scanState.status === "idle") {
      capturedBufferRef.current = null
    }
  }, [scanState.status])

  const playShutterSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return
      
      const ctx = new AudioContextClass()
      // Mechanical snap pop
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = "square"
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      // Pitch drop
      osc.frequency.setValueAtTime(150, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05)
      
      // Amplitude envelope
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
      
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.1)
      
      // Haptic
      if (navigator.vibrate) {
        navigator.vibrate([30])
      }
    } catch { /* Suppress audio context errors */ }
  }, [])

  const handleScan = useCallback(() => {
    if (videoRef.current) {
      playShutterSound()
      setFlash(true)
      setTimeout(() => setFlash(false), 200)
      captureFromVideo(videoRef.current, aiProvider !== "auto" ? aiProvider : undefined)
    }
  }, [captureFromVideo, playShutterSound, aiProvider])

  // Global Spacebar listener for capturing frame
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && scanState.status === "idle" && stream) {
        e.preventDefault()
        handleScan()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [scanState.status, stream, handleScan])


  if (canUseCamera === null) return null

  if (!canUseCamera) {
    return (
      <>
        <WebEmptyState onManualAdd={() => setManualAddOpen(true)} />
        {manualAddOpen && <ManualAddModal onClose={() => setManualAddOpen(false)} />}
      </>
    )
  }

  const isScanning = scanState.status === "scanning" || scanState.status === "selecting"

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
            stream && scanState.status === "idle" ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Retina Flash Overlay */}
        <div 
          className="pointer-events-none absolute inset-0 z-40 bg-white transition-opacity duration-200"
          style={{ opacity: flash ? 1 : 0 }} 
        />

        {/* Film Grain Texture Overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-30 mix-blend-overlay opacity-30"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
          }}
        />

        {/* Frozen Captured Image Overlay / Fullscreen Crop */}
        {scanState.rawImageUrl && scanState.status !== "idle" && (
           <div className="absolute inset-0 z-20 flex bg-black transition-opacity duration-500">
             {scanState.status === "cropping" ? (
               <CropPanel
                 rawImageUrl={scanState.rawImageUrl}
                 onApplyCrop={(blob, dataUrl, rawImageUrl) =>
                   recognizeFromCrop(blob, dataUrl, rawImageUrl, aiProvider !== "auto" ? aiProvider : undefined)
                 }
                 onCancel={() => setStatus("error")}
               />
             ) : (
               <div className="relative h-full w-full flex items-center justify-center">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={scanState.rawImageUrl} className="absolute inset-0 h-full w-full object-cover opacity-60" alt="Captured Frame" />
                 {scanState.status === "scanning" && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="relative aspect-square h-[60%] border-2 border-[#28d768] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] animate-pulse" />
                   </div>
                 )}
               </div>
             )}
           </div>
        )}

        {/* Action Panels Overlays (Selection / Success) */}
        {scanState.status === "selecting" && scanState.candidates && (
          <SelectionPanel
            candidates={scanState.candidates}
            onSelect={selectCandidate}
            onReset={reset}
            canTryCloud={aiProvider !== "cloud" && cloudConfigured && !scanningWithCloud}
            onTryCloud={handleRetryWithCloud}
          />
        )}
        {scanState.status === "success" && scanState.scannedRecord && (
          <SuccessPanel
            record={scanState.scannedRecord}
            onReset={reset}
          />
        )}

        {/* Camera loading / error state */}
        {!stream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: "rgba(255,255,255,0.06)",
              }}
            >
              <Camera
                className="h-9 w-9"
                style={{
                  color: "rgba(255,255,255,0.25)",
                }}
              />
            </div>
            <p
              className="max-w-xs text-center text-sm"
              style={{ color: "rgba(255,255,255,0.30)" }}
            >
              Starting camera...
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
          className="absolute bottom-8 right-8 flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Sparkles className="h-3 w-3" style={{ color: "#28d768" }} />
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.40)" }}>
            {aiProvider === "cloud" ? "Discogs + Cloud AI" : aiProvider === "local" ? "Discogs + Ollama Vision" : "Discogs + AI Vision"}
          </span>
        </div>
      </div>

      {/* ── RIGHT: Info Panel ── */}
      <div
        className="flex w-full max-w-[340px] shrink-0 flex-col overflow-y-auto"
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
          <ScanningPanel
             rawImageUrl={scanState.rawImageUrl}
             onAdjustCrop={() => setStatus("cropping")}
             aiProvider={scanningWithCloud ? "cloud" : aiProvider}
          />
        )}
        {/* Overlays were moved to the fullscreen left overlay */}
        {scanState.status === "error" && (
          <ErrorPanel
            message={scanState.errorMessage}
            capturedImage={scanState.capturedImage}
            hasCapturedImage={!!scanState.capturedImage || !!scanState.rawImageUrl}
            hasRawImage={!!scanState.rawImageUrl}
            onRetry={handleRetryWithSameImage}
            onNewScan={handleScan}
            onReset={reset}
            aiProvider={scanningWithCloud ? "cloud" : aiProvider}
            cloudConfigured={cloudConfigured}
            onRetryWithCloud={handleRetryWithCloud}
            onManualAdd={() => setManualAddOpen(true)}
            onAdjustCrop={() => setStatus("cropping")}
            localMaxDim={localMaxDim}
            cloudMaxDim={cloudMaxDim}
            onChangeImageSize={handleChangeImageSize}
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
          href="https://github.com/gsaraiva2109/VinylVault/releases"
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

function ScanningPanel({
  rawImageUrl,
  onAdjustCrop,
  aiProvider,
}: {
  rawImageUrl?: string
  onAdjustCrop?: () => void
  aiProvider?: "auto" | "local" | "cloud"
}) {
  const processingLabel =
    aiProvider === "cloud" ? "Processing with Cloud AI..." :
    aiProvider === "local" ? "Processing with Ollama Vision..." :
    "Processing with AI Vision..."
  return (
    <div className="flex flex-1 flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(40,215,104,0.12)" }}
        >
          <Camera className="h-4 w-4" style={{ color: "#28d768" }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-tight" style={{ color: "var(--app-text-1)" }}>
            Analyzing Cover
          </h2>
          <p className="text-xs" style={{ color: "var(--app-text-3)" }}>
            Hold still while we scan
          </p>
        </div>
      </div>

      {/* Processing Loader */}
      <div className="flex justify-center py-6">
        <Loader2 
          className="h-10 w-10 animate-spin" 
          style={{ 
            color: "#28d768",
            filter: "drop-shadow(0 0 12px rgba(40,215,104,0.6))"
          }} 
        />
      </div>

      {/* Step progress */}
      <div className="flex flex-col gap-2.5">
        <StepRow label="Image captured" done />
        <StepRow label={processingLabel} active />
        <StepRow label="Searching Discogs database" pending />
      </div>

      {/* Actions */}
      <div className="mt-auto pt-6 flex flex-col gap-3">
        {onAdjustCrop && rawImageUrl && (
          <button
            onClick={onAdjustCrop}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#28d768]/30 bg-[#28d768]/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#28d768] transition-colors hover:bg-[#28d768]/20"
          >
            <SquareDashedMousePointer className="h-4 w-4" />
            Wait, I&apos;ll Manually Crop
          </button>
        )}
      </div>
    </div>
  )
}

// ── Panel: Selection ─────────────────────────────────────────────────────────

function SelectionPanel({
  candidates,
  onSelect,
  onReset,
  canTryCloud,
  onTryCloud,
}: {
  candidates: VinylRecord[]
  onSelect: (record: VinylRecord) => void
  onReset: () => void
  canTryCloud?: boolean
  onTryCloud?: () => void
}) {
  // Enter key to confirm selection implicitly if confident, but wait, SuccessPanel handles final enter.
  // We can let SelectionPanel use Enter for selecting the first candidate.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && candidates.length > 0) {
        e.preventDefault()
        onSelect(candidates[0])
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [candidates, onSelect])

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-6 backdrop-blur-md">
      {/* Header */}
      <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-3xl font-black uppercase tracking-widest text-[#28d768] drop-shadow-[0_0_15px_rgba(40,215,104,0.4)]">
          Select Match
        </h2>
        <p className="mt-2 text-sm font-medium uppercase tracking-widest text-white/50">
          {candidates.length} potential matches {candidates.length === 1 ? 'was' : 'were'} identified
        </p>
      </div>

      {/* Cards container */}
      <div className="flex w-full max-w-[90vw] snap-x snap-mandatory items-center justify-start gap-8 overflow-x-auto px-8 py-8 sm:justify-center animate-in fade-in zoom-in-95 fill-mode-both duration-700 delay-150 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {candidates.map((record, i) => (
          <div key={record.id} className="snap-center shrink-0">
            <VinylCard
              imageUrl={record.coverUrl || ""}
              title={record.title}
              artist={record.artist}
              year={record.year}
              rank={i + 1}
              stats={[
                { label: "Year", value: record.year || "N/A" },
                { label: "Genre", value: record.genre || "N/A" },
              ]}
              actionLabel="Select Record"
              onActionClick={() => onSelect(record)}
            />
          </div>
        ))}
      </div>

      {/* Secondary Actions */}
      <div className="mt-8 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-500 delay-300">
        {canTryCloud && onTryCloud && (
          <button
            onClick={onTryCloud}
            className="flex items-center justify-center gap-2 rounded-full border border-[#28d768]/40 bg-[#28d768]/10 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-[#28d768]/70 transition-all hover:border-[#28d768] hover:bg-[#28d768]/20 hover:text-[#28d768] hover:shadow-[0_0_15px_rgba(40,215,104,0.3)] cursor-pointer"
          >
            <CloudLightning className="h-4 w-4" />
            None match — Try Cloud AI
          </button>
        )}
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white/50 transition-all hover:border-[#f87171] hover:bg-[#f87171]/20 hover:text-[#f87171] hover:shadow-[0_0_15px_rgba(248,113,113,0.3)] cursor-pointer"
        >
          <XCircle className="h-4 w-4" />
          Deny all options
        </button>
      </div>
    </div>
  )
}

// ── Panel: Success ────────────────────────────────────────────────────────────

function SuccessPanel({
  record,
  onReset,
}: {
  record: VinylRecord
  onReset: () => void
}) {
  const { refreshCollection, setActiveScreen, isDemo, addLocalRecord } = useVinylVault()
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trashedRecord, setTrashedRecord] = useState<{ id: number; title: string; artist: string } | null>(null)

  // Full condition ladder, worst → best so common grades (VG, VG+) sit in the middle
  const CONDITIONS: VinylRecord["condition"][] = ["P", "F", "G", "G+", "VG", "VG+", "NM", "M"]
  const [selectedCondition, setSelectedCondition] = useState(record.condition || "VG")

  const getFreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      return await invoke<string | null>("get_access_token")
    } catch { return null }
  }, [])

  const handleConfirm = useCallback(async () => {
    setIsAdding(true)
    setError(null)
    setTrashedRecord(null)
    try {
      // If scan-time enrichment missed Spotify (e.g. user selected non-first candidate),
      // attempt a last-chance lookup via Tauri keyring before persisting.
      let spotifyUrl = record.spotify?.albumId
        ? `https://open.spotify.com/album/${record.spotify.albumId}`
        : null
      if (!spotifyUrl) {
        try {
          const { invoke: inv } = await import("@tauri-apps/api/core")
          const q = `${record.artist} ${record.title}`.trim()
          const spotData = await inv<{ albumId: string }>("spotify_search", { q })
          if (spotData.albumId) spotifyUrl = `https://open.spotify.com/album/${spotData.albumId}`
        } catch { /* not in Tauri or keys not configured — skip */ }
      }

      // Demo users: persist locally and surface that this record won't sync.
      if (isDemo) {
        addLocalRecord({
          title: record.title,
          artist: record.artist,
          year: record.year,
          genre: record.genre,
          condition: selectedCondition,
          coverUrl: record.coverUrl,
          dateAdded: new Date().toISOString().split("T")[0],
          discogsUrl: record.discogsUrl,
          discogs: record.discogs,
          spotify: spotifyUrl
            ? { albumId: spotifyUrl.split("/album/")[1] ?? "" }
            : undefined,
        })

        toast.success("Saved locally on this device only", {
          description:
            "Demo mode — sign in with a full account to save to the shared collection.",
          duration: 4500,
        })

        refreshCollection()
        setActiveScreen("collection")
        return
      }

      const freshToken = await getFreshToken()
      const payload = {
        title: record.title,
        artist: record.artist,
        year: record.year,
        genre: record.genre,
        condition: selectedCondition,
        coverImageUrl: record.coverUrl,
        discogsId: record.discogs?.releaseId ? String(record.discogs.releaseId) : null,
        discogsUrl: record.discogsUrl || null,
        spotifyUrl,
      }
      await api.vinyls.create(payload, freshToken ?? undefined)

      // Trigger price sync immediately after adding so the collection value
      // updates without waiting for the next scheduled run.
      try {
        await api.discogs.refreshPrices(freshToken ?? undefined)
      } catch { /* price sync is best-effort — don't block navigation */ }

      try {
        const { invoke } = await import("@tauri-apps/api/core")
        await invoke("log_scan_success", { artist: record.artist, album: record.title, source: "manual-confirm" })
      } catch { /* not in Tauri or log failed — ignore */ }

      refreshCollection()
      setActiveScreen("collection")
    } catch (err) {
      if (err instanceof ConflictError && err.trashedRecord) {
        setTrashedRecord(err.trashedRecord)
      } else {
        setError(err instanceof Error ? err.message : "Failed to add record")
      }
    } finally {
      setIsAdding(false)
    }
  }, [record, selectedCondition, getFreshToken, refreshCollection, setActiveScreen, isDemo, addLocalRecord])

  const handleRestoreFromTrash = useCallback(async () => {
    if (!trashedRecord) return
    setIsAdding(true)
    setError(null)
    try {
      const freshToken = await getFreshToken()
      await api.vinyls.recover(trashedRecord.id, freshToken ?? undefined)

      try {
        const { invoke } = await import("@tauri-apps/api/core")
        await invoke("log_scan_success", { artist: trashedRecord.artist, album: trashedRecord.title, source: "restore-from-trash" })
      } catch { /* ignore */ }

      refreshCollection()
      setActiveScreen("collection")
    } catch (err) {
      if (err instanceof ConflictError) {
        setTrashedRecord(null)
        setError("This record is already in your collection.")
      } else {
        setError(err instanceof Error ? err.message : "Failed to restore record")
      }
    } finally {
      setIsAdding(false)
    }
  }, [trashedRecord, getFreshToken, refreshCollection, setActiveScreen])

  // Enter key listener for condition confirmation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isAdding) {
        e.preventDefault()
        handleConfirm()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleConfirm, isAdding])

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-md">
      <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border-2 border-[#28d768] bg-[#0a0a0a] shadow-[0_0_40px_rgba(40,215,104,0.15)] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#28d768]/10">
            <CheckCircle2 className="h-5 w-5 text-[#28d768]" />
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight text-white uppercase tracking-wider">
              Define Condition
            </h2>
            <p className="text-xs uppercase tracking-widest text-[#28d768]">
              Final details for the vault
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col p-6">
           <div className="flex gap-5 mb-6">
             {/* Album cover */}
             <div
               className="aspect-square w-28 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-black/40"
             >
               {record.coverUrl ? (
                 <>
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={record.coverUrl} className="h-full w-full object-cover" alt="Cover" />
                 </>
               ) : (
                 <div className="flex h-full items-center justify-center">
                   <Music2 className="h-8 w-8 text-white/20" />
                 </div>
               )}
             </div>

             {/* Auto-filled details */}
             <div className="flex flex-col justify-center gap-3 min-w-0">
               <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Title</p>
                  <p className="truncate text-base font-bold text-white max-w-full" title={record.title}>{record.title}</p>
               </div>
               <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Artist / Year</p>
                  <p className="truncate text-sm font-medium text-white/80">{record.artist} • {record.year}</p>
               </div>
             </div>
           </div>

           {/* Manual Condition Selector */}
           <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
             <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/60">
               Select Record Condition
             </p>
             <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
               {CONDITIONS.map((cond) => (
                 <button
                   key={cond}
                   onClick={() => setSelectedCondition(cond)}
                   className={`flex h-10 items-center justify-center rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                     selectedCondition === cond
                       ? "border-[#28d768] bg-[#28d768]/20 text-[#28d768] shadow-[0_0_10px_rgba(40,215,104,0.3)]"
                       : "border-white/10 bg-black/40 text-white/50 hover:border-white/30 hover:text-white/80"
                   }`}
                 >
                   {cond}
                 </button>
               ))}
             </div>
           </div>

           {trashedRecord && (
             <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
               <p className="font-semibold mb-2">This record is in your trash</p>
               <p className="text-yellow-300/70 text-xs mb-3">
                 &ldquo;{trashedRecord.title}&rdquo; by {trashedRecord.artist} was previously deleted.
                 Restore it or cancel.
               </p>
               <div className="flex gap-2">
                 <button
                   onClick={handleRestoreFromTrash}
                   disabled={isAdding}
                   className="flex-1 rounded-lg bg-yellow-500/20 border border-yellow-500/40 py-2 text-xs font-bold uppercase tracking-widest text-yellow-300 hover:bg-yellow-500/30 transition-colors cursor-pointer disabled:opacity-50"
                 >
                   Restore from Trash
                 </button>
                 <button
                   onClick={() => setTrashedRecord(null)}
                   disabled={isAdding}
                   className="flex-1 rounded-lg border border-white/10 py-2 text-xs font-bold uppercase tracking-widest text-white/50 hover:bg-white/5 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                 >
                   Cancel
                 </button>
               </div>
             </div>
           )}

           {error && (
             <div className="mb-4 rounded-lg border border-[#f52f12]/30 bg-[#f52f12]/10 p-3 text-sm text-[#f52f12]">
               {error}
             </div>
           )}

           {/* Actions */}
           <div className="flex flex-col gap-3 mt-auto">
             <GreenPrimaryButton state="success" onClick={handleConfirm} disabled={isAdding || !!trashedRecord} isLoading={isAdding} />
             
             <div className="flex gap-2">
               <button
                 onClick={onReset}
                 className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 py-3 text-xs font-bold uppercase tracking-widest text-white/50 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
               >
                 <RefreshCw className="h-3.5 w-3.5" />
                 Scan Again
               </button>

               {record.discogs && (
                 <a
                   href={record.discogsUrl || `https://www.discogs.com/release/${record.discogs.releaseId}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 py-3 text-xs font-bold uppercase tracking-widest text-[#60a5fa]/70 transition-colors hover:bg-[#60a5fa]/10 hover:border-[#60a5fa]/50 hover:text-[#60a5fa] cursor-pointer"
                 >
                   <ExternalLink className="h-3.5 w-3.5" />
                   Discogs Info
                 </a>
               )}
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}

// ── Panel: Error / Fallback ───────────────────────────────────────────────────

const IMAGE_SIZE_OPTIONS_LOCAL = [256, 384, 512, 672, 768, 1024, 1280]
const IMAGE_SIZE_OPTIONS_CLOUD = [512, 768, 1024, 1280, 1536, 2048]

function ErrorPanel({
  message,
  capturedImage,
  hasCapturedImage,
  hasRawImage,
  onRetry,
  onNewScan,
  onReset,
  aiProvider,
  cloudConfigured,
  onRetryWithCloud,
  onManualAdd,
  onAdjustCrop,
  localMaxDim,
  cloudMaxDim,
  onChangeImageSize,
}: {
  message?: string
  capturedImage?: string
  hasCapturedImage?: boolean
  hasRawImage?: boolean
  onRetry: () => void
  onNewScan: () => void
  onReset: () => void
  aiProvider: "auto" | "local" | "cloud"
  cloudConfigured: boolean
  onRetryWithCloud: () => void
  onManualAdd: () => void
  onAdjustCrop: () => void
  localMaxDim: number
  cloudMaxDim: number
  onChangeImageSize: (type: "local" | "cloud", dim: number) => void
}) {
  const { setActiveScreen } = useVinylVault()
  const isCloudFailed = aiProvider === "cloud"
  const canTryCloud = !isCloudFailed && cloudConfigured

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
            {isCloudFailed ? "Cloud AI Failed" : "Recognition Failed"}
          </h2>
          <p className="text-xs" style={{ color: "var(--app-text-3)" }}>
            {isCloudFailed ? "Cloud model could not identify this record" : "Could not identify this record"}
          </p>
        </div>
      </div>

      {/* Cover placeholder */}
      <div
        className="mb-5 flex aspect-square w-full items-center justify-center rounded-xl overflow-hidden relative"
        style={{
          background: "rgba(245,47,18,0.04)",
          border: "1px solid rgba(245,47,18,0.10)",
        }}
      >
        {capturedImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedImage}
              className="absolute inset-0 h-full w-full object-cover opacity-40 grayscale filter contrast-125 mix-blend-luminosity"
              alt="Failed capture"
            />
          </>
        )}
        <XCircle className="h-10 w-10 z-10" style={{ color: "rgba(245,47,18,0.6)" }} />
      </div>

      {/* Error message */}
      <div
        className="mb-4 rounded-xl p-4"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--app-border)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--app-text-2)" }}>
          {message || (isCloudFailed
            ? "The cloud model couldn't identify this record. Try cropping or scanning again."
            : "We couldn't identify this record. Please try again.")}
        </p>
        {!isCloudFailed && (
          <ul className="mt-3 space-y-1 text-xs" style={{ color: "var(--app-text-3)" }}>
            <li>• Ensure good lighting on the cover</li>
            <li>• Avoid glare and reflections</li>
            <li>• Keep the cover flat and centered</li>
          </ul>
        )}
      </div>

      {/* Image size quick-adjust */}
      {(aiProvider === "local" || aiProvider === "auto") && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--app-border)" }}>
          <span className="text-xs" style={{ color: "var(--app-text-3)" }}>Local image size</span>
          <select
            value={localMaxDim}
            onChange={(e) => onChangeImageSize("local", Number(e.target.value))}
            className="rounded-md px-2 py-1 text-xs outline-none"
            style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)", color: "var(--app-text-2)" }}
          >
            {IMAGE_SIZE_OPTIONS_LOCAL.map((px) => (
              <option key={px} value={px}>{px}px</option>
            ))}
          </select>
        </div>
      )}
      {(aiProvider === "cloud" || aiProvider === "auto") && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--app-border)" }}>
          <span className="text-xs" style={{ color: "var(--app-text-3)" }}>Cloud image size</span>
          <select
            value={cloudMaxDim}
            onChange={(e) => onChangeImageSize("cloud", Number(e.target.value))}
            className="rounded-md px-2 py-1 text-xs outline-none"
            style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)", color: "var(--app-text-2)" }}
          >
            {IMAGE_SIZE_OPTIONS_CLOUD.map((px) => (
              <option key={px} value={px}>{px}px</option>
            ))}
          </select>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto flex flex-col gap-3">
        {/* Primary: Manually Add */}
        <GreenPrimaryButton state="idle" onClick={onManualAdd} />

        {/* ── Primary Retry button ── */}
        {hasCapturedImage && (
          <button
            onClick={onRetry}
            className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 cursor-pointer"
            style={{
              background: "var(--app-surface-2)",
              border: "1px solid rgba(40,215,104,0.35)",
              color: "var(--app-green)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(40,215,104,0.08)"
              e.currentTarget.style.borderColor = "rgba(40,215,104,0.65)"
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(40,215,104,0.12)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--app-surface-2)"
              e.currentTarget.style.borderColor = "rgba(40,215,104,0.35)"
              e.currentTarget.style.boxShadow = "none"
            }}
          >
            <RefreshCw className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
            Retry
          </button>
        )}

        {/* Cloud AI button — only shown when not already using cloud */}
        {canTryCloud && (
          <button
            onClick={onRetryWithCloud}
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
        )}

        {/* Not using cloud, cloud not configured → offer to set it up */}
        {!isCloudFailed && !cloudConfigured && (
          <button
            onClick={() => setActiveScreen("settings")}
            className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer"
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--app-text-3)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)"
              e.currentTarget.style.color = "var(--app-text-2)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"
              e.currentTarget.style.color = "var(--app-text-3)"
            }}
          >
            <CloudLightning className="h-4 w-4" />
            Set Up Cloud AI
          </button>
        )}

        {/* Secondary row: crop adjust + new photo + cancel */}
        <div className="flex gap-2">
          {hasRawImage && (
            <button
              onClick={onAdjustCrop}
              className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              style={{
                border: "1px solid rgba(40,215,104,0.40)",
                color: "#28d768",
                background: "rgba(40,215,104,0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(40,215,104,0.10)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(40,215,104,0.05)"
              }}
            >
              <SquareDashedMousePointer className="h-3.5 w-3.5" />
              Crop
            </button>
          )}
          <button
            onClick={onNewScan}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-colors cursor-pointer"
            style={{
              border: "1px solid var(--app-border)",
              color: "var(--app-text-2)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--app-text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--app-text-2)")}
          >
            <Camera className="h-3.5 w-3.5" />
            New Photo
          </button>
          <button
            onClick={onReset}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-colors cursor-pointer"
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

// ── Panel: Crop ───────────────────────────────────────────────────────────────

function CropPanel({
  rawImageUrl,
  onApplyCrop,
  onCancel,
}: {
  rawImageUrl: string
  onApplyCrop: (blob: Blob, capturedImage: string, rawImageUrl: string) => void
  onCancel: () => void
}) {
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 50,
    height: 50,
    x: 25,
    y: 25,
  })
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(0)
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleApply = useCallback(async () => {
    if (!imgRef.current) return
    setIsApplying(true)

    try {
      const image = imgRef.current
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      // react-image-crop v11: onComplete gives PixelCrop (display-space px).
      // If the user never dragged, completedCrop is null — fall back to the
      // current percent crop converted to natural pixels.
      let sx: number, sy: number, sw: number, sh: number
      if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
        // completedCrop is in display pixels → scale to natural pixels
        sx = completedCrop.x * scaleX
        sy = completedCrop.y * scaleY
        sw = completedCrop.width * scaleX
        sh = completedCrop.height * scaleY
      } else {
        // Percent crop → natural pixels
        sx = (crop.x / 100) * image.naturalWidth
        sy = (crop.y / 100) * image.naturalHeight
        sw = (crop.width / 100) * image.naturalWidth
        sh = (crop.height / 100) * image.naturalHeight
      }

      const canvas = document.createElement("canvas")
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext("2d")!
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh)

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
      )
      onApplyCrop(blob, dataUrl, rawImageUrl)
    } finally {
      setIsApplying(false)
    }
  }, [completedCrop, crop, onApplyCrop, rawImageUrl])

  // Enter key listener for manual crop apply
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isApplying) {
        e.preventDefault()
        handleApply()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleApply, isApplying])

  return (
    <div className="absolute inset-0 flex flex-col p-8 z-50 bg-[#050505]">
      {/* Header & Actions */}
      <div className="mb-6 shrink-0 flex items-center justify-between w-full animate-in slide-in-from-top-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-widest text-[#28d768]">
            Adjust Crop
          </h2>
          <p className="mt-2 text-sm text-white/50 uppercase tracking-widest">
            Drag the square to cover the album art completely
          </p>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 rounded-full border border-white/20 bg-black/50 px-8 py-3 text-xs font-bold uppercase tracking-widest text-white/50 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-[#28d768] bg-[#28d768]/10 px-8 py-3 text-xs font-bold uppercase tracking-widest text-[#28d768] transition-all hover:bg-[#28d768]/20 disabled:opacity-40 cursor-pointer"
          >
            {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isApplying ? "Applying..." : "Confirm & Rescan"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div ref={containerRef} className="flex-1 min-h-0 relative flex items-center justify-center animate-in zoom-in-95 duration-500">
        <ReactCrop
          crop={crop}
          onChange={(newCrop) => setCrop(newCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          className="max-w-full shadow-[0_0_50px_rgba(0,0,0,0.8)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={rawImageUrl}
            alt="Raw camera capture"
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: containerHeight > 0 ? `${containerHeight}px` : "none",
            }}
          />
        </ReactCrop>
      </div>
      
      <style>{`
        /* Overriding ReactCrop WITHOUT massive box-shadow lag */
        .ReactCrop__crop-selection {
          border: 2px solid #28d768 !important;
          border-radius: 4px;
          background: rgba(40,215,104,0.05);
        }
        .ReactCrop__drag-handle {
          width: 14px !important;
          height: 14px !important;
          background-color: #28d768 !important;
          border: 2px solid #000 !important;
          border-radius: 50% !important;
        }
      `}</style>
    </div>
  )
}
