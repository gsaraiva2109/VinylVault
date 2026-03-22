import { useEffect, useState } from 'react'

type Props = {
  selectedModel: string
  onModelSelect: (model: string) => void
}

export default function OllamaStatus({ selectedModel, onModelSelect }: Props): React.JSX.Element {
  const [models, setModels] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.vinylApp
      .getOllamaModels()
      .then((res) => {
        setModels(res.models)
        setError(res.error ?? null)
        if (res.models.length > 0 && !selectedModel) {
          onModelSelect(res.models[0])
        }
      })
      .catch(() => setError('Could not contact sidecar'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-muted-foreground">Checking Ollama…</p>

  if (error || models.length === 0) {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm">
        <p className="font-medium text-orange-900">Ollama is not installed or not running</p>
        <p className="text-orange-700 mt-1">
          Download it at{' '}
          <a
            href="https://ollama.com/download"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-orange-900"
            onClick={(e) => {
              e.preventDefault()
              window.open('https://ollama.com/download')
            }}
          >
            ollama.com/download
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm">Ollama model</label>
      <select
        value={selectedModel}
        onChange={(e) => onModelSelect(e.target.value)}
        className="px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {models.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  )
}
