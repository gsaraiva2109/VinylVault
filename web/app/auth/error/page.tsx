"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Disc3, LogIn, AlertTriangle } from "lucide-react"

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const errorMessages: Record<string, string> = {
    Configuration: "The authentication server is misconfigured. Check your OIDC environment variables.",
    AccessDenied: "You denied the sign-in request. Try again when ready.",
    Verification: "The sign-in link has expired or has already been used.",
    OAuthSignin: "Could not start the sign-in flow. Try again.",
    OAuthCallback: "Login was rejected by the identity provider. Check your credentials and redirect URI configuration.",
    OAuthCreateAccount: "Could not create an account. Contact the administrator.",
    EmailCreateAccount: "Could not create an account. Contact the administrator.",
    Callback: "Login was rejected. The identity provider returned an invalid response.",
    OAuthAccountNotLinked: "This account is already linked to another sign-in method.",
    EmailSignin: "Could not send the sign-in email. Check your email address.",
    CredentialsSignin: "Invalid credentials. Check your username and password.",
    SessionRequired: "You must be signed in to access this page.",
    default: "An unexpected authentication error occurred. Please try again.",
  }

  const errorMessage = error ? (errorMessages[error] ?? `${errorMessages.default} (${error})`) : errorMessages.default

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

      <button
        onClick={() => signIn("oidc", { callbackUrl: "/" })}
        className="flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold transition-all cursor-pointer"
        style={{ background: "#28d768", color: "#0a0a0a" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#22c55e")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#28d768")}
      >
        <LogIn className="h-4 w-4" />
        Try Again
      </button>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  )
}
