"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  User,
  Link2,
  Bell,
  Database,
  Palette,
  Shield,
  ChevronRight,
  Check,
  ExternalLink,
  Trash2,
  Download,
  Upload,
} from "lucide-react"

type SettingsTab = "profile" | "integrations" | "notifications" | "data" | "appearance" | "privacy"

const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data & Storage", icon: Database },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy", icon: Shield },
]

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl">
          {activeTab === "profile" && <ProfileSettings />}
          {activeTab === "integrations" && <IntegrationsSettings />}
          {activeTab === "notifications" && <NotificationsSettings />}
          {activeTab === "data" && <DataSettings />}
          {activeTab === "appearance" && <AppearanceSettings />}
          {activeTab === "privacy" && <PrivacySettings />}
        </div>
      </main>
    </div>
  )
}

function ProfileSettings() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Profile</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Manage your account details and preferences
      </p>

      <div className="mt-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            VC
          </div>
          <div>
            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
              Change Avatar
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <SettingsField label="Display Name" defaultValue="Vinyl Collector" />
          <SettingsField label="Email" defaultValue="collector@example.com" type="email" />
          <SettingsField label="Username" defaultValue="vinylcollector" />
        </div>

        <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
            Save Changes
          </button>
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
      icon: "https://www.discogs.com/images/brand/discogs-logo.png",
    },
    {
      id: "spotify",
      name: "Spotify",
      description: "Stream music from your collection",
      connected: true,
      icon: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg",
    },
    {
      id: "ollama",
      name: "Ollama",
      description: "AI-powered record recognition",
      connected: false,
      icon: null,
    },
  ]

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Integrations</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Connect third-party services to enhance your experience
      </p>

      {/* API Keys Section */}
      <div className="mt-8 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">AI Integration Keys</h3>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Add your API keys for ChatGPT and Gemini to enable AI-powered features
        </p>
        <div className="space-y-4">
          {/* ChatGPT API Key */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              ChatGPT API Key
            </label>
            <div className="relative flex gap-2">
              <input
                type={showApiKeys.chatgpt ? "text" : "password"}
                value={apiKeys.chatgpt}
                onChange={(e) => setApiKeys({ ...apiKeys, chatgpt: e.target.value })}
                placeholder="sk-..."
                className="flex-1 h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-600"
              />
              <button
                onClick={() => setShowApiKeys({ ...showApiKeys, chatgpt: !showApiKeys.chatgpt })}
                className="h-10 px-3 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {showApiKeys.chatgpt ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Gemini API Key */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Gemini API Key
            </label>
            <div className="relative flex gap-2">
              <input
                type={showApiKeys.gemini ? "text" : "password"}
                value={apiKeys.gemini}
                onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                placeholder="AIza..."
                className="flex-1 h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-600"
              />
              <button
                onClick={() => setShowApiKeys({ ...showApiKeys, gemini: !showApiKeys.gemini })}
                className="h-10 px-3 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {showApiKeys.gemini ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
            Save API Keys
          </button>
        </div>
      </div>

      {/* Service Integrations */}
      <div className="mt-6 space-y-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                {integration.icon ? (
                  <span className="text-lg font-bold text-zinc-600 dark:text-zinc-300">
                    {integration.name.charAt(0)}
                  </span>
                ) : (
                  <span className="text-lg font-bold text-zinc-600 dark:text-zinc-300">
                    {integration.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {integration.name}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {integration.description}
                </p>
              </div>
            </div>
            {integration.connected ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Check className="h-3 w-3" />
                  Connected
                </span>
                <button className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
                  Disconnect
                </button>
              </div>
            ) : (
              <button className="flex items-center gap-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                Connect
                <ExternalLink className="h-3.5 w-3.5" />
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
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Choose what updates you want to receive
      </p>

      <div className="mt-6 space-y-4">
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
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Data & Storage</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Manage your collection data and backups
      </p>

      <div className="mt-6 space-y-6">
        {/* Storage Usage */}
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Storage Used
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">2.4 MB of 100 MB</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full w-[2.4%] rounded-full bg-zinc-900 dark:bg-zinc-100" />
          </div>
        </div>

        {/* Export/Import */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Export & Import
          </h3>
          <div className="flex gap-3">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
              <Download className="h-4 w-4" />
              Export Collection
            </button>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
              <Upload className="h-4 w-4" />
              Import Collection
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
          <h3 className="text-sm font-medium text-red-700 dark:text-red-400">Danger Zone</h3>
          <p className="mt-1 text-sm text-red-600 dark:text-red-500">
            Permanently delete all your collection data. This action cannot be undone.
          </p>
          <button className="mt-3 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
            <Trash2 className="h-4 w-4" />
            Delete All Data
          </button>
        </div>
      </div>
    </div>
  )
}

function AppearanceSettings() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Appearance</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Customize how the app looks and feels
      </p>

      <div className="mt-6 space-y-6">
        {/* Theme */}
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Theme</h3>
          <div className="mt-3 flex gap-3">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
                  theme === t
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                )}
              >
                <div
                  className={cn(
                    "h-12 w-12 rounded-lg",
                    t === "light" && "border border-zinc-200 bg-white",
                    t === "dark" && "bg-zinc-800",
                    t === "system" && "bg-gradient-to-br from-white to-zinc-800"
                  )}
                />
                <span className="text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">
                  {t}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid Density */}
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Grid Density</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Choose how many records to display per row
          </p>
          <div className="mt-3">
            <select className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-600">
              <option value="comfortable">Comfortable (4 per row)</option>
              <option value="default">Default (5 per row)</option>
              <option value="compact">Compact (6 per row)</option>
            </select>
          </div>
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
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Privacy</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Control your data and privacy settings
      </p>

      <div className="mt-6 space-y-4">
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

function SettingsField({
  label,
  defaultValue,
  type = "text",
}: {
  label: string
  defaultValue: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        type={type}
        defaultValue={defaultValue}
        className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-600"
      />
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
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{label}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          enabled ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full transition-all",
            enabled
              ? "left-[22px] bg-white dark:bg-zinc-900"
              : "left-0.5 bg-white dark:bg-zinc-900"
          )}
        />
      </button>
    </div>
  )
}
