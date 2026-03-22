import { useState } from 'react'

type Provider = 'openai' | 'gemini'

function MaskedKeyField({
  provider,
  label
}: {
  provider: Provider
  label: string
}): React.JSX.Element {
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState(false)
  const [revealed, setRevealed] = useState(false)

  async function handleSave() {
    if (!value.trim()) return
    await window.vinylApp.saveApiKey(provider, value.trim())
    setSaved(true)
    setValue('')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">{label} API Key</label>
      <div className="flex gap-2">
        <input
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste key here — stored in OS keychain"
          className="flex-1 px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => setRevealed((r) => !r)}
          className="px-2 text-muted-foreground hover:text-foreground text-sm"
        >
          {revealed ? 'Hide' : 'Show'}
        </button>
        <button
          onClick={handleSave}
          disabled={!value.trim()}
          className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
        >
          Save
        </button>
      </div>
      {saved && <p className="text-xs text-emerald-600">Saved to keychain.</p>}
    </div>
  )
}

export default function ApiKeySettings(): React.JSX.Element {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
        API Keys (stored in OS keychain)
      </h3>
      <div className="flex flex-col gap-4">
        <MaskedKeyField provider="openai" label="OpenAI" />
        <MaskedKeyField provider="gemini" label="Google Gemini" />
      </div>
    </section>
  )
}
