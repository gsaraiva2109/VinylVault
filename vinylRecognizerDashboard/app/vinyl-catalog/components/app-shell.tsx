"use client"

import { useState, useEffect } from "react"
import { useVinylCatalog } from "../context"
import { StatsStrip } from "./stats-strip"
import { BottomDock } from "./bottom-dock"
import { SearchModal } from "./search-modal"
import { CollectionScreen } from "./screens/collection-screen"
import { ScanScreen } from "./screens/scan-screen"
import { StatsScreen } from "./screens/stats-screen"
import { SettingsScreen } from "./screens/settings-screen"
import { AccountScreen } from "./screens/account-screen"
import { RecordDetailModal } from "./record-detail-modal"

export function AppShell() {
  const { activeScreen } = useVinylCatalog()
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
        {activeScreen === "collection" && <CollectionScreen />}
        {activeScreen === "scan" && <ScanScreen />}
        {activeScreen === "stats" && <StatsScreen />}
        {activeScreen === "settings" && <SettingsScreen />}
        {activeScreen === "account" && <AccountScreen />}
      </main>

      <BottomDock />
      <SearchModal open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <RecordDetailModal />
    </div>
  )
}
