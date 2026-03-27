"use client"

import { useState, type ChangeEvent } from "react"
import { useVinylCatalog } from "../context"
import { useSession } from "next-auth/react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { X, Plus, Loader2, Music2, Link2, Sparkles, CheckCircle2 } from "lucide-react"
import type { Condition } from "../types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CONDITIONS: Condition[] = ["M", "NM", "VG+", "VG", "G+", "G", "F", "P"]

interface ManualAddModalProps {
  onClose: () => void
}

function parseDiscogsUrl(url: string): { id: string; type: "release" | "master" } | null {
  const match = url.match(/\/(release|master)\/(\d+)/)
  if (!match) return null
  return { type: match[1] as "release" | "master", id: match[2] }
}

export function ManualAddModal({ onClose }: ManualAddModalProps) {
  const { refreshCollection, setActiveScreen } = useVinylCatalog()
  const { data: session } = useSession()

  const [discogsUrl, setDiscogsUrl] = useState("")
  const [isFetching, setIsFetching] = useState(false)
  const [fetchedDiscogsId, setFetchedDiscogsId] = useState<string | undefined>()

  const [form, setForm] = useState({
    title: "",
    artist: "",
    year: String(new Date().getFullYear()),
    genre: "",
    condition: "VG+" as Condition,
    coverUrl: "",
    notes: "",
    spotifyId: undefined as string | undefined, // NEW: Store matched spotify ID
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const set = (field: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleFetchDiscogs = async () => {
    const parsed = parseDiscogsUrl(discogsUrl.trim())
    if (!parsed) {
      toast.error("Paste a valid Discogs link — e.g. https://www.discogs.com/release/12345 or /master/12345")
      return
    }
    setIsFetching(true)
    try {
      const token = (session as { accessToken?: string })?.accessToken
      const data = (parsed.type === "master" 
        ? await api.discogs.getMaster(parsed.id) 
        : await api.discogs.getRelease(parsed.id, token)) as {
        id: string
        title: string
        artist: string
        year: number | null
        genre: string | null
        coverImage: string | null
        lowestPrice: number | null
      }
      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        artist: data.artist || prev.artist,
        year: String(data.year || prev.year),
        genre: data.genre || prev.genre,
        coverUrl: data.coverImage || prev.coverUrl,
      }))
      setFetchedDiscogsId(parsed.id)
      toast.success("Record info imported from Discogs")

      // NEW: Automatically try to match with Spotify
      try {
        const query = `${data.artist} - ${data.title}`
        const spotRes = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`)
        if (spotRes.ok) {
          const spotData = await spotRes.json()
          setForm(prev => ({ ...prev, spotifyId: spotData.albumId }))
          toast.success("Spotify match found!", { duration: 2000 })
        }
      } catch (spotErr) {
        console.warn("Spotify match failed (likely missing API keys)", spotErr)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch from Discogs")
    } finally {
      setIsFetching(false)
    }
  }

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!form.title.trim() || !form.artist.trim() || !form.genre.trim()) return

    setIsSubmitting(true)
    try {
      const token = (session as { accessToken?: string })?.accessToken
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        artist: form.artist.trim(),
        year: parseInt(form.year) || new Date().getFullYear(),
        genre: form.genre.trim(),
        condition: form.condition,
        coverImageUrl: form.coverUrl.trim() || null,
        notes: form.notes.trim() || null,
        discogsId: fetchedDiscogsId ? String(fetchedDiscogsId) : null,
        discogsUrl: discogsUrl.trim() || null,
        spotifyUrl: form.spotifyId ? `https://open.spotify.com/album/${form.spotifyId}` : null,
      }
      
      await api.vinyls.create(payload, token)
      toast.success(`"${form.title}" added to your collection`)
      refreshCollection()
      setActiveScreen("collection")
      onClose()
    } catch (err: unknown) {
      console.error("Add record error:", err)
      const msg = err instanceof Error ? err.message : String(err)
      
      if (msg.includes("unique constraint") && msg.includes("discogs_id")) {
        toast.error("This record already exists in your collection (it might be in the trash).")
      } else {
        toast.error(msg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div className="fixed inset-0 z-[70] flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className="relative z-10 mx-4 flex w-full max-w-md flex-col rounded-2xl"
          style={{
            background: "var(--app-surface)",
            border: "1px solid var(--app-border)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            animation: "modal-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--app-border)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: "var(--app-green-bg)" }}
              >
                <Music2 className="h-3.5 w-3.5" style={{ color: "var(--app-green)" }} />
              </div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--app-text-1)" }}>
                Add Record Manually
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer"
              style={{ color: "var(--app-text-3)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--app-hover)"
                e.currentTarget.style.color = "var(--app-text-1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "var(--app-text-3)"
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
            <div className="space-y-3 p-5">

              {/* ── Discogs URL import ── */}
              <div
                className="rounded-xl p-3.5"
                style={{
                  background: fetchedDiscogsId ? "var(--app-green-bg)" : "var(--app-surface-3)",
                  border: `1px solid ${fetchedDiscogsId ? "var(--app-green-border)" : "var(--app-border)"}`,
                }}
              >
                <div className="mb-2 flex items-center gap-1.5">
                  {fetchedDiscogsId ? (
                    <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--app-green)" }} />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--app-text-3)" }} />
                  )}
                  <span className="text-xs font-medium" style={{ color: fetchedDiscogsId ? "var(--app-green)" : "var(--app-text-2)" }}>
                    {fetchedDiscogsId ? "Imported from Discogs" : "Auto-fill from Discogs link"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--app-text-3)" }} />
                    <input
                      type="url"
                      value={discogsUrl}
                      onChange={(e) => setDiscogsUrl(e.target.value)}
                      placeholder="https://www.discogs.com/release/123 or /master/123"
                      className="h-8 w-full rounded-lg pl-8 pr-3 text-xs outline-none transition-colors"
                      style={{
                        background: "var(--app-surface-3)",
                        border: "1px solid var(--app-border)",
                        color: "var(--app-text-1)",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--app-green-border)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--app-border)")}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchDiscogs}
                    disabled={isFetching || !discogsUrl.trim()}
                    className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: "var(--app-green)",
                      color: "#0a0a0a",
                    }}
                  >
                    {isFetching ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {isFetching ? "Fetching..." : "Fetch"}
                  </button>
                </div>
                {!fetchedDiscogsId && (
                  <p className="mt-1.5 text-[10px]" style={{ color: "var(--app-text-3)" }}>
                    Paste a Discogs release or master link to auto-fill title, artist, year, genre and cover. You only need to set the condition.
                  </p>
                )}
              </div>

              {/* ── Divider ── */}
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t" style={{ borderColor: "var(--app-border)" }} />
                <span className="text-[10px] font-medium" style={{ color: "var(--app-text-3)" }}>or fill manually</span>
                <div className="flex-1 border-t" style={{ borderColor: "var(--app-border)" }} />
              </div>

              <Field label="Title" required>
                <Input
                  value={form.title}
                  onChange={set("title")}
                  placeholder="e.g. Kind of Blue"
                  autoFocus
                />
              </Field>

              <Field label="Artist" required>
                <Input
                  value={form.artist}
                  onChange={set("artist")}
                  placeholder="e.g. Miles Davis"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Year" required>
                  <Input
                    value={form.year}
                    onChange={set("year")}
                    placeholder="1959"
                    type="number"
                    min="1900"
                    max={String(new Date().getFullYear())}
                  />
                </Field>

                <Field label="Genre" required>
                  <Input
                    value={form.genre}
                    onChange={set("genre")}
                    placeholder="e.g. Jazz"
                  />
                </Field>
              </div>

              <Field label="Condition">
                <Select
                  value={form.condition}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, condition: v as Condition }))}
                >
                  <SelectTrigger
                    className="h-9 w-full rounded-lg px-3 text-sm"
                    style={{
                      background: "var(--app-surface-3)",
                      border: "1px solid var(--app-border)",
                      color: "var(--app-text-1)",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Cover URL" hint="Optional">
                <Input
                  value={form.coverUrl}
                  onChange={set("coverUrl")}
                  placeholder="https://..."
                  type="url"
                />
              </Field>

              {form.coverUrl && (
                <div className="flex items-center gap-3 rounded-lg p-2" style={{ background: "var(--app-surface-3)", border: "1px solid var(--app-border)" }}>
                  <div
                    className="h-12 w-12 shrink-0 rounded-lg bg-cover bg-center"
                    style={{ backgroundImage: `url(${form.coverUrl})` }}
                  />
                  <span className="text-xs" style={{ color: "var(--app-text-3)" }}>Cover preview</span>
                </div>
              )}

              <Field label="Notes" hint="Optional">
                <textarea
                  value={form.notes}
                  onChange={set("notes")}
                  placeholder="Any notes about this record..."
                  rows={2}
                  className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    background: "var(--app-surface-3)",
                    border: "1px solid var(--app-border)",
                    color: "var(--app-text-1)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--app-green-border)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--app-border)")}
                />
              </Field>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex gap-2.5 px-5 pb-5 shrink-0"
            style={{ paddingTop: "2px", borderTop: "1px solid var(--app-border)" }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-40"
              style={{
                border: "1px solid var(--app-border)",
                color: "var(--app-text-2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--app-hover)"
                e.currentTarget.style.color = "var(--app-text-1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "var(--app-text-2)"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !form.title.trim() || !form.artist.trim() || !form.genre.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--app-green)", color: "#0a0a0a" }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.opacity = "0.88" }}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isSubmitting ? "Adding..." : "Add to Collection"}
            </button>
          </div>
        </form>
        </div>
      </div>
    </>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1">
        <label className="text-xs font-medium" style={{ color: "var(--app-text-2)" }}>
          {label}
        </label>
        {required && (
          <span className="text-xs" style={{ color: "var(--app-green)" }}>*</span>
        )}
        {hint && (
          <span className="text-xs" style={{ color: "var(--app-text-3)" }}>— {hint}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
  min,
  max,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  autoFocus?: boolean
  min?: string
  max?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      min={min}
      max={max}
      className="h-9 w-full rounded-lg px-3 text-sm outline-none transition-colors"
      style={{
        background: "var(--app-surface-3)",
        border: "1px solid var(--app-border)",
        color: "var(--app-text-1)",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--app-green-border)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--app-border)")}
    />
  )
}
