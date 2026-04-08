import { useState, useCallback, useRef } from "react"
import type { VinylRecord, ScanState } from "../app/vinyl-vault/types"
import { api } from "@/lib/api"
import { useTauriAuth } from "@/lib/tauri-auth"
import { isTauri } from "@/lib/utils"

interface RecognitionResult {
  artist: string
  album: string
  confidence: number
  source: string
}

export function useRecognition(onScanError?: (message: string, provider?: string, capturedImage?: string) => void) {
  const [state, setState] = useState<ScanState>({ status: "idle" })
  const { accessToken: token } = useTauriAuth()

  const tokenRef = useRef(token)
  tokenRef.current = token

  const performRecognition = useCallback(async (blob: Blob, capturedImage: string, rawImageUrl?: string, forceProvider?: string) => {
    try {
      const buffer = await blob.arrayBuffer()

      // 2. Call Tauri recognize command (Rust sidecar on Linux, Vision on macOS)
      const { invoke } = await import("@tauri-apps/api/core")
      const imageData = Array.from(new Uint8Array(buffer))
      const invokeArgs: Record<string, unknown> = { imageData }
      if (forceProvider) invokeArgs.forceProvider = forceProvider
      const recognition = await invoke<RecognitionResult>("recognize", invokeArgs)

      // 3. Search Discogs using the identified artist/album
      if (recognition.artist === "unknown" && recognition.album === "unknown") {
        throw new Error("Could not identify this record. Try adjusting the crop or improving lighting.")
      }

      const query = `${recognition.artist} ${recognition.album}`.trim()
      if (!query) {
        throw new Error("Could not identify any text on the album cover.")
      }

      // Refresh token right before the network call — the LLM step can take 10-60s
      // and the JWT may have expired in the meantime.
      let freshToken: string | null = tokenRef.current
      try {
        freshToken = await invoke<string | null>("get_access_token")
      } catch { /* not in Tauri or auth unavailable — fall back to cached token */ }

      const searchResults = await api.discogs.search(query, freshToken ?? undefined)

      if (!searchResults || searchResults.length === 0) {
        throw new Error(`No records found on Discogs for "${query}"`)
      }

      // 4. Map top N search results to VinylRecord candidates
      const candidateCount = recognition.confidence < 0.6 ? 5 : 3
      interface DiscogsResult {
        id: string
        title: string
        artist: string
        year: number | null
        genre: string | null
        coverImage: string | null
      }
      const candidates: VinylRecord[] = (searchResults as DiscogsResult[])
        .slice(0, candidateCount)
        .map((r) => ({
          id: `new-${Date.now()}-${r.id}`,
          title: r.title.split(" - ")[1] || r.title,
          artist: r.artist || r.title.split(" - ")[0] || "Unknown Artist",
          year: r.year || new Date().getFullYear(),
          genre: r.genre || "Unknown",
          condition: "VG" as const,
          coverUrl: r.coverImage || "",
          dateAdded: new Date().toISOString().split("T")[0],
          discogs: { releaseId: r.id },
        }))

      // Spotify enrichment — enriches ALL candidates so any selected record has the button.
      // Desktop (Tauri): uses keyring-stored credentials via spotify_search invoke.
      // Web: uses NEXT_PUBLIC_SPOTIFY_CLIENT_ID/SECRET build-time vars.
      try {
        if (isTauri()) {
          // Desktop path: spotify_search handles auth internally per call
          const { invoke: inv } = await import("@tauri-apps/api/core")
          for (let i = 0; i < candidates.length; i++) {
            try {
              const q = `${candidates[i].artist} ${candidates[i].title}`.trim()
              const spotData = await inv<{ albumId: string }>("spotify_search", { q })
              if (spotData.albumId) candidates[i] = { ...candidates[i], spotify: { albumId: spotData.albumId } }
            } catch { /* no match or keys not configured — skip */ }
          }
        } else {
          // Web path: obtain one token, then search per candidate
          const spotifyClientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
          const spotifyClientSecret = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET
          if (spotifyClientId && spotifyClientSecret) {
            const tokenResp = await fetch("https://accounts.spotify.com/api/token", {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(`${spotifyClientId}:${spotifyClientSecret}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: "grant_type=client_credentials",
            })
            const tokenData = await tokenResp.json() as { access_token?: string }
            const access_token = tokenData.access_token
            if (access_token) {
              for (let i = 0; i < candidates.length; i++) {
                try {
                  const q = encodeURIComponent(`${candidates[i].artist} ${candidates[i].title}`.trim())
                  const searchResp = await fetch(
                    `https://api.spotify.com/v1/search?q=${q}&type=album&limit=1`,
                    { headers: { Authorization: `Bearer ${access_token}` } }
                  )
                  const data = await searchResp.json() as { albums?: { items: { id: string }[] } }
                  const albumId = data.albums?.items?.[0]?.id
                  if (albumId) candidates[i] = { ...candidates[i], spotify: { albumId } }
                } catch { /* individual candidate enrichment failed — skip */ }
              }
            }
          }
        }
      } catch { /* Spotify not configured or no match — skip silently */ }

      const autoSkipEnabled = typeof window !== "undefined"
        ? localStorage.getItem("vinyl_vault_auto_skip") !== "false"
        : true

      if (autoSkipEnabled && recognition.confidence >= 0.90 && candidates.length > 0) {
        setState({ status: "success", scannedRecord: candidates[0], capturedImage, rawImageUrl })
      } else {
        setState({ status: "selecting", candidates, capturedImage, rawImageUrl })
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message :
        typeof err === "string" ? err :
        "Recognition failed"

      onScanError?.(message, forceProvider ?? "auto", capturedImage)

      try {
        const { invoke } = await import("@tauri-apps/api/core")
        await invoke("log_scan_error", {
          message,
          context: `provider=${forceProvider ?? "auto"} capturedImage=${!!capturedImage}`,
        })
      } catch { /* not in Tauri or log failed — ignore */ }

      setState({
        status: "error",
        errorMessage: message,
        capturedImage,
        rawImageUrl,
      })
    }
  }, [onScanError])

  const captureFromVideo = useCallback(
    async (videoElement: HTMLVideoElement, forceProvider?: string) => {
      setState({ status: "scanning" })
      try {
        // 1. Capture FULL raw frame to canvas memory
        const rawCanvas = document.createElement("canvas")
        rawCanvas.width = videoElement.videoWidth
        rawCanvas.height = videoElement.videoHeight
        const rawCtx = rawCanvas.getContext("2d")!
        rawCtx.drawImage(videoElement, 0, 0)
        
        const rawImageUrl = rawCanvas.toDataURL("image/jpeg", 0.9)

        // 2. Crop perfect square from center
        const size = Math.min(videoElement.videoWidth, videoElement.videoHeight)
        const startX = (videoElement.videoWidth - size) / 2
        const startY = (videoElement.videoHeight - size) / 2

        const cropCanvas = document.createElement("canvas")
        cropCanvas.width = size
        cropCanvas.height = size
        const cropCtx = cropCanvas.getContext("2d")!
        // Extract center square and scale directly to its original size
        cropCtx.drawImage(rawCanvas, startX, startY, size, size, 0, 0, size, size)

        const capturedImage = cropCanvas.toDataURL("image/jpeg", 0.8)
        setState({ status: "scanning", capturedImage, rawImageUrl })

        // Read user-configured image size limits (defaults: 512 local, 1024 cloud)
        let localMaxDim = 512
        let cloudMaxDim = 1024
        try {
          const { invoke: inv } = await import("@tauri-apps/api/core")
          const s = await inv<{ llm: { localMaxDim?: number; cloudMaxDim?: number } }>("read_settings")
          localMaxDim = s.llm.localMaxDim ?? 512
          cloudMaxDim = s.llm.cloudMaxDim ?? 1024
        } catch { /* not in Tauri or settings unreadable — use defaults */ }
        // local/auto: protect Ollama VRAM; cloud: use full resolution
        const MAX_DIM = forceProvider === "cloud" ? cloudMaxDim : localMaxDim
        const scale = Math.min(1, MAX_DIM / Math.max(rawCanvas.width, rawCanvas.height))
        const scaledCanvas = document.createElement("canvas")
        scaledCanvas.width = Math.round(rawCanvas.width * scale)
        scaledCanvas.height = Math.round(rawCanvas.height * scale)
        const scaledCtx = scaledCanvas.getContext("2d")!
        scaledCtx.drawImage(rawCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height)

        const blob = await new Promise<Blob>((resolve, reject) =>
          scaledCanvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
            "image/jpeg",
            0.85
          )
        )

        await performRecognition(blob, capturedImage, rawImageUrl, forceProvider)
      } catch (err) {
        const message =
          err instanceof Error ? err.message :
          typeof err === "string" ? err :
          "Capture failed"
        onScanError?.(message)
        setState({ status: "error", errorMessage: message })
      }
    },
    [performRecognition, onScanError]
  )

  const recognizeFromCrop = useCallback(async (blob: Blob, capturedImage: string, rawImageUrl: string, forceProvider?: string) => {
    setState({ status: "scanning", capturedImage, rawImageUrl })
    await performRecognition(blob, capturedImage, rawImageUrl, forceProvider)
  }, [performRecognition])

  // Re-run recognition on the last captured image, forcing cloud provider
  const retryWithCloud = useCallback(async () => {
    const s = state
    const capturedImage = "capturedImage" in s ? (s as { capturedImage?: string }).capturedImage : undefined
    const rawImageUrl = "rawImageUrl" in s ? (s as { rawImageUrl?: string }).rawImageUrl : undefined
    if (!capturedImage) return
    setState({ status: "scanning", capturedImage, rawImageUrl })
    try {
      // Convert data URL to Blob directly (fetch() on data: URLs is unreliable in Tauri WebView)
      const [header, b64] = capturedImage.split(",")
      const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg"
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: mimeType })
      await performRecognition(blob, capturedImage, rawImageUrl, "cloud")
    } catch (err) {
      setState({
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Cloud recognition failed",
        capturedImage,
        rawImageUrl,
      })
    }
  }, [state, performRecognition])

  const setStatus = useCallback((status: ScanState["status"]) => {
    setState(s => ({ ...s, status }))
  }, [])

  const selectCandidate = useCallback((record: VinylRecord) => {
    setState({ status: "success", scannedRecord: record })
  }, [])

  const reset = useCallback(() => setState({ status: "idle" }), [])

  return { state, captureFromVideo, recognizeFromCrop, retryWithCloud, setStatus, selectCandidate, reset }
}
