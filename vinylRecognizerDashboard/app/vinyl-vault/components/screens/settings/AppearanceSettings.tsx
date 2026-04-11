"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { SectionHeader, WipTag } from "./shared-components"

export function AppearanceSettings() {
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
