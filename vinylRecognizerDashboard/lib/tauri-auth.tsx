"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react"

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
  const { data: session, status: nextAuthStatus } = useSession()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<TauriUser | null>(null)
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  const refreshAuthState = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
        const { invoke } = await import("@tauri-apps/api/core")
        const token = await invoke<string | null>("get_access_token")
        if (token) {
          const claims = decodeJwtPayload(token)
          const newStatus = "authenticated"
          const newAccessToken = token
          const newUser = {
            name: String(claims.name ?? claims.preferred_username ?? "User"),
            email: String(claims.email ?? ""),
          }

          if (status !== newStatus) setStatus(newStatus)
          if (accessToken !== newAccessToken) setAccessToken(newAccessToken)
          if (user?.email !== newUser.email || user?.name !== newUser.name) setUser(newUser)
        } else {
          if (accessToken !== null) setAccessToken(null)
          if (user !== null) setUser(null)
          if (status !== "unauthenticated") setStatus("unauthenticated")
        }
      } else {
        // Handle web version via NextAuth
        if (nextAuthStatus === "authenticated" && session) {
          // Refresh token also expired — force re-login
          if (session.error === "RefreshAccessTokenError") {
            if (accessToken !== null) setAccessToken(null)
            if (user !== null) setUser(null)
            if (status !== "unauthenticated") setStatus("unauthenticated")
            nextAuthSignOut()
            return
          }

          const newAccessToken = session.accessToken ?? null
          const newUser = {
            name: session.user?.name ?? "User",
            email: session.user?.email ?? "",
            image: session.user?.image ?? undefined,
          }

          if (accessToken !== newAccessToken) setAccessToken(newAccessToken)
          if (user?.email !== newUser.email || user?.name !== newUser.name) setUser(newUser)
          if (status !== "authenticated") setStatus("authenticated")
        } else if (nextAuthStatus === "unauthenticated") {
          if (accessToken !== null) setAccessToken(null)
          if (user !== null) setUser(null)
          if (status !== "unauthenticated") setStatus("unauthenticated")
        } else {
          if (status !== "loading") setStatus("loading")
        }
      }
    } catch {
      // Not running inside Tauri (browser preview etc.)
      if (accessToken !== null) setAccessToken(null)
      if (user !== null) setUser(null)
      if (status !== "unauthenticated") setStatus("unauthenticated")
    }
  }, [nextAuthStatus, session, status, accessToken, user])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (window.__TAURI_INTERNALS__) {
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
    } else {
      // Running in web browser
      refreshAuthState()
    }
  }, [refreshAuthState])

  const signIn = useCallback(async () => {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      const { invoke } = await import("@tauri-apps/api/core")
      await invoke("start_auth_flow")
    } else {
      await nextAuthSignIn("authentik")
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
        const { invoke } = await import("@tauri-apps/api/core")
        await invoke("sign_out")
      } else {
        await nextAuthSignOut()
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
