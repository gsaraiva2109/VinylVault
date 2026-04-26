"use client"

import { useState, useRef } from "react"
import { Check, Clock, Trash2, Download, Upload, AlertTriangle, Loader2, RotateCcw, FileJson, FileText, HardDrive } from "lucide-react"
import { toast } from "sonner"
import { useVinylVault } from "../../../context"
import type { VinylRecord } from "../../../types"
import { SectionHeader, WipTag } from "./shared-components"

type ExportFormat = "json" | "csv"

export function DataSettings() {
  const { records, trashedRecords, recoverRecord, permanentlyDeleteRecord, isDemo, demoLocalRecords, clearDemoRecords } = useVinylVault()
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json")
  const [importFormat, setImportFormat] = useState<ExportFormat>("json")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle")
  const [importCount, setImportCount] = useState(0)
  const importInputRef = useRef<HTMLInputElement>(null)

  function getDaysRemaining(deletedAt: number | null | undefined): number {
    if (!deletedAt) return 30
    const expiry = deletedAt + 30 * 24 * 60 * 60 * 1000
    return Math.max(0, Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000)))
  }

  function handleExport() {
    if (exportFormat === "json") {
      const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" })
      triggerDownload(blob, `vinyl-vault-${today()}.json`)
    } else {
      const headers = ["id", "title", "artist", "year", "genre", "condition", "notes", "dateAdded", "addedBy"]
      const rows = records.map((r) => [
        r.id,
        csvEscape(r.title),
        csvEscape(r.artist),
        r.year,
        csvEscape(r.genre),
        r.condition,
        csvEscape(r.notes ?? ""),
        r.dateAdded,
        csvEscape(r.addedBy ?? ""),
      ])
      const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      triggerDownload(blob, `vinyl-vault-${today()}.csv`)
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        if (importFormat === "json") {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed)) {
            setImportCount(parsed.length)
            setImportStatus("success")
          } else {
            setImportStatus("error")
          }
        } else {
          const lines = text.trim().split("\n")
          // subtract header row
          setImportCount(Math.max(0, lines.length - 1))
          setImportStatus("success")
        }
      } catch {
        setImportStatus("error")
      }
    }
    reader.readAsText(file)
    // reset so same file can be re-selected
    e.target.value = ""
  }

  async function handlePermanentDelete(id: string) {
    setDeletingId(id)
    try {
      await permanentlyDeleteRecord(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <SectionHeader title="Data & Storage" subtitle="Manage your collection data, backups, and trash" />

      {/* ── Deleted Records / Trash ── */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium" style={{ color: "var(--app-text-2)" }}>
            Deleted Records
          </h3>
          {trashedRecords.length > 0 && (
            <span
              className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ background: "var(--app-green-bg)", color: "var(--app-green)" }}
            >
              <Clock className="h-3 w-3" />
              {trashedRecords.length} in trash
            </span>
          )}
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--app-border)" }}
        >
          {/* Header banner */}
          <div
            className="flex items-center gap-2.5 px-4 py-3"
            style={{ background: "var(--app-surface-3)", borderBottom: trashedRecords.length > 0 ? "1px solid var(--app-border)" : "none" }}
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--app-text-3)" }} />
            <p className="text-xs" style={{ color: "var(--app-text-3)" }}>
              Records are automatically and permanently deleted after 30 days.
            </p>
          </div>

          {trashedRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: "var(--app-green-bg)" }}
              >
                <Check className="h-5 w-5" style={{ color: "var(--app-green)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--app-text-2)" }}>
                Trash is empty
              </p>
              <p className="text-xs" style={{ color: "var(--app-text-3)" }}>
                Deleted records will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
              {trashedRecords.map((record) => {
                const daysLeft = getDaysRemaining(record.deletedAt)
                const isUrgent = daysLeft <= 5
                return (
                  <TrashRecordRow
                    key={record.id}
                    record={record}
                    daysLeft={daysLeft}
                    isUrgent={isUrgent}
                    isDeleting={deletingId === record.id}
                    onRecover={() => recoverRecord(record.id)}
                    onPermanentDelete={() => handlePermanentDelete(record.id)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Export ── */}
      <div className="mt-6">
        <h3 className="mb-2.5 text-sm font-medium" style={{ color: "var(--app-text-2)" }}>
          Export Collection
        </h3>
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm" style={{ color: "var(--app-text-1)" }}>
                Download your collection as {exportFormat === "json" ? "JSON" : "CSV"}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--app-text-3)" }}>
                {records.length} record{records.length !== 1 ? "s" : ""} in your collection
              </p>
            </div>
            <FormatToggle value={exportFormat} onChange={setExportFormat} />
          </div>
          <button
            onClick={handleExport}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer"
            style={{
              background: "var(--app-green)",
              color: "hsl(var(--primary-foreground))",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Download className="h-4 w-4" />
            Export Collection
          </button>
        </div>
      </div>

      {/* ── Demo Local Records ── */}
      {isDemo && (
        <div className="mt-6">
          <h3 className="mb-2.5 text-sm font-medium" style={{ color: "var(--app-text-2)" }}>
            Demo Local Records
          </h3>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--app-border)" }}
          >
            <div
              className="flex items-center gap-2.5 px-4 py-3"
              style={{ background: "var(--app-surface-3)", borderBottom: "1px solid var(--app-border)" }}
            >
              <HardDrive className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--app-text-3)" }} />
              <p className="text-xs" style={{ color: "var(--app-text-3)" }}>
                Records saved locally on this device. They won&apos;t sync to any account.
              </p>
            </div>
            <div
              className="flex items-center justify-between gap-4 px-4 py-4"
              style={{ background: "var(--app-surface-3)" }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--app-text-1)" }}>
                  {demoLocalRecords.length} local record{demoLocalRecords.length !== 1 ? "s" : ""}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--app-text-3)" }}>
                  {demoLocalRecords.length === 0
                    ? "No demo records saved yet"
                    : "Permanently stored in your browser's local storage"}
                </p>
              </div>
              <button
                onClick={() => {
                  if (demoLocalRecords.length === 0) return
                  if (
                    typeof window !== "undefined" &&
                    window.confirm(
                      `Delete all ${demoLocalRecords.length} local demo record${demoLocalRecords.length !== 1 ? "s" : ""}? This cannot be undone.`
                    )
                  ) {
                    clearDemoRecords()
                    toast.success("Local demo records cleared")
                  }
                }}
                disabled={demoLocalRecords.length === 0}
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
                style={{ background: "rgba(245,47,18,0.10)", color: "#f52f12", border: "1px solid rgba(245,47,18,0.20)" }}
                onMouseEnter={(e) => { if (demoLocalRecords.length > 0) e.currentTarget.style.background = "rgba(245,47,18,0.18)" }}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(245,47,18,0.10)")}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import ── */}
      <div className="mt-4">
        <h3 className="mb-2.5 flex items-center gap-2 text-sm font-medium" style={{ color: "var(--app-text-2)" }}>
          Import Collection
          <WipTag />
        </h3>
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm" style={{ color: "var(--app-text-1)" }}>
                Import from a {importFormat === "json" ? "JSON" : "CSV"} file
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--app-text-3)" }}>
                Existing records with matching IDs will be updated
              </p>
            </div>
            <FormatToggle value={importFormat} onChange={setImportFormat} />
          </div>

          <input
            id="import-collection-file"
            name="import-collection-file"
            ref={importInputRef}
            type="file"
            accept={importFormat === "json" ? ".json,application/json" : ".csv,text/csv"}
            className="hidden"
            onChange={handleImportFile}
          />

          <button
            onClick={() => { setImportStatus("idle"); importInputRef.current?.click() }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer"
            style={{ border: "1px solid var(--app-border)", color: "var(--app-text-1)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--app-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Upload className="h-4 w-4" />
            Choose File
          </button>

          {importStatus === "success" && (
            <div
              className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
              style={{ background: "var(--app-green-bg)", color: "var(--app-green)" }}
            >
              <Check className="h-4 w-4 shrink-0" />
              Found {importCount} record{importCount !== 1 ? "s" : ""}. Import functionality requires backend support.
            </div>
          )}
          {importStatus === "error" && (
            <div
              className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
              style={{ background: "rgba(245,47,18,0.08)", color: "#f52f12" }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Invalid file format. Please choose a valid {importFormat.toUpperCase()} file.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── TrashRecordRow ─────────────────────────────────────────────────────────────

function TrashRecordRow({
  record,
  daysLeft,
  isUrgent,
  isDeleting,
  onRecover,
  onPermanentDelete,
}: {
  record: VinylRecord
  daysLeft: number
  isUrgent: boolean
  isDeleting: boolean
  onRecover: () => void
  onPermanentDelete: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ background: "var(--app-surface-3)" }}
    >
      {/* Cover — grayscale */}
      <div
        className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg"
        style={{ background: "var(--app-surface-3)" }}
      >
        {record.coverUrl && (
          <div
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${record.coverUrl})`,
              filter: "grayscale(100%) opacity(0.5)",
            }}
          />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: "var(--app-text-2)" }}>
          {record.title}
        </p>
        <p className="truncate text-xs" style={{ color: "var(--app-text-3)" }}>
          {record.artist} · {record.year} · {record.genre}
        </p>
        <div className="mt-1 flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" style={{ color: isUrgent ? "#f52f12" : "var(--app-text-3)" }} />
          <span
            className="text-xs font-medium"
            style={{ color: isUrgent ? "#f52f12" : "var(--app-text-3)" }}
          >
            {daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRecover}
          disabled={isDeleting}
          title="Recover"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
          style={{
            background: "var(--app-green-bg)",
            color: "var(--app-green)",
            border: "1px solid var(--app-green-border)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.80")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <RotateCcw className="h-3 w-3" />
          Recover
        </button>
        <button
          onClick={onPermanentDelete}
          disabled={isDeleting}
          title="Delete forever"
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          style={{ color: "var(--app-text-3)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(245,47,18,0.10)"
            e.currentTarget.style.color = "#f52f12"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = "var(--app-text-3)"
          }}
        >
          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ── FormatToggle ───────────────────────────────────────────────────────────────

function FormatToggle({ value, onChange }: { value: ExportFormat; onChange: (v: ExportFormat) => void }) {
  return (
    <div
      className="flex rounded-lg p-0.5"
      style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}
    >
      {(["json", "csv"] as ExportFormat[]).map((fmt) => {
        const active = value === fmt
        return (
          <button
            key={fmt}
            onClick={() => onChange(fmt)}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer"
            style={{
              background: active ? "var(--app-green)" : "transparent",
              color: active ? "hsl(var(--primary-foreground))" : "var(--app-text-2)",
            }}
          >
            {fmt === "json" ? <FileJson className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            {fmt.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function today(): string {
  return new Date().toISOString().split("T")[0]
}
