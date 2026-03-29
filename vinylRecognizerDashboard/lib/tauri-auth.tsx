"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

export interface TauriUser {
  name: string
  email: string
  image?: string
}

interface TauriAuthContextType {
  user: TauriUser | null
  accessToken: string | null
  status: "loading" | "authenticated" | "unauthenticated"
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const TauriAuthContext = createContext<TauriAuthContextType | undefined>(undefined)

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1]
    const padded =
      payload.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (payload.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return {}
  }
}

export function TauriAuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<TauriUser | null>(null)
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  const refreshAuthState = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import("@tauri-apps/api/core")
        const token = await invoke<string | null>("get_access_token")
        if (token) {
          const claims = decodeJwtPayload(token)
          setAccessToken(token)
          setUser({
            name: String(claims.name ?? claims.preferred_username ?? "User"),
            email: String(claims.email ?? ""),
          })
          setStatus("authenticated")
        } else {
          setAccessToken(null)
          setUser(null)
          setStatus("unauthenticated")
        }
      } else {
        setStatus("unauthenticated")
      }
    } catch {
      // Not running inside Tauri (browser preview etc.)
      setAccessToken(null)
      setUser(null)
      setStatus("unauthenticated")
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
      return
    }

    refreshAuthState()

    let unlisten: (() => void) | undefined
    import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<{ status: string }>("auth:state-changed", (event) => {
          if (event.payload.status === "authenticated") {
            refreshAuthState()
          } else {
            setAccessToken(null)
            setUser(null)
            setStatus("unauthenticated")
          }
        })
      )
      .then((fn) => {
        unlisten = fn
      })
      .catch(() => {})

    return () => {
      unlisten?.()
    }
  }, [refreshAuthState])

  const signIn = useCallback(async () => {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      const { invoke } = await import("@tauri-apps/api/core")
      await invoke("start_auth_flow")
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import("@tauri-apps/api/core")
        await invoke("sign_out")
      } else {
        setAccessToken(null)
        setUser(null)
        setStatus("unauthenticated")
      }
    } catch {
      setAccessToken(null)
      setUser(null)
      setStatus("unauthenticated")
    }
  }, [])

  return (
    <TauriAuthContext.Provider value={{ user, accessToken, status, signIn, signOut }}>
      {children}
    </TauriAuthContext.Provider>
  )
}

export function useTauriAuth() {
  const ctx = useContext(TauriAuthContext)
  if (!ctx) throw new Error("useTauriAuth must be used within TauriAuthProvider")
  return ctx
}
