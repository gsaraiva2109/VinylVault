"use client"

import { useVinylCatalog } from "../context"
import { Sidebar } from "./sidebar"
import { CollectionScreen } from "./screens/collection-screen"
import { ScanScreen } from "./screens/scan-screen"
import { StatsScreen } from "./screens/stats-screen"
import { SettingsScreen } from "./screens/settings-screen"
import { RecordDetailModal } from "./record-detail-modal"

export function AppShell() {
  const { activeScreen } = useVinylCatalog()

  return (
    <>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          {activeScreen === "collection" && <CollectionScreen />}
          {activeScreen === "scan" && <ScanScreen />}
          {activeScreen === "stats" && <StatsScreen />}
          {activeScreen === "settings" && <SettingsScreen />}
        </main>
      </div>
      <RecordDetailModal />
    </>
  )
}
