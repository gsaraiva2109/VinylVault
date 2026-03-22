/// <reference types="vite/client" />

import type { RecognitionResult, OllamaModelsResult, AppSettings } from './types'

declare global {
  interface Window {
    vinylApp: {
      recognize(imageBuffer: ArrayBuffer): Promise<RecognitionResult>
      getOllamaModels(): Promise<OllamaModelsResult>
      readSettings(): Promise<AppSettings>
      writeSettings(settings: AppSettings): Promise<void>
      saveApiKey(provider: 'openai' | 'gemini', key: string): Promise<void>
      getAccessToken(): Promise<string | null>
      startAuthFlow(): Promise<void>
    }
  }
}
