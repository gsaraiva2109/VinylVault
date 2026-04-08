"use client"

import { useState, useEffect } from "react"
import { useVinylVault } from "../context"
import { StatsStrip } from "./stats-strip"
import { BottomDock } from "./bottom-dock"
import { SearchModal } from "./search-modal"
import { CollectionScreen } from "./screens/collection-screen"
import { ScanScreen } from "./screens/scan-screen"
import { StatsScreen } from "./screens/stats-screen"
import { SettingsScreen } from "./screens/settings-screen"
import { AccountScreen } from "./screens/account-screen"
import { RecordDetailModal } from "./record-detail-modal"
import { CameraProvider } from "../context/camera-context"

export function AppShell() {
  const { activeScreen } = useVinylVault()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Global ⌘K shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <StatsStrip onSearchOpen={() => setIsSearchOpen(true)} />

      <main className="flex-1 overflow-auto">
        <div key={activeScreen} style={{ animation: "screen-fade-in 220ms cubic-bezier(0.16, 1, 0.3, 1)", height: "100%" }}>
          {activeScreen === "collection" && <CollectionScreen />}
          {activeScreen === "scan" && <CameraProvider><ScanScreen /></CameraProvider>}
          {activeScreen === "stats" && <StatsScreen />}
          {activeScreen === "settings" && <SettingsScreen />}
          {activeScreen === "account" && <AccountScreen />}
        </div>
      </main>

      <BottomDock />
      <SearchModal open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <RecordDetailModal />
      <style>{`
        @keyframes screen-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
