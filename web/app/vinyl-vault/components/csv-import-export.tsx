"use client"

import { useState, useRef, type DragEvent } from "react"
import Papa from "papaparse"
import { Download, Upload, X, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useTauriAuth } from "@/lib/tauri-auth"
import { useVinylVault } from "../context"

type Tab = "export" | "import"
type ImportResult = { created: number; skipped: number; errors: Array<{ row: number; message: string }> }

interface Props {
  open: boolean
  onClose: () => void
}

export function CsvImportExport({ open, onClose }: Props) {
  const { accessToken: token } = useTauriAuth()
  const { refreshCollection } = useVinylVault()
  const [tab, setTab] = useState<Tab>("export")
  const [exporting, setExporting] = useState(false)
  const [csvText, setCsvText] = useState<string>("")
  const [preview, setPreview] = useState<Array<Record<string, string>>>([])
  const [previewCols, setPreviewCols] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await api.vinyls.exportCsv(token ?? undefined)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `vinylvault-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success("Exported collection")
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setExporting(false)
    }
  }

  const ingestFile = (file: File) => {
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? "")
      setCsvText(text)
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        preview: 10,
      })
      setPreview(parsed.data)
      setPreviewCols(parsed.meta.fields ?? [])
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) ingestFile(file)
  }

  const handleImport = async () => {
    if (!csvText) return
    setImporting(true)
    setResult(null)
    try {
      const res = await api.vinyls.importCsv(csvText, token ?? undefined)
      setResult(res)
      if (res.created > 0) {
        toast.success(`Imported ${res.created} record${res.created === 1 ? "" : "s"}`, {
          description: `${res.skipped} skipped, ${res.errors.length} error${res.errors.length === 1 ? "" : "s"}`,
        })
        refreshCollection()
      } else {
        toast.warning("Nothing imported", {
          description: `${res.skipped} skipped, ${res.errors.length} error${res.errors.length === 1 ? "" : "s"}`,
        })
      }
    } catch (err) {
      toast.error("Import failed", { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-xl bg-white shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">CSV Import / Export</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          {(["export", "import"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-6 py-3 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-b-2 border-emerald-500 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-auto p-6">
          {tab === "export" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Download className="h-12 w-12 text-zinc-400" />
              <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
                Download every active record (not in trash) as a CSV file. Re-import it later to restore or migrate
                the collection.
              </p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting ? "Building CSV…" : "Download CSV"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
                  dragOver
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <Upload className="h-8 w-8 text-zinc-400" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Drop a CSV here or <span className="font-semibold text-emerald-500">browse</span>
                </p>
                <p className="text-xs text-zinc-500">
                  Header row required. Columns must match the export schema.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) ingestFile(f)
                  }}
                />
              </div>

              {preview.length > 0 && (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="border-b border-zinc-200 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
                    Preview ({preview.length} of many)
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                        <tr>
                          {previewCols.slice(0, 6).map((c) => (
                            <th key={c} className="px-2 py-1 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                            {previewCols.slice(0, 6).map((c) => (
                              <td key={c} className="truncate px-2 py-1 text-zinc-700 dark:text-zinc-300" title={row[c]}>
                                {row[c]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {csvText && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importing ? "Importing…" : "Import"}
                </button>
              )}

              {result && (
                <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Import complete
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <div className="text-2xl font-semibold text-emerald-500">{result.created}</div>
                      <div className="text-xs text-zinc-500">Created</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-zinc-500">{result.skipped}</div>
                      <div className="text-xs text-zinc-500">Skipped (duplicate)</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-rose-500">{result.errors.length}</div>
                      <div className="text-xs text-zinc-500">Errors</div>
                    </div>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-3 max-h-32 overflow-auto rounded-md bg-rose-50 p-2 text-xs dark:bg-rose-950/30">
                      {result.errors.map((e, i) => (
                        <div key={i} className="flex items-start gap-2 py-1 text-rose-700 dark:text-rose-300">
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>
                            Row {e.row}: {e.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
