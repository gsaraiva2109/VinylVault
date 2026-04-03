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

  // Always hold the latest refreshAuthState in a ref so the Tauri event
  // listener (registered once) can call the current version without capturing
  // a stale closure — avoids re-subscription races on macOS.
  const refreshAuthStateRef = useRef(refreshAuthState)
  useEffect(() => {
    refreshAuthStateRef.current = refreshAuthState
  }, [refreshAuthState])

  // Register the Tauri IPC listener ONCE (empty deps) using the stable ref.
  // This prevents the brief subscription gap caused by re-running the effect
  // every time refreshAuthState is recreated due to state changes.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) {
      refreshAuthStateRef.current()
      return
    }

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
  }, []) // intentionally empty — uses ref to access latest refreshAuthState

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
