"use client"

import { useState, useEffect } from "react"
import { Check, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useVinylVault } from "../../../context"
import { SectionHeader, ToggleSetting } from "./shared-components"

export function IntegrationsSettings() {
  const { autoSkipEnabled, setAutoSkipEnabled } = useVinylVault()
  const [apiKeys, setApiKeys] = useState({ chatgpt: "", gemini: "" })
  const [showApiKeys, setShowApiKeys] = useState({ chatgpt: false, gemini: false })
  const [apiKeySet, setApiKeySet] = useState({ openai: false, gemini: false })
  const [apiKeySaving, setApiKeySaving] = useState(false)
  const [apiKeySaved, setApiKeySaved] = useState(false)

  const [spotifyKeys, setSpotifyKeys] = useState({ clientId: "", clientSecret: "" })
  const [showSpotifyKeys, setShowSpotifyKeys] = useState({ clientId: false, clientSecret: false })
  const [spotifyKeySet, setSpotifyKeySet] = useState({ clientId: false, clientSecret: false })
  const [spotifyKeySaving, setSpotifyKeySaving] = useState(false)
  const [spotifyKeySaved, setSpotifyKeySaved] = useState(false)

  const [ollamaStatus, setOllamaStatus] = useState<"idle" | "checking" | "connected" | "not_found">("idle")

  // Check which API keys are already stored and whether Ollama is running
  useEffect(() => {
    async function init() {
      try {
        const { invoke } = await import("@tauri-apps/api/core")
        const [openaiSet, geminiSet, spotifyIdSet, spotifySecretSet] = await Promise.all([
          invoke<boolean>("check_api_key", { provider: "openai" }),
          invoke<boolean>("check_api_key", { provider: "gemini" }),
          invoke<boolean>("check_api_key", { provider: "spotify-client-id" }),
          invoke<boolean>("check_api_key", { provider: "spotify-client-secret" }),
        ])
        setApiKeySet({ openai: openaiSet, gemini: geminiSet })
        setSpotifyKeySet({ clientId: spotifyIdSet, clientSecret: spotifySecretSet })

        // Silently check if Ollama is already running
        const result = await invoke<{ models: string[]; error?: string }>("get_ollama_models")
        if (result.models.length > 0) {
          setOllamaStatus("connected")
        }
      } catch { /* not in Tauri context */ }
    }
    init()
  }, [])

  const handleSaveApiKeys = async () => {
    setApiKeySaving(true)
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      if (apiKeys.chatgpt) {
        await invoke("save_api_key", { provider: "openai", key: apiKeys.chatgpt })
        setApiKeySet((prev) => ({ ...prev, openai: true }))
      }
      if (apiKeys.gemini) {
        await invoke("save_api_key", { provider: "gemini", key: apiKeys.gemini })
        setApiKeySet((prev) => ({ ...prev, gemini: true }))
      }
      toast.success("API keys saved")
    } catch {
      toast.error("Failed to save API keys")
    }
    setApiKeySaving(false)
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
  }

  const handleSaveSpotifyKeys = async () => {
    setSpotifyKeySaving(true)
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      if (spotifyKeys.clientId) {
        await invoke("save_api_key", { provider: "spotify-client-id", key: spotifyKeys.clientId })
        setSpotifyKeySet((prev) => ({ ...prev, clientId: true }))
      }
      if (spotifyKeys.clientSecret) {
        await invoke("save_api_key", { provider: "spotify-client-secret", key: spotifyKeys.clientSecret })
        setSpotifyKeySet((prev) => ({ ...prev, clientSecret: true }))
      }
      toast.success("Spotify credentials saved")
    } catch {
      toast.error("Failed to save Spotify credentials")
    }
    setSpotifyKeySaving(false)
    setSpotifyKeySaved(true)
    setTimeout(() => setSpotifyKeySaved(false), 2000)
  }

  const handleOllamaConnect = async () => {
    setOllamaStatus("checking")
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      const result = await invoke<{ models: string[]; error?: string }>("get_ollama_models")
      if (result.models.length > 0) {
        setOllamaStatus("connected")
        toast.success("Ollama connected", {
          description: `Found ${result.models.length} model${result.models.length !== 1 ? "s" : ""}. Select one in AI Recognition settings.`,
        })
      } else {
        setOllamaStatus("not_found")
        toast.error("Ollama not detected", {
          description: "Make sure Ollama is installed and running, then try again.",
          action: {
            label: "Download",
            onClick: () => window.open("https://ollama.com/download", "_blank"),
          },
          duration: 8000,
        })
      }
    } catch {
      setOllamaStatus("not_found")
      toast.error("Ollama not detected", {
        description: "Make sure Ollama is installed and running, then try again.",
        action: {
          label: "Download",
          onClick: () => window.open("https://ollama.com/download", "_blank"),
        },
        duration: 8000,
      })
    }
  }

  return (
    <div>
      <SectionHeader title="Integrations" subtitle="Connect third-party services to enhance your experience" />

      <div className="mt-6 rounded-xl p-5" style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}>
        <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--app-text-1)" }}>AI Integration Keys</h3>
        <p className="mb-4 text-xs" style={{ color: "var(--app-text-3)" }}>
          Add API keys for ChatGPT and Gemini to enable AI-powered features
        </p>
        <div className="space-y-3">
          {(["chatgpt", "gemini"] as const).map((key) => {
            const isSet = key === "chatgpt" ? apiKeySet.openai : apiKeySet.gemini
            return (
              <div key={key}>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium" style={{ color: "var(--app-text-2)" }}>
                  {key === "chatgpt" ? "ChatGPT API Key" : "Gemini API Key"}
                  {isSet && (
                    <span className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]"
                      style={{ background: "var(--app-green-bg)", color: "#28d768" }}>
                      <Check className="h-2.5 w-2.5" /> Saved
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    id={`${key}-api-key-input`}
                    name={`${key}-api-key`}
                    type={showApiKeys[key] ? "text" : "password"}
                    value={apiKeys[key]}
                    onChange={(e) => setApiKeys({ ...apiKeys, [key]: e.target.value })}
                    placeholder={isSet ? "••••••••••••••••" : (key === "chatgpt" ? "sk-..." : "AIza...")}
                    className="h-9 flex-1 rounded-lg px-3 text-sm outline-none transition-colors"
                    style={{
                      background: "var(--app-surface-3)",
                      border: "1px solid var(--app-border)",
                      color: "var(--app-text-1)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--app-green-border)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--app-border)")}
                  />
                  <button
                    onClick={() => setShowApiKeys({ ...showApiKeys, [key]: !showApiKeys[key] })}
                    className="h-9 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer"
                    style={{ border: "1px solid var(--app-border)", color: "var(--app-text-3)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--app-text-1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--app-text-3)")}
                  >
                    {showApiKeys[key] ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )
          })}
          <button
            onClick={handleSaveApiKeys}
            disabled={apiKeySaving || (!apiKeys.chatgpt && !apiKeys.gemini)}
            className="mt-2 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-40"
            style={{ background: "var(--app-green)", color: "hsl(var(--primary-foreground))" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {apiKeySaving ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
            ) : apiKeySaved ? (
              <><Check className="h-3.5 w-3.5" /> Saved</>
            ) : (
              "Save API Keys"
            )}
          </button>
        </div>
      </div>

      {/* Spotify credentials */}
      <div className="mt-4 rounded-xl p-5" style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}>
        <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--app-text-1)" }}>Spotify Integration</h3>
        <p className="mb-4 text-xs" style={{ color: "var(--app-text-3)" }}>
          Client credentials for automatic Spotify album linking on scan.{" "}
          <a
            href="https://developer.spotify.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--app-green)" }}
          >
            Get credentials
          </a>
        </p>
        <div className="space-y-3">
          {(["clientId", "clientSecret"] as const).map((field) => {
            const isSet = spotifyKeySet[field]
            const label = field === "clientId" ? "Client ID" : "Client Secret"
            return (
              <div key={field}>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium" style={{ color: "var(--app-text-2)" }}>
                  {label}
                  {isSet && (
                    <span className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]"
                      style={{ background: "var(--app-green-bg)", color: "#28d768" }}>
                      <Check className="h-2.5 w-2.5" /> Saved
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type={showSpotifyKeys[field] ? "text" : "password"}
                    value={spotifyKeys[field]}
                    onChange={(e) => setSpotifyKeys({ ...spotifyKeys, [field]: e.target.value })}
                    placeholder={isSet ? "••••••••••••••••" : (field === "clientId" ? "abc123..." : "def456...")}
                    className="h-9 flex-1 rounded-lg px-3 text-sm outline-none transition-colors"
                    style={{
                      background: "var(--app-surface-3)",
                      border: "1px solid var(--app-border)",
                      color: "var(--app-text-1)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--app-green-border)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--app-border)")}
                  />
                  <button
                    onClick={() => setShowSpotifyKeys({ ...showSpotifyKeys, [field]: !showSpotifyKeys[field] })}
                    className="h-9 rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer"
                    style={{ border: "1px solid var(--app-border)", color: "var(--app-text-3)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--app-text-1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--app-text-3)")}
                  >
                    {showSpotifyKeys[field] ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )
          })}
          <button
            onClick={handleSaveSpotifyKeys}
            disabled={spotifyKeySaving || (!spotifyKeys.clientId && !spotifyKeys.clientSecret)}
            className="mt-2 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer disabled:opacity-40"
            style={{ background: "var(--app-green)", color: "hsl(var(--primary-foreground))" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {spotifyKeySaving ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
            ) : spotifyKeySaved ? (
              <><Check className="h-3.5 w-3.5" /> Saved</>
            ) : (
              "Save Spotify Credentials"
            )}
          </button>
        </div>
      </div>

      <AiProviderSettings />

      <div className="mt-4 space-y-3">
        {/* Discogs — always connected */}
        <div
          className="flex items-center justify-between rounded-xl p-4"
          style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
              style={{ background: "var(--app-surface-3)", color: "var(--app-text-2)" }}
            >
              D
            </div>
            <div>
              <h3 className="text-sm font-medium" style={{ color: "var(--app-text-1)" }}>Discogs</h3>
              <p className="text-xs" style={{ color: "var(--app-text-3)" }}>Connect to fetch record values and metadata</p>
            </div>
          </div>
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ background: "var(--app-green-bg)", color: "var(--app-green)" }}
          >
            <Check className="h-3 w-3" />
            Connected
          </span>
        </div>

        {/* Ollama — dynamic status */}
        <div
          className="flex items-center justify-between rounded-xl p-4"
          style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
              style={{ background: "var(--app-surface-3)", color: "var(--app-text-2)" }}
            >
              O
            </div>
            <div>
              <h3 className="text-sm font-medium" style={{ color: "var(--app-text-1)" }}>Ollama</h3>
              <p className="text-xs" style={{ color: "var(--app-text-3)" }}>AI-powered record recognition (local, private)</p>
            </div>
          </div>
          {ollamaStatus === "connected" ? (
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: "var(--app-green-bg)", color: "var(--app-green)" }}
            >
              <Check className="h-3 w-3" />
              Connected
            </span>
          ) : (
            <button
              onClick={handleOllamaConnect}
              disabled={ollamaStatus === "checking"}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
              style={{ background: "var(--app-green)", color: "hsl(var(--primary-foreground))" }}
              onMouseEnter={(e) => { if (ollamaStatus !== "checking") e.currentTarget.style.opacity = "0.88" }}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {ollamaStatus === "checking" ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Checking...</>
              ) : (
                <>Connect <ExternalLink className="h-3 w-3" /></>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        <SectionHeader title="Scan Workflow" subtitle="Customize the AI scanning behavior" />
        <div className="mt-6 space-y-3">
          <ToggleSetting
            label="Auto-Skip Selection"
            description="Automatically pick matched records if AI is highly confident (>90%)"
            enabled={autoSkipEnabled}
            onChange={(v) => setAutoSkipEnabled(v)}
          />
        </div>
      </div>

    </div>
  )
}

