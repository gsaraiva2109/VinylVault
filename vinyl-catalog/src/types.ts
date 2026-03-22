// Shared types between renderer and preload
// Defined here so renderer doesn't import from electron/ (wrong compilation context)

export type RecognitionResult = {
  artist: string
  album: string
  confidence: number
  source: 'ocr' | 'ollama' | 'openai' | 'gemini' | 'stub'
}

export type OllamaModelsResult = {
  models: string[]
  error?: string
}

export type AppSettings = {
  ocr: { enabled: boolean; threshold: number }
  llm: {
    provider: 'local' | 'openai' | 'gemini' | 'hybrid'
    ollamaModel: string
    cloudProvider: 'openai' | 'gemini'
    cloudModel: string
  }
}
