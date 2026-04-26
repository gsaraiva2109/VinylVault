"use client"

import { TauriAuthProvider } from "@/lib/tauri-auth"
import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TauriAuthProvider>{children}</TauriAuthProvider>
    </SessionProvider>
  )
}
