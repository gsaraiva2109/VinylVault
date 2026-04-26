"use client"

import { useState, useEffect } from "react"
import { Check, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useVinylVault } from "../../../context"
import { SectionHeader, ToggleSetting } from "./shared-components"
import { isTauri } from "@/lib/utils"

export function IntegrationsSettings() {
  const { autoSkipEnabled, setAutoSkipEnabled } = useVinylVault()
  const [isOnDesktop, setIsOnDesktop] = useState(true)
  useEffect(() => {
    setIsOnDesktop(isTauri())
  }, [])
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
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    setIsDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

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

      <AiProviderSettings isDesktop={isOnDesktop} />

      <div className="mt-4 space-y-3">
        {/* Discogs — always connected */}
        <div
          className="flex items-center justify-between rounded-xl p-4"
          style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg overflow-hidden"
              style={{ background: isDark ? "#1a1a1a" : "#ff6600" }}
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="white">
                <path d="M1.7422 11.982c0-5.6682 4.61-10.2782 10.2758-10.2782 1.8238 0 3.5372.48 5.0251 1.3175l.8135-1.4879C16.1768.588 14.2474.036 12.1908.0024h-.1944C5.4091.0144.072 5.3107 0 11.886v.1152c.0072 3.4389 1.4567 6.5345 3.7748 8.7207l1.1855-1.2814c-1.9798-1.8743-3.218-4.526-3.218-7.4585zM20.362 3.4053l-1.1543 1.2406c1.903 1.867 3.0885 4.4636 3.0885 7.3361 0 5.6658-4.61 10.2758-10.2758 10.2758-1.783 0-3.4605-.456-4.922-1.2575l-.8542 1.5214c1.7086.9384 3.6692 1.4735 5.7546 1.4759C18.6245 23.9976 24 18.6246 24 11.9988c-.0048-3.3717-1.399-6.4146-3.638-8.5935zM1.963 11.982c0 2.8701 1.2119 5.4619 3.146 7.2953l1.1808-1.2767c-1.591-1.5166-2.587-3.6524-2.587-6.0186 0-4.586 3.7293-8.3152 8.3152-8.3152 1.483 0 2.875.3912 4.082 1.0751l.8351-1.5262C15.481 2.395 13.8034 1.927 12.018 1.927 6.4746 1.9246 1.963 6.4362 1.963 11.982zm18.3702 0c0 4.586-3.7293 8.3152-8.3152 8.3152-1.4327 0-2.7837-.3648-3.962-1.0055l-.852 1.5166c1.4303.7823 3.0718 1.2287 4.814 1.2287 5.5434 0 10.055-4.5116 10.055-10.055 0-2.8077-1.1567-5.3467-3.0165-7.1729l-1.183 1.2743c1.519 1.507 2.4597 3.5924 2.4597 5.8986zm-1.9486 0c0 3.5109-2.8558 6.3642-6.3642 6.3642a6.3286 6.3286 0 01-3.0069-.756l-.8471 1.507c1.147.624 2.4597.9768 3.854.9768 4.4636 0 8.0944-3.6308 8.0944-8.0944 0-2.239-.9143-4.2692-2.3902-5.7378l-1.1783 1.267c1.1351 1.152 1.8383 2.731 1.8383 4.4732zm-14.4586 0c0 2.3014.9671 4.382 2.515 5.8578l1.1734-1.2695c-1.207-1.159-1.9606-2.786-1.9606-4.5883 0-3.5108 2.8557-6.3642 6.3642-6.3642 1.1423 0 2.215.3048 3.1437.8352l.8303-1.5167c-1.1759-.6647-2.5317-1.0487-3.974-1.0487-4.4612 0-8.092 3.6308-8.092 8.0944zm12.5292 0c0 2.4502-1.987 4.4372-4.4372 4.4372a4.4192 4.4192 0 01-2.0614-.5088l-.8351 1.4879a6.1135 6.1135 0 002.8965.727c3.3885 0 6.1434-2.7548 6.1434-6.1433 0-1.6774-.6767-3.1989-1.7686-4.3076l-1.1615 1.2503c.7559.7967 1.2239 1.8718 1.2239 3.0573zm-10.5806 0c0 1.7374.7247 3.3069 1.8886 4.4252L8.92 15.1569l.0144.0144c-.8351-.8063-1.3559-1.9366-1.3559-3.1869 0-2.4502 1.9846-4.4372 4.4372-4.4372.8087 0 1.5646.2184 2.2174.5976l.8207-1.4975a6.097 6.097 0 00-3.0381-.8063c-3.3837-.0048-6.141 2.7525-6.141 6.141zm6.681 0c0 .2952-.2424.5351-.5376.5351-.2952 0-.5375-.24-.5375-.5351 0-.2976.24-.5375.5375-.5375.2952 0 .5375.24.5375.5375zm-3.9405 0c0-1.879 1.5239-3.4029 3.4005-3.4029 1.879 0 3.4005 1.5215 3.4005 3.4029 0 1.879-1.5239 3.4005-3.4005 3.4005S8.6151 13.861 8.6151 11.982zm.1488 0c.0048 1.7974 1.4567 3.2493 3.2517 3.2517 1.795 0 3.254-1.4567 3.254-3.2517-.0023-1.7974-1.4566-3.2517-3.254-3.254-1.795 0-3.2517 1.4566-3.2517 3.254Z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium" style={{ color: "var(--app-text-1)" }}>Discogs</h3>
              <p className="text-xs" style={{ color: "var(--app-text-3)" }}>Fetch record values and metadata</p>
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

        {/* Spotify — status based on stored credentials */}
        <div
          className="flex items-center justify-between rounded-xl p-4"
          style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg overflow-hidden"
              style={{ background: isDark ? "#1a1a1a" : "#fff" }}
            >
              <svg viewBox="0 0 24 24" className="h-9 w-9">
                <path fill="#1ED760" fillRule="evenodd" d="M19.0983701,10.6382791 C15.230178,8.34118115 8.85003755,8.12986439 5.15729493,9.25058527 C4.56433588,9.43062856 3.93727638,9.09580812 3.75758647,8.50284907 C3.57789655,7.90953664 3.91236362,7.28283051 4.50585273,7.10261054 C8.74455585,5.81598127 15.7909802,6.06440214 20.2440037,8.70780512 C20.7774195,9.02442687 20.9525156,9.71332656 20.6362472,10.2456822 C20.3198021,10.779098 19.6305491,10.9549008 19.0983701,10.6382791 M18.971686,14.0407262 C18.7004726,14.4810283 18.1246521,14.6190203 17.6848801,14.3486903 C14.4600027,12.3664473 9.54264764,11.792217 5.72728477,12.9503953 C5.23256328,13.0998719 4.70992535,12.8208843 4.55974204,12.3270462 C4.41061884,11.8323247 4.68978312,11.3107469 5.18362118,11.1602103 C9.5419409,9.83771368 14.9600247,10.4782013 18.6638986,12.7544503 C19.1036707,13.0253103 19.242016,13.6013075 18.971686,14.0407262 M17.5034233,17.308185 C17.2876894,17.6617342 16.827245,17.7725165 16.4749326,17.5571359 C13.6571403,15.8347984 10.1101639,15.4459119 5.93312425,16.4000177 C5.53063298,16.4922479 5.12937851,16.2399399 5.03767834,15.8376253 C4.94544812,15.4351341 5.19669597,15.0338796 5.60024736,14.9420027 C10.1712973,13.8970803 14.0923186,14.3467468 17.2551791,16.2796943 C17.6078449,16.4948982 17.7189805,16.9556959 17.5034233,17.308185 M12,0 C5.37267547,0 0,5.37249879 0,11.9998233 C0,18.6278546 5.37267547,24 12,24 C18.6275012,24 24,18.6278546 24,11.9998233 C24,5.37249879 18.6275012,0 12,0"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium" style={{ color: "var(--app-text-1)" }}>Spotify</h3>
              <p className="text-xs" style={{ color: "var(--app-text-3)" }}>
                {spotifyKeySet.clientId && spotifyKeySet.clientSecret
                  ? "Album linking active on scan"
                  : "Add credentials above to link albums"}
              </p>
            </div>
          </div>
          {spotifyKeySet.clientId && spotifyKeySet.clientSecret ? (
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: "var(--app-green-bg)", color: "var(--app-green)" }}
            >
              <Check className="h-3 w-3" />
              Connected
            </span>
          ) : spotifyKeySet.clientId || spotifyKeySet.clientSecret ? (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: "rgba(255,204,0,0.12)", color: "#f5c400" }}
            >
              Incomplete
            </span>
          ) : (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--app-text-3)" }}
            >
              Not configured
            </span>
          )}
        </div>

        {/* Ollama — desktop only */}
        <div
          className="flex items-center justify-between rounded-xl p-4"
          style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg overflow-hidden"
              style={{ background: isDark ? "#1a1a1a" : "#f0f0f0" }}
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill={isDark ? "white" : "#1a1a1a"}>
                <path d="M16.361 10.26a.9.9 0 0 0-.558.47l-.072.148l.001.207c0 .193.004.217.059.353c.076.193.152.312.291.448c.24.238.51.3.872.205a.86.86 0 0 0 .517-.436a.75.75 0 0 0 .08-.498c-.064-.453-.33-.782-.724-.897a1.1 1.1 0 0 0-.466 0m-9.203.005c-.305.096-.533.32-.65.639a1.2 1.2 0 0 0-.06.52c.057.309.31.59.598.667c.362.095.632.033.872-.205c.14-.136.215-.255.291-.448c.055-.136.059-.16.059-.353l.001-.207l-.072-.148a.9.9 0 0 0-.565-.472a1 1 0 0 0-.474.007m4.184 2c-.131.071-.223.25-.195.383c.031.143.157.288.353.407c.105.063.112.072.117.136c.004.038-.01.146-.029.243c-.02.094-.036.194-.036.222c.002.074.07.195.143.253c.064.052.076.054.255.059c.164.005.198.001.264-.03c.169-.082.212-.234.15-.525c-.052-.243-.042-.28.087-.355c.137-.08.281-.219.324-.314a.365.365 0 0 0-.175-.48a.4.4 0 0 0-.181-.033c-.126 0-.207.03-.355.124l-.085.053l-.053-.032c-.219-.13-.259-.145-.391-.143a.4.4 0 0 0-.193.032m.39-2.195c-.373.036-.475.05-.654.086a4.5 4.5 0 0 0-.951.328c-.94.46-1.589 1.226-1.787 2.114c-.04.176-.045.234-.045.53c0 .294.005.357.043.524c.264 1.16 1.332 2.017 2.714 2.173c.3.033 1.596.033 1.896 0c1.11-.125 2.064-.727 2.493-1.571c.114-.226.169-.372.22-.602c.039-.167.044-.23.044-.523c0-.297-.005-.355-.045-.531c-.288-1.29-1.539-2.304-3.072-2.497a7 7 0 0 0-.855-.031zm.645.937a3.3 3.3 0 0 1 1.44.514c.223.148.537.458.671.662c.166.251.26.508.303.82c.02.143.01.251-.043.482c-.08.345-.332.705-.672.957a3 3 0 0 1-.689.348c-.382.122-.632.144-1.525.138c-.582-.006-.686-.01-.853-.042q-.856-.16-1.35-.68c-.264-.28-.385-.535-.45-.946c-.03-.192.025-.509.137-.776c.136-.326.488-.73.836-.963c.403-.269.934-.46 1.422-.512c.187-.02.586-.02.773-.002m-5.503-11a1.65 1.65 0 0 0-.683.298C5.617.74 5.173 1.666 4.985 2.819c-.07.436-.119 1.04-.119 1.503c0 .544.064 1.24.155 1.721c.02.107.031.202.023.208l-.187.152a5.3 5.3 0 0 0-.949 1.02a5.5 5.5 0 0 0-.94 2.339a6.6 6.6 0 0 0-.023 1.357c.091.78.325 1.438.727 2.04l.13.195l-.037.064c-.269.452-.498 1.105-.605 1.732c-.084.496-.095.629-.095 1.294c0 .67.009.803.088 1.266c.095.555.288 1.143.503 1.534c.071.128.243.393.264.407c.007.003-.014.067-.046.141a7.4 7.4 0 0 0-.548 1.873a5 5 0 0 0-.071.991c0 .56.031.832.148 1.279L3.42 24h1.478l-.05-.091c-.297-.552-.325-1.575-.068-2.597c.117-.472.25-.819.498-1.296l.148-.29v-.177c0-.165-.003-.184-.057-.293a.9.9 0 0 0-.194-.25a1.7 1.7 0 0 1-.385-.543c-.424-.92-.506-2.286-.208-3.451c.124-.486.329-.918.544-1.154a.8.8 0 0 0 .223-.531c0-.195-.07-.355-.224-.522a3.14 3.14 0 0 1-.817-1.729c-.14-.96.114-2.005.69-2.834c.563-.814 1.353-1.336 2.237-1.475c.199-.033.57-.028.776.01c.226.04.367.028.512-.041c.179-.085.268-.19.374-.431c.093-.215.165-.333.36-.576c.234-.29.46-.489.822-.729c.413-.27.884-.467 1.352-.561c.17-.035.25-.04.569-.04s.398.005.569.04a4.07 4.07 0 0 1 1.914.997c.117.109.398.457.488.602c.034.057.095.177.132.267c.105.241.195.346.374.43c.14.068.286.082.503.045c.343-.058.607-.053.943.016c1.144.23 2.14 1.173 2.581 2.437c.385 1.108.276 2.267-.296 3.153c-.097.15-.193.27-.333.419c-.301.322-.301.722-.001 1.053c.493.539.801 1.866.708 3.036c-.062.772-.26 1.463-.533 1.854a2 2 0 0 1-.224.258a.9.9 0 0 0-.194.25c-.054.109-.057.128-.057.293v.178l.148.29c.248.476.38.823.498 1.295c.253 1.008.231 2.01-.059 2.581a1 1 0 0 0-.044.098c0 .006.329.009.732.009h.73l.02-.074l.036-.134c.019-.076.057-.3.088-.516a9 9 0 0 0 0-1.258c-.11-.875-.295-1.57-.597-2.226c-.032-.074-.053-.138-.046-.141a1.4 1.4 0 0 0 .108-.152c.376-.569.607-1.284.724-2.228c.031-.26.031-1.378 0-1.628c-.083-.645-.182-1.082-.348-1.525a6 6 0 0 0-.329-.7l-.038-.064l.131-.194c.402-.604.636-1.262.727-2.04a6.6 6.6 0 0 0-.024-1.358a5.5 5.5 0 0 0-.939-2.339a5.3 5.3 0 0 0-.95-1.02l-.186-.152a.7.7 0 0 1 .023-.208c.208-1.087.201-2.443-.017-3.503c-.19-.924-.535-1.658-.98-2.082c-.354-.338-.716-.482-1.15-.455c-.996.059-1.8 1.205-2.116 3.01a7 7 0 0 0-.097.726c0 .036-.007.066-.015.066a1 1 0 0 1-.149-.078A4.86 4.86 0 0 0 12 3.03c-.832 0-1.687.243-2.456.698a1 1 0 0 1-.148.078c-.008 0-.015-.03-.015-.066a7 7 0 0 0-.097-.725C8.997 1.392 8.337.319 7.46.048a2 2 0 0 0-.585-.041Zm.293 1.402c.248.197.523.759.682 1.388c.03.113.06.244.069.292c.007.047.026.152.041.233c.067.365.098.76.102 1.24l.002.475l-.12.175l-.118.178h-.278c-.324 0-.646.041-.954.124l-.238.06c-.033.007-.038-.003-.057-.144a8.4 8.4 0 0 1 .016-2.323c.124-.788.413-1.501.696-1.711c.067-.05.079-.049.157.013m9.825-.012c.17.126.358.46.498.888c.28.854.36 2.028.212 3.145c-.019.14-.024.151-.057.144l-.238-.06a3.7 3.7 0 0 0-.954-.124h-.278l-.119-.178l-.119-.175l.002-.474c.004-.669.066-1.19.214-1.772c.157-.623.434-1.185.68-1.382c.078-.062.09-.063.159-.012"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium" style={{ color: "var(--app-text-1)" }}>Ollama</h3>
              <p className="text-xs" style={{ color: "var(--app-text-3)" }}>
                {isOnDesktop
                  ? "AI-powered record recognition (local, private)"
                  : "Local AI recognition — available only in the desktop app"}
              </p>
            </div>
          </div>
          {!isOnDesktop ? (
            <a
              href="https://github.com/gsaraiva2109/VinylVault/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              style={{ border: "1px solid var(--app-border)", color: "var(--app-text-2)" }}
            >
              Get desktop app <ExternalLink className="h-3 w-3" />
            </a>
          ) : ollamaStatus === "connected" ? (
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

function AiProviderSettings({ isDesktop = true }: { isDesktop?: boolean }) {
  const [provider, setProvider] = useState<"auto" | "local" | "cloud">(isDesktop ? "auto" : "cloud")
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
    if (isDesktop) {
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
        return
      }
    } else {
      toast.success("Cloud AI settings saved")
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
        {isDesktop
          ? "Choose which AI model identifies vinyl records from your camera"
          : "Configure cloud AI for vinyl record recognition"}
      </p>

      {/* Provider pills — desktop shows all 3; web shows cloud only */}
      {isDesktop && (
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
      )}

      {/* Ollama model selector — desktop only */}
      {isDesktop && (provider === "local" || provider === "auto") && (
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
        <div className={`mb-4 gap-3 ${isDesktop && provider === "auto" ? "grid grid-cols-2" : "flex"}`}>
          {isDesktop && (provider === "local" || provider === "auto") && (
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
