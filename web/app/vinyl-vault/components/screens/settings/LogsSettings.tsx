"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Trash2, CheckCircle2, Disc3, RotateCcw, Loader2, Clipboard, ClipboardCheck } from "lucide-react"
import { useVinylVault } from "../../../context"

export function LogsSettings() {
  const { scanErrors, clearScanErrors } = useVinylVault()
  const [logContent, setLogContent] = useState<string | null>(null)
  const [logLoading, setLogLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  const fetchLog = useCallback(async () => {
    setLogLoading(true)
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      const content = await invoke<string>("read_scan_log")
      setLogContent(content)
    } catch {
      setLogContent(null)
    } finally {
      setLogLoading(false)
    }
  }, [])

  useEffect(() => { fetchLog() }, [fetchLog])

  useEffect(() => {
    if (logContent !== null && logEndRef.current) {
      logEndRef.current.scrollIntoView()
    }
  }, [logContent])

  const handleClearLog = useCallback(async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      await invoke("clear_scan_log")
      setLogContent("")
    } catch { /* ignore */ }
  }, [])

  const handleCopy = useCallback(async () => {
    if (!logContent) return
    await navigator.clipboard.writeText(logContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [logContent])

  function renderLogLine(line: string, idx: number) {
    const m = line.match(/^(\[[^\]]+\])\s(.*)$/)
    if (m) {
      const [, timestamp, rest] = m
      const errorIdx = rest.indexOf("ERROR:")
      if (errorIdx !== -1) {
        return (
          <div key={idx} className="px-4 py-px hover:bg-white/[0.02]">
            <span style={{ color: "var(--app-green)", opacity: 0.6 }}>{timestamp} </span>
            <span style={{ color: "#f59e0b", fontWeight: 500 }}>ERROR: </span>
            <span style={{ color: "var(--app-text-2)" }}>{rest.slice(errorIdx + 7)}</span>
          </div>
        )
      }
    }
    if (line.trim().startsWith("context:")) {
      return (
        <div key={idx} className="px-4 py-px">
          <span style={{ color: "var(--app-text-3)" }}>{line}</span>
        </div>
      )
    }
    return (
      <div key={idx} className="px-4 py-px">
        <span style={{ color: "var(--app-text-3)" }}>{line || "\u00a0"}</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Section 1: In-memory scan errors ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-5 rounded-full shrink-0" style={{ background: "var(--app-green)" }} />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--app-text-1)" }}>
                Recent Scan Errors
                {scanErrors.length > 0 && (
                  <span className="ml-2 font-mono text-[10px]" style={{ color: "var(--app-text-3)" }}>
                    ({scanErrors.length})
                  </span>
                )}
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--app-text-3)" }}>
                In-memory · cleared on restart
              </p>
            </div>
          </div>
          {scanErrors.length > 0 && (
            <button
              onClick={clearScanErrors}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              style={{ color: "var(--app-text-3)", border: "1px solid var(--app-border)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--app-text-1)"; e.currentTarget.style.borderColor = "var(--app-text-3)" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--app-text-3)"; e.currentTarget.style.borderColor = "var(--app-border)" }}
            >
              <Trash2 className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        {scanErrors.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 rounded-xl gap-3"
            style={{ border: "1px solid var(--app-border)", background: "var(--app-surface-3)" }}
          >
            <CheckCircle2 className="h-7 w-7" style={{ color: "var(--app-green)", opacity: 0.7 }} />
            <p className="text-xs" style={{ color: "var(--app-text-3)" }}>No scan errors — everything looks good</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--app-border)" }}>
            {scanErrors.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors"
                style={{ borderColor: "var(--app-border)", background: "var(--app-surface-3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--app-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--app-surface-3)")}
              >
                {/* Thumbnail */}
                <div
                  className="shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center"
                  style={{ background: "var(--app-border)" }}
                >
                  {entry.capturedImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.capturedImage} alt="Scan" className="w-full h-full object-cover" />
                  ) : (
                    <Disc3 className="h-5 w-5" style={{ color: "var(--app-text-3)" }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium truncate"
                    style={{ color: "var(--app-text-2)" }}
                    title={entry.message}
                  >
                    {entry.message}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--app-text-3)" }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>

                {/* Provider badge */}
                {entry.provider && entry.provider !== "auto" && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                    style={{ background: "var(--app-border)", color: "var(--app-text-3)", border: "1px solid var(--app-border)" }}
                  >
                    {entry.provider}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Persistent log file ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-0.5 h-5 rounded-full shrink-0" style={{ background: "var(--app-green)" }} />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--app-text-1)" }}>
                Persistent Log File
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--app-text-3)" }}>
                Survives restarts · last 500 lines kept
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchLog}
              className="p-1.5 rounded-lg cursor-pointer transition-colors"
              style={{ color: "var(--app-text-3)", border: "1px solid var(--app-border)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--app-text-1)"; e.currentTarget.style.borderColor = "var(--app-text-3)" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--app-text-3)"; e.currentTarget.style.borderColor = "var(--app-border)" }}
              title="Refresh"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <button
              onClick={handleCopy}
              disabled={!logContent}
              className="p-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-30"
              style={{ color: copied ? "var(--app-green)" : "var(--app-text-3)", border: `1px solid ${copied ? "var(--app-green)" : "var(--app-border)"}` }}
              onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.color = "var(--app-text-1)"; e.currentTarget.style.borderColor = "var(--app-text-3)" } }}
              onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.color = "var(--app-text-3)"; e.currentTarget.style.borderColor = "var(--app-border)" } }}
              title="Copy log"
            >
              {copied ? <ClipboardCheck className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
            </button>
            <button
              onClick={handleClearLog}
              className="p-1.5 rounded-lg cursor-pointer transition-colors"
              style={{ color: "var(--app-text-3)", border: "1px solid var(--app-border)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "#ef4444" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--app-text-3)"; e.currentTarget.style.borderColor = "var(--app-border)" }}
              title="Clear log file"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--app-border)" }}>
          {logLoading ? (
            <div className="flex items-center justify-center py-10" style={{ background: "#0a0a0a" }}>
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--app-text-3)" }} />
            </div>
          ) : !logContent ? (
            <div className="flex items-center justify-center py-10" style={{ background: "#0a0a0a" }}>
              <p className="text-xs font-mono" style={{ color: "var(--app-text-3)" }}>No log entries yet</p>
            </div>
          ) : (
            <div
              className="max-h-80 overflow-y-auto py-2 text-xs font-mono leading-5"
              style={{ background: "#0a0a0a" }}
            >
              {logContent.split("\n").map((line, i) => renderLogLine(line, i))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
