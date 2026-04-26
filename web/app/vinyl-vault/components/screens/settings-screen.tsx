"use client"

import { useState } from "react"
import { Link2, Bell, Database, Palette, Shield, ScrollText } from "lucide-react"
import { useTabIndicator } from "../../../../hooks/use-tab-indicator"
import { IntegrationsSettings } from "./settings/IntegrationsSettings"
import { NotificationsSettings } from "./settings/NotificationsSettings"
import { PrivacySettings } from "./settings/PrivacySettings"
import { LogsSettings } from "./settings/LogsSettings"
import { DataSettings } from "./settings/DataSettings"
import { AppearanceSettings } from "./settings/AppearanceSettings"

type SettingsTab = "integrations" | "notifications" | "data" | "appearance" | "privacy" | "logs"

const tabs: { id: SettingsTab; label: string; icon: typeof Link2 }[] = [
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data", icon: Database },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "logs", label: "Logs", icon: ScrollText },
]

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("integrations")
  const { indicator, btnRefs } = useTabIndicator(tabs, activeTab)

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
