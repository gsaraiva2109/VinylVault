"use client"

import { VinylCatalogProvider } from "./vinyl-catalog/context"
import { AppShell } from "./vinyl-catalog/components/app-shell"
import { ErrorBoundary } from "./vinyl-catalog/components/error-boundary"

export default function HomePage() {
  return (
    <ErrorBoundary>
      <VinylCatalogProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <AppShell />
        </div>
      </VinylCatalogProvider>
    </ErrorBoundary>
  )
}
