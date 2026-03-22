"use client"

import { VinylCatalogProvider } from "./vinyl-catalog/context"
import { AppShell } from "./vinyl-catalog/components/app-shell"

export default function HomePage() {
  return (
    <VinylCatalogProvider>
      <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-950">
        <AppShell />
      </div>
    </VinylCatalogProvider>
  )
}
