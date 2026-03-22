import { useState, useCallback } from 'react'
import type { RecognitionResult } from '../types'

type RecognitionState =
  | { status: 'idle' }
  | { status: 'scanning' }
  | { status: 'result'; result: RecognitionResult }
  | { status: 'error'; message: string }

export function useRecognition() {
  const [state, setState] = useState<RecognitionState>({ status: 'idle' })

  const captureAndRecognize = useCallback(
    async (videoElement: HTMLVideoElement) => {
      setState({ status: 'scanning' })
      try {
        // Capture frame from video to canvas
        const canvas = document.createElement('canvas')
        canvas.width = videoElement.videoWidth
        canvas.height = videoElement.videoHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(videoElement, 0, 0)

        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas toBlob failed'))), 'image/jpeg', 0.9)
        )

        const buffer = await blob.arrayBuffer()
        const result = await window.vinylApp.recognize(buffer)
        setState({ status: 'result', result })
      } catch (err) {
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Recognition failed' })
      }
    },
    []
  )

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { state, captureAndRecognize, reset }
}
