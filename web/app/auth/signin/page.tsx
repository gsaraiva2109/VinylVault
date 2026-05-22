"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Disc3, LogIn, Loader2, AlertTriangle } from "lucide-react"

function SignInContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const [isSigningIn, setIsSigningIn] = useState(false)

  const errorMessages: Record<string, string> = {
    OAuthSignin: "Could not start the sign-in flow. Try again.",
    OAuthCallback: "Login was rejected by the identity provider.",
    OAuthCreateAccount: "Could not create an account. Contact the administrator.",
    EmailCreateAccount: "Could not create an account. Contact the administrator.",
    Callback: "Login was rejected. Try again.",
    OAuthAccountNotLinked: "This account is already linked to another sign-in method.",
    EmailSignin: "Could not send the sign-in email. Check your email address.",
    CredentialsSignin: "Invalid credentials. Check your username and password.",
    SessionRequired: "You must be signed in to access this page.",
    default: "An unexpected error occurred. Please try again.",
  }

  const errorMessage = error ? (errorMessages[error] ?? errorMessages.default) : null

  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await signIn("oidc", { callbackUrl: "/" })
    } catch {
      setIsSigningIn(false)
    }
  }

  return (
    <div
      className="flex h-screen flex-col items-center justify-center gap-8"
      style={{ background: "#0d0d0d" }}
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

      {errorMessage && (
        <div
          className="flex items-start gap-3 rounded-xl p-4 max-w-sm"
          style={{
            background: "rgba(245,47,18,0.08)",
            border: "1px solid rgba(245,47,18,0.20)",
          }}
        >
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#f52f12" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "#f52f12" }}>
              Sign-in failed
            </p>
            <p className="mt-1 text-xs" style={{ color: "rgba(245,47,18,0.70)" }}>
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handleSignIn}
        disabled={isSigningIn}
        className="flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold transition-all cursor-pointer disabled:opacity-40"
        style={{ background: "#28d768", color: "#0a0a0a" }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) e.currentTarget.style.background = "#22c55e"
        }}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#28d768")}
      >
        {isSigningIn ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        Sign in with OIDC
      </button>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  )
}
