"use client"

import { TauriAuthProvider } from "@/lib/tauri-auth"
import type { ReactNode } from "react"

export function AuthProvider({ children }: { children: ReactNode }) {
  return <TauriAuthProvider>{children}</TauriAuthProvider>
}
