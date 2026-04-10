"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
          const newUser = {
            name: String(claims.name ?? claims.preferred_username ?? "User"),
            email: String(claims.email ?? ""),
          }

          setStatus("authenticated")
          setAccessToken(token)
          setUser(newUser)
        } else {
          setAccessToken(null)
          setUser(null)
          setStatus("unauthenticated")
        }
      } else {
        // Handle web version via NextAuth
        if (nextAuthStatus === "authenticated" && session) {
          // Refresh token also expired — force re-login
          if (session.error === "RefreshAccessTokenError") {
            setAccessToken(null)
            setUser(null)
            setStatus("unauthenticated")
            nextAuthSignOut()
            return
          }

          const newAccessToken = session.accessToken ?? null
          const newUser = {
            name: session.user?.name ?? "User",
            email: session.user?.email ?? "",
            image: session.user?.image ?? undefined,
          }

          setAccessToken(newAccessToken)
          setUser(newUser)
          setStatus("authenticated")
        } else if (nextAuthStatus === "unauthenticated") {
          setAccessToken(null)
          setUser(null)
          setStatus("unauthenticated")
        } else {
          setStatus("loading")
        }
      }
    } catch {
      // Not running inside Tauri (browser preview etc.)
      setAccessToken(null)
      setUser(null)
      setStatus("unauthenticated")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextAuthStatus, session]) // Only re-create when NextAuth state changes, NOT on local state

  // Stable ref so the Tauri IPC listener (registered once) always calls the
  // latest version of refreshAuthState without capturing a stale closure.
  const refreshAuthStateRef = useRef(refreshAuthState)
  useEffect(() => {
    refreshAuthStateRef.current = refreshAuthState
  }, [refreshAuthState])

  // Web (non-Tauri) path: re-sync auth state whenever NextAuth session changes.
  // This effect must depend on nextAuthStatus/session so it fires when NextAuth
  // resolves from "loading" → "authenticated" / "unauthenticated".
  useEffect(() => {
    if (typeof window === 'undefined' || window.__TAURI_INTERNALS__) return
    refreshAuthState()
  }, [refreshAuthState]) // refreshAuthState itself only changes when nextAuthStatus/session changes

  // Tauri path: register the IPC event listener ONCE (empty deps) using the
  // stable ref. This prevents re-subscription races on macOS.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return

    refreshAuthStateRef.current()

    let unlisten: (() => void) | undefined
    import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<{ status: string }>("auth:state-changed", (event) => {
          if (event.payload.status === "authenticated") {
            refreshAuthStateRef.current()
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — Tauri IPC listener registered once; uses ref for latest state

  const signIn = useCallback(async () => {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import("@tauri-apps/api/core")
        await invoke("start_auth_flow")

        // Defense-in-depth: poll for the token after the flow resolves.
        // On macOS the Keychain write from the callback server and the IPC
        // event may arrive at slightly different times. Polling for up to
        // 30 s ensures the UI updates even if the event fires before the
        // token is readable.
        const POLL_INTERVAL_MS = 500
        const POLL_TIMEOUT_MS  = 30_000
        const deadline = Date.now() + POLL_TIMEOUT_MS
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
          const token = await invoke<string | null>("get_access_token")
          if (token) {
            refreshAuthStateRef.current()
            break
          }
        }
      } catch (err) {
        console.error("[TauriAuth] start_auth_flow failed:", err)
        // Re-throw so callers / UI can display an error toast
        throw err
      }
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
