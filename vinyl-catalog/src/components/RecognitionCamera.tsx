import { useRef, useEffect, useState, useCallback } from 'react'
import { useRecognition } from '../hooks/useRecognition'
import MatchConfirmDialog from './MatchConfirmDialog'

export default function RecognitionCamera(): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const { state, captureAndRecognize, reset } = useRecognition()

  // Start camera on mount
  useEffect(() => {
    let active = true
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (!active) return s.getTracks().forEach((t) => t.stop())
        setStream(s)
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch((err) => setCameraError(err.message))
    return () => {
      active = false
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const handleScan = useCallback(() => {
    if (videoRef.current) captureAndRecognize(videoRef.current)
  }, [captureAndRecognize])

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-xl font-semibold">Scan Record</h2>
        <p className="text-sm text-muted-foreground">Point camera at album cover, then tap Scan</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        {cameraError ? (
          <div className="text-center text-muted-foreground">
            <p className="text-4xl mb-2">📷</p>
            <p className="text-sm">Camera unavailable: {cameraError}</p>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-border shadow-lg max-w-lg w-full">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video bg-black object-cover"
            />
            {state.status === 'scanning' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="animate-spin text-4xl">🔍</div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleScan}
          disabled={!stream || state.status === 'scanning'}
          className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {state.status === 'scanning' ? 'Recognizing…' : 'Scan Record'}
        </button>

        {state.status === 'error' && (
          <p className="text-sm text-destructive text-center max-w-sm">{state.message}</p>
        )}
      </div>

      {state.status === 'result' && (
        <MatchConfirmDialog result={state.result} onClose={reset} />
      )}
    </div>
  )
}
