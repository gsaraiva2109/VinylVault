"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
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
} from "lucide-react"

type SettingsTab = "integrations" | "notifications" | "data" | "appearance" | "privacy"

const tabs: { id: SettingsTab; label: string; icon: typeof Link2 }[] = [
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data", icon: Database },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy", icon: Shield },
]

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("integrations")

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Horizontal tab bar */}
      <div
        className="shrink-0 overflow-x-auto px-6 pt-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex gap-0.5 min-w-max pb-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer rounded-t-lg"
                style={{
                  color: isActive ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.35)",
                  background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                  borderBottom: isActive ? "2px solid #28d768" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.60)"
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.35)"
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
        </div>
      </div>
    </div>
  )
}

function IntegrationsSettings() {
  const [apiKeys, setApiKeys] = useState({
    chatgpt: "",
    gemini: "",
  })
  const [showApiKeys, setShowApiKeys] = useState({
    chatgpt: false,
    gemini: false,
  })

  const integrations = [
    {
      id: "discogs",
      name: "Discogs",
      description: "Connect to fetch record values and metadata",
      connected: true,
    },
    {
      id: "ollama",
      name: "Ollama",
      description: "AI-powered record recognition",
      connected: false,
    },
  ]

  return (
    <div>
      <SectionHeader
        title="Integrations"
        subtitle="Connect third-party services to enhance your experience"
      />

      {/* AI API Keys */}
      <div
        className="mt-6 rounded-xl p-5"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <h3 className="mb-1 text-sm font-semibold text-white/85">AI Integration Keys</h3>
        <p className="mb-4 text-xs text-white/40">
          Add API keys for ChatGPT and Gemini to enable AI-powered features
        </p>
        <div className="space-y-3">
          {(["chatgpt", "gemini"] as const).map((key) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-medium text-white/50">
                {key === "chatgpt" ? "ChatGPT API Key" : "Gemini API Key"}
              </label>
              <div className="flex gap-2">
                <input
                  type={showApiKeys[key] ? "text" : "password"}
                  value={apiKeys[key]}
                  onChange={(e) => setApiKeys({ ...apiKeys, [key]: e.target.value })}
                  placeholder={key === "chatgpt" ? "sk-..." : "AIza..."}
                  className="h-9 flex-1 rounded-lg px-3 text-sm text-white/85 placeholder-white/25 outline-none transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(40,215,104,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                />
                <button
                  onClick={() => setShowApiKeys({ ...showApiKeys, [key]: !showApiKeys[key] })}
                  className="h-9 rounded-lg px-3 text-xs font-medium text-white/40 transition-colors cursor-pointer"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.70)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.40)")}
                >
                  {showApiKeys[key] ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          ))}
          <PrimaryButton className="mt-2">Save API Keys</PrimaryButton>
        </div>
      </div>

      {/* Service integrations */}
      <div className="mt-4 space-y-3">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="flex items-center justify-between rounded-xl p-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white/50"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                {integration.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-medium text-white/85">{integration.name}</h3>
                <p className="text-xs text-white/40">{integration.description}</p>
              </div>
            </div>
            {integration.connected ? (
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{
                    background: "rgba(40,215,104,0.12)",
                    color: "#28d768",
                  }}
                >
                  <Check className="h-3 w-3" />
                  Connected
                </span>
                <GhostButton>Disconnect</GhostButton>
              </div>
            ) : (
              <button
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                style={{ background: "#28d768", color: "#0a0a0a" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#22c55e")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#28d768")}
              >
                Connect
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function NotificationsSettings() {
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    newReleases: false,
    weeklyDigest: true,
    marketTrends: false,
  })

  return (
    <div>
      <SectionHeader
        title="Notifications"
        subtitle="Choose what updates you want to receive"
      />
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

function DataSettings() {
  return (
    <div>
      <SectionHeader title="Data & Storage" subtitle="Manage your collection data and backups" />

      <div className="mt-6 space-y-4">
        {/* Storage bar */}
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-white/75">Storage Used</span>
            <span className="text-white/35">2.4 MB of 100 MB</span>
          </div>
          <div
            className="mt-2.5 h-1.5 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: "2.4%", background: "#28d768" }}
            />
          </div>
        </div>

        {/* Export / Import */}
        <div>
          <h3 className="mb-2.5 text-sm font-medium text-white/55">Export & Import</h3>
          <div className="flex gap-3">
            <GhostButton className="flex flex-1 items-center justify-center gap-2 py-3">
              <Download className="h-4 w-4" />
              Export Collection
            </GhostButton>
            <GhostButton className="flex flex-1 items-center justify-center gap-2 py-3">
              <Upload className="h-4 w-4" />
              Import Collection
            </GhostButton>
          </div>
        </div>

        {/* Danger zone */}
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(245,47,18,0.07)",
            border: "1px solid rgba(245,47,18,0.18)",
          }}
        >
          <h3 className="text-sm font-medium" style={{ color: "#f52f12" }}>
            Danger Zone
          </h3>
          <p className="mt-1 text-sm" style={{ color: "rgba(245,47,18,0.75)" }}>
            Permanently delete all your collection data. This action cannot be undone.
          </p>
          <button
            className="mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer"
            style={{ background: "#f52f12" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#d92a10")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f52f12")}
          >
            <Trash2 className="h-4 w-4" />
            Delete All Data
          </button>
        </div>
      </div>
    </div>
  )
}

function AppearanceSettings() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark")

  return (
    <div>
      <SectionHeader title="Appearance" subtitle="Customize how the app looks and feels" />

      <div className="mt-6 space-y-6">
        {/* Theme */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-white/55">Theme</h3>
          <div className="flex gap-3">
            {(["light", "dark", "system"] as const).map((t) => {
              const isActive = theme === t
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="flex flex-1 flex-col items-center gap-2.5 rounded-xl p-4 transition-all cursor-pointer"
                  style={{
                    background: isActive ? "rgba(40,215,104,0.08)" : "rgba(255,255,255,0.03)",
                    border: isActive
                      ? "1px solid rgba(40,215,104,0.30)"
                      : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="h-10 w-10 rounded-lg"
                    style={{
                      background:
                        t === "light"
                          ? "#e8e8e8"
                          : t === "dark"
                          ? "#141414"
                          : "linear-gradient(135deg, #e8e8e8 50%, #141414 50%)",
                      border: t === "light" ? "1px solid rgba(0,0,0,0.1)" : "none",
                    }}
                  />
                  <span
                    className="text-xs font-medium capitalize"
                    style={{ color: isActive ? "#28d768" : "rgba(255,255,255,0.50)" }}
                  >
                    {t}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Grid density */}
        <div>
          <h3 className="mb-1.5 text-sm font-medium text-white/55">Grid Density</h3>
          <p className="mb-3 text-xs text-white/35">Choose how many records to display per row</p>
          <select
            className="h-9 w-full rounded-lg px-3 text-sm text-white/85 outline-none transition-colors cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            <option value="comfortable" style={{ background: "#141414" }}>
              Comfortable (4 per row)
            </option>
            <option value="default" style={{ background: "#141414" }}>
              Default (5 per row)
            </option>
            <option value="compact" style={{ background: "#141414" }}>
              Compact (6 per row)
            </option>
          </select>
        </div>
      </div>
    </div>
  )
}

function PrivacySettings() {
  const [privacy, setPrivacy] = useState({
    publicProfile: false,
    shareCollection: false,
    analytics: true,
  })

  return (
    <div>
      <SectionHeader title="Privacy" subtitle="Control your data and privacy settings" />
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

// ── Shared primitives ───────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white/90">{title}</h2>
      <p className="mt-1 text-sm text-white/40">{subtitle}</p>
    </div>
  )
}

function PrimaryButton({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer",
        className
      )}
      style={{ background: "#28d768", color: "#0a0a0a" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#22c55e")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#28d768")}
    >
      {children}
    </button>
  )
}

function GhostButton({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium text-white/50 transition-colors cursor-pointer",
        className
      )}
      style={{ border: "1px solid rgba(255,255,255,0.09)" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.80)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.50)")}
    >
      {children}
    </button>
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
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="mr-4">
        <h3 className="text-sm font-medium text-white/85">{label}</h3>
        <p className="mt-0.5 text-xs text-white/35">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer"
        style={{
          background: enabled ? "#28d768" : "rgba(255,255,255,0.10)",
        }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
          style={{
            left: enabled ? "22px" : "2px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
          }}
        />
      </button>
    </div>
  )
}
