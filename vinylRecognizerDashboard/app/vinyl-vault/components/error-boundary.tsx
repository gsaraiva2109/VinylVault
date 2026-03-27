"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: "" }
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center bg-background">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "rgba(245,47,18,0.10)" }}
          >
            <AlertCircle className="h-8 w-8" style={{ color: "#f52f12" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--app-text-1)" }}>
              Something went wrong
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--app-text-3)" }}>
              {this.state.message}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer"
            style={{ background: "var(--app-green)", color: "#0a0a0a" }}
          >
            <RefreshCw className="h-4 w-4" />
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
