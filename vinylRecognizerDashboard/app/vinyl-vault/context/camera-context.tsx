"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

interface CameraContextType {
  stream: MediaStream | null
  setStream: (stream: MediaStream | null) => void
  canUseCamera: boolean | null
  cameraError: string | null
  setCameraError: (error: string | null) => void
}

const CameraContext = createContext<CameraContextType | undefined>(undefined)

export function CameraProvider({ children }: { children: ReactNode }) {
  const [stream, setStreamState] = useState<MediaStream | null>(null)
  const [canUseCamera, setCanUseCamera] = useState<boolean | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const setStream = useCallback((s: MediaStream | null) => setStreamState(s), [])

  useEffect(() => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
    const isLocalDev =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168."))

    const canUse = isTauri || isLocalDev
    setCanUseCamera(canUse)

    if (!canUse) return

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 4096 },
          height: { ideal: 4096 },
          frameRate: { ideal: 30 },
        },
      })
      .then((s) => setStreamState(s))
      .catch((err) => {
        setCameraError(err instanceof Error ? err.message : "Camera access denied")
        setCanUseCamera(false)
      })

    return () => {
      setStreamState((prev) => {
        prev?.getTracks().forEach((t) => t.stop())
        return null
      })
    }
  }, [])

  return (
    <CameraContext.Provider value={{ stream, setStream, canUseCamera, cameraError, setCameraError }}>
      {children}
    </CameraContext.Provider>
  )
}

export function useCameraContext() {
  const ctx = useContext(CameraContext)
  if (!ctx) throw new Error("useCameraContext must be used within CameraProvider")
  return ctx
}
