"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useTheme } from "next-themes"
import {
  Link2,
  Bell,
  Database,
  Palette,
  Shield,
  Check,
  ExternalLink,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Clock,
  Sun,
  Moon,
  Monitor,
  FileJson,
  FileText,
  AlertTriangle,
  Loader2,
  ScrollText,
  CheckCircle2,
  Disc3,
  Clipboard,
  ClipboardCheck,
} from "lucide-react"
import { toast } from "sonner"
import { useVinylVault } from "../../context"
import type { VinylRecord } from "../../types"

type SettingsTab = "integrations" | "notifications" | "data" | "appearance" | "privacy" | "logs"

const tabs: { id: SettingsTab; label: string; icon: typeof Link2 }[] = [
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data", icon: Database },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "logs", label: "Logs", icon: ScrollText },
]

interface TabIndicatorStyle {
  left: number
  width: number
  transition: string
}

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("integrations")

  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const prevTabRef = useRef<SettingsTab>(activeTab)
  const stretchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [indicator, setIndicator] = useState<TabIndicatorStyle>({ left: 0, width: 0, transition: "none" })

  const getRect = useCallback((tabId: SettingsTab) => {
    const idx = tabs.findIndex((t) => t.id === tabId)
    const btn = btnRefs.current[idx]
    if (!btn) return null
    return { left: btn.offsetLeft, width: btn.offsetWidth }
  }, [])

  // Init pill on mount
  useEffect(() => {
    const rect = getRect(activeTab)
    if (rect) setIndicator({ ...rect, transition: "none" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stretch-snap animation on tab change
  useEffect(() => {
    if (prevTabRef.current === activeTab) return
    const prev = getRect(prevTabRef.current)
    const next = getRect(activeTab)
    prevTabRef.current = activeTab
    if (!prev || !next) return

    const stretchLeft = Math.min(prev.left, next.left)
    const stretchWidth = Math.max(prev.left + prev.width, next.left + next.width) - stretchLeft

    setIndicator({
      left: stretchLeft,
      width: stretchWidth,
      transition: "left 100ms cubic-bezier(0.16, 1, 0.3, 1), width 100ms cubic-bezier(0.16, 1, 0.3, 1)",
    })

    stretchTimerRef.current = setTimeout(() => {
      setIndicator({
        left: next.left,
        width: next.width,
        transition: "left 300ms cubic-bezier(0.16, 1, 0.3, 1), width 220ms cubic-bezier(0.16, 1, 0.3, 1)",
      })
    }, 90)
  }, [activeTab, getRect])

  useEffect(() => () => clearTimeout(stretchTimerRef.current), [])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Horizontal tab bar with pill indicator */}
      <div
        className="shrink-0 overflow-x-auto px-6 pt-5"
        style={{ borderBottom: "1px solid var(--app-border-md)" }}
      >
        <div className="relative flex gap-0.5 min-w-max">
          {/* Floating pill */}
          <div
            aria-hidden
            className="absolute bottom-0 h-8 rounded-lg"
            style={{
              left: indicator.left,
              width: indicator.width,
              transition: indicator.transition,
              background: "var(--app-green-bg)",
              boxShadow: "inset 0 0 0 1px var(--app-green-border)",
            }}
          />

          {tabs.map((tab, idx) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                ref={(el) => { btnRefs.current[idx] = el }}
                onClick={() => setActiveTab(tab.id)}
                className="relative z-10 flex items-center gap-2 px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer rounded-lg"
                style={{
                  color: isActive ? "var(--app-green)" : "var(--app-text-3)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = "var(--app-text-2)"
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = "var(--app-text-3)"
                }}
              >
                <tab.icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl">
          {activeTab === "integrations" && <IntegrationsSettings />}
          {activeTab === "notifications" && <NotificationsSettings />}
          {activeTab === "data" && <DataSettings />}
          {activeTab === "appearance" && <AppearanceSettings />}
          {activeTab === "privacy" && <PrivacySettings />}
          {activeTab === "logs" && <LogsSettings />}
        </div>
      </div>
    </div>
  )
}

// ── Integrations ─────────────────────────────────────────────────────────────

function IntegrationsSettings() {
  const { autoSkipEnabled, setAutoSkipEnabled } = useVinylVault()
  const [apiKeys, setApiKeys] = useState({ chatgpt: "", gemini: "" })
  const [showApiKeys, setShowApiKeys] = useState({ chatgpt: false, gemini: false })
  const [apiKeySet, setApiKeySet] = useState({ openai: false, gemini: false })
  const [apiKeySaving, setApiKeySaving] = useState(false)
  const [apiKeySaved, setApiKeySaved] = useState(false)

  const [ollamaStatus, setOllamaStatus] = useState<"idle" | "checking" | "connected" | "not_found">("idle")

  // Check which API keys are already stored and whether Ollama is running
  useEffect(() => {
    async function init() {
      try {
        const { invoke } = await import("@tauri-apps/api/core")
        const [openaiSet, geminiSet] = await Promise.all([
          invoke<boolean>("check_api_key", { provider: "openai" }),
          invoke<boolean>("check_api_key", { provider: "gemini" }),
        ])
        setApiKeySet({ openai: openaiSet, gemini: geminiSet })

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

// ── Logs ─────────────────────────────────────────────────────────────────────

function LogsSettings() {
  const { scanErrors, clearScanErrors } = useVinylVault()
  const [logContent, setLogContent] = useState<string | null>(null)
  const [logLoading, setLogLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  const fetchLog = useCallback(async () => {
    setLogLoading(true)
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      const content = await invoke<string>("read_scan_log")
      setLogContent(content)
    } catch {
      setLogContent(null)
    } finally {
      setLogLoading(false)
    }
  }, [])

  useEffect(() => { fetchLog() }, [fetchLog])

  useEffect(() => {
    if (logContent !== null && logEndRef.current) {
      logEndRef.current.scrollIntoView()
    }
  }, [logContent])

  const handleClearLog = useCallback(async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      await invoke("clear_scan_log")
      setLogContent("")
    } catch { /* ignore */ }
  }, [])

  const handleCopy = useCallback(async () => {
    if (!logContent) return
    await navigator.clipboard.writeText(logContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [logContent])

  function renderLogLine(line: string, idx: number) {
    const m = line.match(/^(\[[^\]]+\])\s(.*)$/)
    if (m) {
      const [, timestamp, rest] = m
      const errorIdx = rest.indexOf("ERROR:")
      if (errorIdx !== -1) {
        return (
          <div key={idx} className="px-4 py-px hover:bg-white/[0.02]">
            <span style={{ color: "var(--app-green)", opacity: 0.6 }}>{timestamp} </span>
            <span style={{ color: "#f59e0b", fontWeight: 500 }}>ERROR: </span>
            <span style={{ color: "var(--app-text-2)" }}>{rest.slice(errorIdx + 7)}</span>
          </div>
        )
      }
    }
    if (line.trim().startsWith("context:")) {
      return (
        <div key={idx} className="px-4 py-px">
          <span style={{ color: "var(--app-text-3)" }}>{line}</span>
        </div>
      )
    }
    return (
      <div key={idx} className="px-4 py-px">
        <span style={{ color: "var(--app-text-3)" }}>{line || "\u00a0"}</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Section 1: In-memory scan errors ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-5 rounded-full shrink-0" style={{ background: "var(--app-green)" }} />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--app-text-1)" }}>
                Recent Scan Errors
                {scanErrors.length > 0 && (
                  <span className="ml-2 font-mono text-[10px]" style={{ color: "var(--app-text-3)" }}>
                    ({scanErrors.length})
                  </span>
                )}
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--app-text-3)" }}>
                In-memory · cleared on restart
              </p>
            </div>
          </div>
          {scanErrors.length > 0 && (
            <button
              onClick={clearScanErrors}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              style={{ color: "var(--app-text-3)", border: "1px solid var(--app-border)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--app-text-1)"; e.currentTarget.style.borderColor = "var(--app-text-3)" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--app-text-3)"; e.currentTarget.style.borderColor = "var(--app-border)" }}
            >
              <Trash2 className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        {scanErrors.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 rounded-xl gap-3"
            style={{ border: "1px solid var(--app-border)", background: "var(--app-surface-3)" }}
          >
            <CheckCircle2 className="h-7 w-7" style={{ color: "var(--app-green)", opacity: 0.7 }} />
            <p className="text-xs" style={{ color: "var(--app-text-3)" }}>No scan errors — everything looks good</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--app-border)" }}>
            {scanErrors.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors"
                style={{ borderColor: "var(--app-border)", background: "var(--app-surface-3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--app-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--app-surface-3)")}
              >
                {/* Thumbnail */}
                <div
                  className="shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center"
                  style={{ background: "var(--app-border)" }}
                >
                  {entry.capturedImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.capturedImage} alt="Scan" className="w-full h-full object-cover" />
                  ) : (
                    <Disc3 className="h-5 w-5" style={{ color: "var(--app-text-3)" }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium truncate"
                    style={{ color: "var(--app-text-2)" }}
                    title={entry.message}
                  >
                    {entry.message}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--app-text-3)" }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>

                {/* Provider badge */}
                {entry.provider && entry.provider !== "auto" && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                    style={{ background: "var(--app-border)", color: "var(--app-text-3)", border: "1px solid var(--app-border)" }}
                  >
                    {entry.provider}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Persistent log file ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-5 rounded-full shrink-0" style={{ background: "var(--app-green)" }} />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--app-text-1)" }}>
                Persistent Log File
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--app-text-3)" }}>
                Survives restarts · last 500 lines kept
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchLog}
              className="p-1.5 rounded-lg cursor-pointer transition-colors"
              style={{ color: "var(--app-text-3)", border: "1px solid var(--app-border)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--app-text-1)"; e.currentTarget.style.borderColor = "var(--app-text-3)" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--app-text-3)"; e.currentTarget.style.borderColor = "var(--app-border)" }}
              title="Refresh"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <button
              onClick={handleCopy}
              disabled={!logContent}
              className="p-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-30"
              style={{ color: copied ? "var(--app-green)" : "var(--app-text-3)", border: `1px solid ${copied ? "var(--app-green)" : "var(--app-border)"}` }}
              onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.color = "var(--app-text-1)"; e.currentTarget.style.borderColor = "var(--app-text-3)" } }}
              onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.color = "var(--app-text-3)"; e.currentTarget.style.borderColor = "var(--app-border)" } }}
              title="Copy log"
            >
              {copied ? <ClipboardCheck className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
            </button>
            <button
              onClick={handleClearLog}
              className="p-1.5 rounded-lg cursor-pointer transition-colors"
              style={{ color: "var(--app-text-3)", border: "1px solid var(--app-border)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "#ef4444" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--app-text-3)"; e.currentTarget.style.borderColor = "var(--app-border)" }}
              title="Clear log file"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--app-border)" }}>
          {logLoading ? (
            <div className="flex items-center justify-center py-10" style={{ background: "#0a0a0a" }}>
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--app-text-3)" }} />
            </div>
          ) : !logContent ? (
            <div className="flex items-center justify-center py-10" style={{ background: "#0a0a0a" }}>
              <p className="text-xs font-mono" style={{ color: "var(--app-text-3)" }}>No log entries yet</p>
            </div>
          ) : (
            <div
              className="max-h-80 overflow-y-auto py-2 text-xs font-mono leading-5"
              style={{ background: "#0a0a0a" }}
            >
              {logContent.split("\n").map((line, i) => renderLogLine(line, i))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────────

function NotificationsSettings() {
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    newReleases: false,
    weeklyDigest: true,
    marketTrends: false,
  })

  return (
    <div>
      <SectionHeader title="Notifications" subtitle="Choose what updates you want to receive" />
      <WipBanner description="Notification delivery is not yet implemented. These settings will be saved but no alerts will be sent." />
      <div className="mt-6 space-y-3">
        <ToggleSetting
          label="Price Alerts"
          description="Get notified when records in your collection change in value"
          enabled={notifications.priceAlerts}
          onChange={(v) => setNotifications({ ...notifications, priceAlerts: v })}
        />
        <ToggleSetting
          label="New Releases"
          description="Updates about new releases from your favorite artists"
          enabled={notifications.newReleases}
          onChange={(v) => setNotifications({ ...notifications, newReleases: v })}
        />
        <ToggleSetting
          label="Weekly Digest"
          description="A summary of your collection stats and market trends"
          enabled={notifications.weeklyDigest}
          onChange={(v) => setNotifications({ ...notifications, weeklyDigest: v })}
        />
        <ToggleSetting
          label="Market Trends"
          description="Insights about vinyl market trends and rare finds"
          enabled={notifications.marketTrends}
          onChange={(v) => setNotifications({ ...notifications, marketTrends: v })}
        />
      </div>
    </div>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────

type ExportFormat = "json" | "csv"

function DataSettings() {
  const { records, trashedRecords, recoverRecord, permanentlyDeleteRecord } = useVinylVault()
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json")
  const [importFormat, setImportFormat] = useState<ExportFormat>("json")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle")
  const [importCount, setImportCount] = useState(0)
  const importInputRef = useRef<HTMLInputElement>(null)

  function getDaysRemaining(deletedAt: number | null | undefined): number {
    if (!deletedAt) return 30
    const expiry = deletedAt + 30 * 24 * 60 * 60 * 1000
    return Math.max(0, Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000)))
  }

  function handleExport() {
    if (exportFormat === "json") {
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" })
      triggerDownload(blob, `vinyl-vault-${today()}.json`)
    } else {
      const headers = ["id", "title", "artist", "year", "genre", "condition", "notes", "dateAdded", "addedBy"]
      const rows = records.map((r) => [
        r.id,
        csvEscape(r.title),
        csvEscape(r.artist),
        r.year,
        csvEscape(r.genre),
        r.condition,
        csvEscape(r.notes ?? ""),
        r.dateAdded,
        csvEscape(r.addedBy ?? ""),
      ])
      const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      triggerDownload(blob, `vinyl-vault-${today()}.csv`)
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        if (importFormat === "json") {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed)) {
            setImportCount(parsed.length)
            setImportStatus("success")
          } else {
            setImportStatus("error")
          }
        } else {
          const lines = text.trim().split("\n")
          // subtract header row
          setImportCount(Math.max(0, lines.length - 1))
          setImportStatus("success")
        }
      } catch {
        setImportStatus("error")
      }
    }
    reader.readAsText(file)
    // reset so same file can be re-selected
    e.target.value = ""
  }

  async function handlePermanentDelete(id: string) {
    setDeletingId(id)
    try {
      await permanentlyDeleteRecord(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <SectionHeader title="Data & Storage" subtitle="Manage your collection data, backups, and trash" />

      {/* ── Deleted Records / Trash ── */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium" style={{ color: "var(--app-text-2)" }}>
            Deleted Records
          </h3>
          {trashedRecords.length > 0 && (
            <span
              className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ background: "var(--app-green-bg)", color: "var(--app-green)" }}
            >
              <Clock className="h-3 w-3" />
              {trashedRecords.length} in trash
            </span>
          )}
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--app-border)" }}
        >
          {/* Header banner */}
          <div
            className="flex items-center gap-2.5 px-4 py-3"
            style={{ background: "var(--app-surface-3)", borderBottom: trashedRecords.length > 0 ? "1px solid var(--app-border)" : "none" }}
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--app-text-3)" }} />
            <p className="text-xs" style={{ color: "var(--app-text-3)" }}>
              Records are automatically and permanently deleted after 30 days.
            </p>
          </div>

          {trashedRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: "var(--app-green-bg)" }}
              >
                <Check className="h-5 w-5" style={{ color: "var(--app-green)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--app-text-2)" }}>
                Trash is empty
              </p>
              <p className="text-xs" style={{ color: "var(--app-text-3)" }}>
                Deleted records will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
              {trashedRecords.map((record) => {
                const daysLeft = getDaysRemaining(record.deletedAt)
                const isUrgent = daysLeft <= 5
                return (
                  <TrashRecordRow
                    key={record.id}
                    record={record}
                    daysLeft={daysLeft}
                    isUrgent={isUrgent}
                    isDeleting={deletingId === record.id}
                    onRecover={() => recoverRecord(record.id)}
                    onPermanentDelete={() => handlePermanentDelete(record.id)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Export ── */}
      <div className="mt-6">
        <h3 className="mb-2.5 text-sm font-medium" style={{ color: "var(--app-text-2)" }}>
          Export Collection
        </h3>
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm" style={{ color: "var(--app-text-1)" }}>
                Download your collection as {exportFormat === "json" ? "JSON" : "CSV"}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--app-text-3)" }}>
                {records.length} record{records.length !== 1 ? "s" : ""} in your collection
              </p>
            </div>
            <FormatToggle value={exportFormat} onChange={setExportFormat} />
          </div>
          <button
            onClick={handleExport}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer"
            style={{
              background: "var(--app-green)",
              color: "hsl(var(--primary-foreground))",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Download className="h-4 w-4" />
            Export Collection
          </button>
        </div>
      </div>

      {/* ── Import ── */}
      <div className="mt-4">
        <h3 className="mb-2.5 flex items-center gap-2 text-sm font-medium" style={{ color: "var(--app-text-2)" }}>
          Import Collection
          <WipTag />
        </h3>
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm" style={{ color: "var(--app-text-1)" }}>
                Import from a {importFormat === "json" ? "JSON" : "CSV"} file
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--app-text-3)" }}>
                Existing records with matching IDs will be updated
              </p>
            </div>
            <FormatToggle value={importFormat} onChange={setImportFormat} />
          </div>

          <input
            id="import-collection-file"
            name="import-collection-file"
            ref={importInputRef}
            type="file"
            accept={importFormat === "json" ? ".json,application/json" : ".csv,text/csv"}
            className="hidden"
            onChange={handleImportFile}
          />

          <button
            onClick={() => { setImportStatus("idle"); importInputRef.current?.click() }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer"
            style={{ border: "1px solid var(--app-border)", color: "var(--app-text-1)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--app-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Upload className="h-4 w-4" />
            Choose File
          </button>

          {importStatus === "success" && (
            <div
              className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
              style={{ background: "var(--app-green-bg)", color: "var(--app-green)" }}
            >
              <Check className="h-4 w-4 shrink-0" />
              Found {importCount} record{importCount !== 1 ? "s" : ""}. Import functionality requires backend support.
            </div>
          )}
          {importStatus === "error" && (
            <div
              className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
              style={{ background: "rgba(245,47,18,0.08)", color: "#f52f12" }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Invalid file format. Please choose a valid {importFormat.toUpperCase()} file.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Trash Record Row ──────────────────────────────────────────────────────────

function TrashRecordRow({
  record,
  daysLeft,
  isUrgent,
  isDeleting,
  onRecover,
  onPermanentDelete,
}: {
  record: VinylRecord
  daysLeft: number
  isUrgent: boolean
  isDeleting: boolean
  onRecover: () => void
  onPermanentDelete: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ background: "var(--app-surface-3)" }}
    >
      {/* Cover — grayscale */}
      <div
        className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg"
        style={{ background: "var(--app-surface-3)" }}
      >
        {record.coverUrl && (
          <div
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${record.coverUrl})`,
              filter: "grayscale(100%) opacity(0.5)",
            }}
          />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: "var(--app-text-2)" }}>
          {record.title}
        </p>
        <p className="truncate text-xs" style={{ color: "var(--app-text-3)" }}>
          {record.artist} · {record.year} · {record.genre}
        </p>
        <div className="mt-1 flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" style={{ color: isUrgent ? "#f52f12" : "var(--app-text-3)" }} />
          <span
            className="text-xs font-medium"
            style={{ color: isUrgent ? "#f52f12" : "var(--app-text-3)" }}
          >
            {daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRecover}
          disabled={isDeleting}
          title="Recover"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
          style={{
            background: "var(--app-green-bg)",
            color: "var(--app-green)",
            border: "1px solid var(--app-green-border)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.80")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <RotateCcw className="h-3 w-3" />
          Recover
        </button>
        <button
          onClick={onPermanentDelete}
          disabled={isDeleting}
          title="Delete forever"
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          style={{ color: "var(--app-text-3)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(245,47,18,0.10)"
            e.currentTarget.style.color = "#f52f12"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = "var(--app-text-3)"
          }}
        >
          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ── Format Toggle ─────────────────────────────────────────────────────────────

function FormatToggle({ value, onChange }: { value: ExportFormat; onChange: (v: ExportFormat) => void }) {
  return (
    <div
      className="flex rounded-lg p-0.5"
      style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
    >
      {(["json", "csv"] as ExportFormat[]).map((fmt) => {
        const active = value === fmt
        return (
          <button
            key={fmt}
            onClick={() => onChange(fmt)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer"
            style={{
              background: active ? "var(--app-green)" : "transparent",
              color: active ? "hsl(var(--primary-foreground))" : "var(--app-text-2)",
            }}
          >
            {fmt === "json" ? <FileJson className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            {fmt.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

// ── Appearance ────────────────────────────────────────────────────────────────

function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const themeOptions: { id: "light" | "dark" | "system"; label: string; Icon: typeof Sun }[] = [
    { id: "light", label: "Light", Icon: Sun },
    { id: "dark", label: "Dark", Icon: Moon },
    { id: "system", label: "System", Icon: Monitor },
  ]

  return (
    <div>
      <SectionHeader title="Appearance" subtitle="Customize how the app looks and feels" />

      <div className="mt-6 space-y-6">
        {/* Theme */}
        <div>
          <h3 className="mb-3 text-sm font-medium" style={{ color: "var(--app-text-2)" }}>Theme</h3>
          <div className="flex gap-3">
            {themeOptions.map(({ id, label, Icon }) => {
              const isActive = mounted ? theme === id : id === "system"
              return (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className="flex flex-1 flex-col items-center gap-3 rounded-xl p-4 transition-all cursor-pointer"
                  style={{
                    background: isActive ? "var(--app-green-bg)" : "var(--app-surface-3)",
                    border: isActive
                      ? "1px solid var(--app-green-border)"
                      : "1px solid var(--app-border)",
                  }}
                >
                  {/* Theme preview swatch */}
                  <div
                    className="h-10 w-10 rounded-lg overflow-hidden"
                    style={{
                      border: id === "light" ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {id === "system" ? (
                      <div className="flex h-full w-full">
                        <div className="flex-1" style={{ background: "#f0f0f0" }} />
                        <div className="flex-1" style={{ background: "#141414" }} />
                      </div>
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center"
                        style={{ background: id === "light" ? "#f0f0f0" : "#141414" }}
                      >
                        <Icon
                          className="h-4 w-4"
                          style={{ color: id === "light" ? "#555" : "#888" }}
                        />
                      </div>
                    )}
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: isActive ? "var(--app-green)" : "var(--app-text-2)" }}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Grid density */}
        <div>
          <h3 className="mb-1 text-sm font-medium flex items-center gap-2" style={{ color: "var(--app-text-2)" }}>
            Grid Density
            <WipTag />
          </h3>
          <p className="mb-3 text-xs" style={{ color: "var(--app-text-3)" }}>Choose how many records to display per row</p>
          <select
            id="grid-density-select"
            name="grid-density-select"
            className="h-9 w-full rounded-lg px-3 text-sm outline-none transition-colors cursor-pointer"
            style={{
              background: "var(--app-surface-3)",
              border: "1px solid var(--app-border)",
              color: "var(--app-text-1)",
            }}
          >
            <option value="comfortable">Comfortable (4 per row)</option>
            <option value="default">Default (5 per row)</option>
            <option value="compact">Compact (6 per row)</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ── Privacy ───────────────────────────────────────────────────────────────────

function PrivacySettings() {
  const [privacy, setPrivacy] = useState({
    publicProfile: false,
    shareCollection: false,
    analytics: true,
  })

  return (
    <div>
      <SectionHeader title="Privacy" subtitle="Control your data and privacy settings" />
      <WipBanner description="Privacy controls and public profile sharing are not yet implemented." />
      <div className="mt-6 space-y-3">
        <ToggleSetting
          label="Public Profile"
          description="Allow others to view your profile and collection stats"
          enabled={privacy.publicProfile}
          onChange={(v) => setPrivacy({ ...privacy, publicProfile: v })}
        />
        <ToggleSetting
          label="Share Collection"
          description="Allow others to view your full collection"
          enabled={privacy.shareCollection}
          onChange={(v) => setPrivacy({ ...privacy, shareCollection: v })}
        />
        <ToggleSetting
          label="Usage Analytics"
          description="Help improve the app by sharing anonymous usage data"
          enabled={privacy.analytics}
          onChange={(v) => setPrivacy({ ...privacy, analytics: v })}
        />
      </div>
    </div>
  )
}

// ── WIP indicators ────────────────────────────────────────────────────────────

function WipTag() {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{
        background: "rgba(245,158,11,0.12)",
        color: "#f59e0b",
        border: "1px solid rgba(245,158,11,0.25)",
      }}
    >
      WIP
    </span>
  )
}

function WipBanner({ description }: { description: string }) {
  return (
    <div
      className="mt-4 flex items-start gap-2.5 rounded-xl p-3.5"
      style={{
        background: "rgba(245,158,11,0.06)",
        border: "1px solid rgba(245,158,11,0.20)",
      }}
    >
      <span className="mt-0.5 shrink-0 text-[13px]">🚧</span>
      <div>
        <p className="text-xs font-semibold" style={{ color: "#f59e0b" }}>Work in Progress</p>
        <p className="mt-0.5 text-xs" style={{ color: "rgba(245,158,11,0.75)" }}>{description}</p>
      </div>
    </div>
  )
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold" style={{ color: "var(--app-text-1)" }}>{title}</h2>
      <p className="mt-1 text-sm" style={{ color: "var(--app-text-3)" }}>{subtitle}</p>
    </div>
  )
}

function ToggleSetting({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string
  description: string
  enabled: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl p-4"
      style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
    >
      <div className="mr-4">
        <h3 className="text-sm font-medium" style={{ color: "var(--app-text-1)" }}>{label}</h3>
        <p className="mt-0.5 text-xs" style={{ color: "var(--app-text-3)" }}>{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className="relative shrink-0 rounded-full cursor-pointer outline-none"
        style={{
          width: "50px",
          height: "30px",
          border: enabled ? "1px solid var(--app-green)" : "1px solid var(--app-border)",
          background: enabled ? "var(--app-green)" : "var(--app-surface-3)",
          transition: "background .4s ease, border-color .4s ease",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <span
          className="absolute block rounded-full bg-white"
          style={{
            height: "28px",
            width: "28px",
            top: "0px",
            left: enabled ? "20px" : "0px",
            boxShadow:
              "0 0 0 1px hsla(0, 0%, 0%, 0.1), 0 4px 0px 0 hsla(0, 0%, 0%, .04), 0 4px 9px hsla(0, 0%, 0%, .13), 0 3px 3px hsla(0, 0%, 0%, .05)",
            transition: "left .35s cubic-bezier(.54, 1.60, .5, 1)",
          }}
        />
      </button>
    </div>
  )
}

// ── AI Provider Settings ──────────────────────────────────────────────────────

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

// ── Utilities ─────────────────────────────────────────────────────────────────

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function today(): string {
  return new Date().toISOString().split("T")[0]
}
