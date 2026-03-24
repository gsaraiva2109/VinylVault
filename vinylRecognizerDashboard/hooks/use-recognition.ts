import { useState, useCallback } from "react"
import type { VinylRecord, ScanState } from "../app/vinyl-catalog/types"
import { api } from "@/lib/api"
import { useSession } from "next-auth/react"

// Types for the Electron bridge
interface RecognitionResult {
  artist: string
  album: string
  confidence: number
  source: string
}

declare global {
  interface Window {
    vinylApp?: {
      recognize: (buffer: ArrayBuffer) => Promise<RecognitionResult>
    }
  }
}

export function useRecognition() {
  const [state, setState] = useState<ScanState>({ status: "idle" })
  const { data: session } = useSession()

  const captureAndRecognize = useCallback(
    async (videoElement: HTMLVideoElement) => {
      if (!window.vinylApp) {
        setState({
          status: "error",
          errorMessage: "Electron recognition bridge not found.",
        })
        return
      }

      setState({ status: "scanning" })
      try {
        // 1. Capture frame from video to canvas
        const canvas = document.createElement("canvas")
        canvas.width = videoElement.videoWidth
        canvas.height = videoElement.videoHeight
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(videoElement, 0, 0)

        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
            "image/jpeg",
            0.9
          )
        )

        const buffer = await blob.arrayBuffer()

        // 2. Call local Python sidecar via Electron bridge
        const recognition = await window.vinylApp.recognize(buffer)
        
        // 3. Search Discogs using the identified artist/album
        const query = `${recognition.artist} ${recognition.album}`.trim()
        if (!query) {
          throw new Error("Could not identify any text on the album cover.")
        }

        const token = (session as { accessToken?: string })?.accessToken
        const searchResults = await api.discogs.search(query, token)

        if (!searchResults || searchResults.length === 0) {
          throw new Error(`No records found on Discogs for "${query}"`)
        }

        // 4. Map top search result to VinylRecord
        const bestMatch = searchResults[0]
        const record: VinylRecord = {
          id: `new-${Date.now()}`,
          title: bestMatch.title.split(" - ")[1] || bestMatch.title,
          artist: bestMatch.artist || bestMatch.title.split(" - ")[0] || "Unknown Artist",
          year: bestMatch.year || new Date().getFullYear(),
          genre: bestMatch.genre || "Unknown",
          condition: "good", // Default for new scans
          coverUrl: bestMatch.coverImage || "",
          dateAdded: new Date().toISOString().split("T")[0],
          discogs: {
            releaseId: bestMatch.id,
          },
        }

        setState({ status: "success", scannedRecord: record })
      } catch (err) {
        setState({
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Recognition failed",
        })
      }
    },
    [session]
  )

  const reset = useCallback(() => setState({ status: "idle" }), [])

  return { state, captureAndRecognize, reset }
}