// ── AiProviderSettings ────────────────────────────────────────────────────────

function AiProviderSettings() {
  const [provider, setProvider] = useState<"auto" | "local" | "cloud">("auto")
  const [ollamaModel, setOllamaModel] = useState("")
  const [cloudProvider, setCloudProvider] = useState<"openai" | "gemini">("openai")
  const [cloudModel, setCloudModel] = useState("gpt-4o")
  const [localMaxDim, setLocalMaxDim] = useState(512)
  const [cloudMaxDim, setCloudMaxDim] = useState(1024)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [cloudModels, setCloudModels] = useState<string[]>([])
  const [cloudModelsLoading, setCloudModelsLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { invoke } = await import("@tauri-apps/api/core")
        const settings = await invoke<{
          llm: { provider: string; ollamaModel: string; cloudProvider: string; cloudModel: string; localMaxDim?: number; cloudMaxDim?: number }
        }>("read_settings")
        setProvider(settings.llm.provider as "auto" | "local" | "cloud")
        setOllamaModel(settings.llm.ollamaModel)
        setCloudProvider(settings.llm.cloudProvider as "openai" | "gemini")
        setCloudModel(settings.llm.cloudModel)
        setLocalMaxDim(settings.llm.localMaxDim ?? 512)
        setCloudMaxDim(settings.llm.cloudMaxDim ?? 1024)
      } catch { /* not in Tauri context */ }

      setModelsLoading(true)
      try {
        const { invoke } = await import("@tauri-apps/api/core")
        const result = await invoke<{ models: string[]; error?: string }>("get_ollama_models")
        setAvailableModels(result.models)
      } catch { /* Ollama not running */ }
      setModelsLoading(false)
    }
    load()
  }, [])

  const DEFAULT_MODEL: Record<string, string> = {
    openai: "gpt-4o",
    gemini: "gemini-2.5-flash",
  }

  const handleCloudProviderChange = (p: "openai" | "gemini") => {
    setCloudProvider(p)
    setCloudModel(DEFAULT_MODEL[p] ?? "")
  }

  // Auto-fetch available cloud models whenever the cloud provider changes
  useEffect(() => {
    async function fetchCloudModels() {
      setCloudModelsLoading(true)
      setCloudModels([])
      try {
        const { invoke } = await import("@tauri-apps/api/core")
        const models = await invoke<string[]>("get_available_cloud_models", { provider: cloudProvider })
        setCloudModels(models)
      } catch { /* no key stored or not in Tauri */ }
      setCloudModelsLoading(false)
    }
    fetchCloudModels()
  }, [cloudProvider])

  const handleSave = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      await invoke("write_settings", {
        settings: {
          ocr: { enabled: true, threshold: 0.7 },
          llm: { provider, ollamaModel, cloudProvider, cloudModel, localMaxDim, cloudMaxDim },
        },
      })
      toast.success("AI settings saved")
    } catch {
      toast.error("Failed to save settings")
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div
      className="mt-4 rounded-xl p-5"
      style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
    >
      <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--app-text-1)" }}>
        AI Recognition Provider
      </h3>
      <p className="mb-4 text-xs" style={{ color: "var(--app-text-3)" }}>
        Choose which AI model identifies vinyl records from your camera
      </p>

      {/* Provider pills */}
      <div className="mb-4 flex gap-2">
        {(["auto", "local", "cloud"] as const).map((p) => {
          const isActive = provider === p
          const labels = { auto: "Auto", local: "Local (Ollama)", cloud: "Cloud" }
          return (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              style={{
                background: isActive ? "var(--app-green-bg)" : "var(--app-surface-3)",
                color: isActive ? "#28d768" : "var(--app-text-3)",
                border: isActive ? "1px solid rgba(40,215,104,0.22)" : "1px solid var(--app-border)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--app-text-2)"
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--app-text-3)"
              }}
            >
              {labels[p]}
            </button>
          )
        })}
      </div>

      {/* Ollama model selector */}
      {(provider === "local" || provider === "auto") && (
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--app-text-2)" }}>
            Ollama Model
          </label>
          {modelsLoading ? (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--app-text-3)" }}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Detecting Ollama models...
            </div>
          ) : availableModels.length > 0 ? (
            <select
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              className="h-9 w-full rounded-lg px-3 text-sm outline-none"
              style={{
                background: "var(--app-surface-3)",
                border: "1px solid var(--app-border)",
                color: "var(--app-text-1)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(40,215,104,0.22)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--app-border)")}
            >
              <option value="">Select a model...</option>
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs" style={{ color: "var(--app-text-3)" }}>
              No Ollama models detected. Make sure Ollama is running with a vision model (e.g.{" "}
              <span style={{ color: "var(--app-text-2)" }}>llava</span>) installed.
            </p>
          )}
        </div>
      )}

      {/* Cloud provider + model */}
      {(provider === "cloud" || provider === "auto") && (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--app-text-2)" }}>
              Cloud Provider
            </label>
            <select
              value={cloudProvider}
              onChange={(e) => handleCloudProviderChange(e.target.value as "openai" | "gemini")}
              className="h-9 w-full rounded-lg px-3 text-sm outline-none"
              style={{
                background: "var(--app-surface-3)",
                border: "1px solid var(--app-border)",
                color: "var(--app-text-1)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(40,215,104,0.22)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--app-border)")}
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--app-text-2)" }}>
              Model
              {cloudModelsLoading && <Loader2 className="h-3 w-3 animate-spin" style={{ color: "var(--app-text-3)" }} />}
            </label>
            {cloudModels.length > 0 ? (
              <select
                value={cloudModel}
                onChange={(e) => setCloudModel(e.target.value)}
                className="h-9 w-full rounded-lg px-3 text-sm outline-none"
                style={{
                  background: "var(--app-surface-3)",
                  border: "1px solid var(--app-border)",
                  color: "var(--app-text-1)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(40,215,104,0.22)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--app-border)")}
              >
                {cloudModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={cloudModel}
                onChange={(e) => setCloudModel(e.target.value)}
                placeholder={cloudProvider === "openai" ? "gpt-4o" : "gemini-2.0-flash"}
                className="h-9 w-full rounded-lg px-3 text-sm outline-none"
                style={{
                  background: "var(--app-surface-3)",
                  border: "1px solid var(--app-border)",
                  color: "var(--app-text-1)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(40,215,104,0.22)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--app-border)")}
              />
            )}
          </div>
        </div>
      )}

      {/* Image resolution — shown only when the relevant provider is active */}
      {(provider === "local" || provider === "auto" || provider === "cloud") && (
        <div className={`mb-4 gap-3 ${provider === "auto" ? "grid grid-cols-2" : "flex"}`}>
          {(provider === "local" || provider === "auto") && (
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--app-text-2)" }}>
                Local (Ollama) Image Size
              </label>
              <select
                value={localMaxDim}
                onChange={(e) => setLocalMaxDim(Number(e.target.value))}
                className="h-9 w-full rounded-lg px-3 text-sm outline-none"
                style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)", color: "var(--app-text-1)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(40,215,104,0.22)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--app-border)")}
              >
                {[256, 384, 512, 672, 768, 1024, 1280].map((px) => (
                  <option key={px} value={px}>{px}px{px === 512 ? " (default)" : ""}</option>
                ))}
              </select>
              <p className="mt-1 text-xs" style={{ color: "var(--app-text-3)" }}>Lower = less VRAM</p>
            </div>
          )}
          {(provider === "cloud" || provider === "auto") && (
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--app-text-2)" }}>
                Cloud AI Image Size
              </label>
              <select
                value={cloudMaxDim}
                onChange={(e) => setCloudMaxDim(Number(e.target.value))}
                className="h-9 w-full rounded-lg px-3 text-sm outline-none"
                style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)", color: "var(--app-text-1)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(40,215,104,0.22)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--app-border)")}
              >
                {[512, 768, 1024, 1280, 1536, 2048].map((px) => (
                  <option key={px} value={px}>{px}px{px === 1024 ? " (default)" : ""}</option>
                ))}
              </select>
              <p className="mt-1 text-xs" style={{ color: "var(--app-text-3)" }}>Higher = better detail</p>
            </div>
          )}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer"
        style={{ background: "#28d768", color: "#0a0a0a" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#22c55e")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#28d768")}
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" />
            Saved
          </>
        ) : (
          "Save AI Settings"
        )}
      </button>
    </div>
  )
}
