import { useEffect, useState } from 'react'
import type { AppSettings } from '../../types'
import OllamaStatus from './OllamaStatus'
import ApiKeySettings from './ApiKeySettings'

const DEFAULT_SETTINGS: AppSettings = {
  ocr: { enabled: true, threshold: 0.7 },
  llm: { provider: 'local', ollamaModel: '', cloudProvider: 'openai', cloudModel: 'gpt-4o' }
}

export default function RecognitionSettings(): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.vinylApp.readSettings().then(setSettings)
  }, [])

  async function save(updated: AppSettings) {
    setSettings(updated)
    await window.vinylApp.writeSettings(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-xl font-semibold mb-6">Settings</h2>

      <section className="mb-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          OCR
        </h3>
        <div className="flex flex-col gap-4">
          <label className="flex items-center justify-between">
            <span className="text-sm">Enable OCR</span>
            <button
              role="switch"
              aria-checked={settings.ocr.enabled}
              onClick={() => save({ ...settings, ocr: { ...settings.ocr, enabled: !settings.ocr.enabled } })}
              className={`relative w-10 h-5 rounded-full transition-colors ${settings.ocr.enabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.ocr.enabled ? 'translate-x-5' : ''}`}
              />
            </button>
          </label>

          {settings.ocr.enabled && (
            <label className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span>Confidence threshold</span>
                <span className="text-muted-foreground">{settings.ocr.threshold.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={settings.ocr.threshold}
                onChange={(e) =>
                  save({ ...settings, ocr: { ...settings.ocr, threshold: parseFloat(e.target.value) } })
                }
                className="w-full accent-primary"
              />
            </label>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          LLM Provider
        </h3>
        <div className="flex flex-col gap-4">
          <select
            value={settings.llm.provider}
            onChange={(e) =>
              save({ ...settings, llm: { ...settings.llm, provider: e.target.value as AppSettings['llm']['provider'] } })
            }
            className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="local">Local (Ollama)</option>
            <option value="openai">Cloud — OpenAI</option>
            <option value="gemini">Cloud — Google Gemini</option>
            <option value="hybrid">Hybrid (Ollama → Cloud fallback)</option>
          </select>

          {(settings.llm.provider === 'local' || settings.llm.provider === 'hybrid') && (
            <OllamaStatus
              selectedModel={settings.llm.ollamaModel}
              onModelSelect={(m) => save({ ...settings, llm: { ...settings.llm, ollamaModel: m } })}
            />
          )}

          {(settings.llm.provider === 'openai' || settings.llm.provider === 'gemini' || settings.llm.provider === 'hybrid') && (
            <div className="flex flex-col gap-2">
              <label className="text-sm">Model name</label>
              <input
                value={settings.llm.cloudModel}
                onChange={(e) => save({ ...settings, llm: { ...settings.llm, cloudModel: e.target.value } })}
                placeholder="e.g. gpt-4o or gemini-1.5-pro"
                className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>
      </section>

      <ApiKeySettings />

      {saved && <p className="text-sm text-emerald-600 mt-4">Settings saved.</p>}
    </div>
  )
}
