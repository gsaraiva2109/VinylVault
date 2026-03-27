"use client"

import { VinylVaultProvider } from "./vinyl-vault/context"
import { AppShell } from "./vinyl-vault/components/app-shell"
import { ErrorBoundary } from "./vinyl-vault/components/error-boundary"
import { useTauriAuth } from "@/lib/tauri-auth"
import { Disc3, LogIn, Loader2 } from "lucide-react"

function LoginScreen() {
  const { signIn, status } = useTauriAuth()
  return (
    <div
      className="flex h-screen flex-col items-center justify-center gap-8"
      style={{ background: "var(--app-bg, #0d0d0d)" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-3xl"
          style={{ background: "rgba(40,215,104,0.10)" }}
        >
          <Disc3 className="h-10 w-10" style={{ color: "#28d768" }} />
        </div>
        <h1 className="text-2xl font-bold text-white/90">Vinyl Vault</h1>
        <p className="text-sm text-white/40">Sign in to access your collection</p>
      </div>
      <button
        onClick={signIn}
        disabled={status === "loading"}
        className="flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold transition-all cursor-pointer disabled:opacity-40"
        style={{ background: "#28d768", color: "#0a0a0a" }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) e.currentTarget.style.background = "#22c55e"
        }}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#28d768")}
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        Sign in with Authentik
      </button>
    </div>
  )
}

export default function HomePage() {
  const { status } = useTauriAuth()

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/20" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return <LoginScreen />
  }

  return (
    <ErrorBoundary>
      <VinylVaultProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <AppShell />
        </div>
      </VinylVaultProvider>
    </ErrorBoundary>
  )
}
