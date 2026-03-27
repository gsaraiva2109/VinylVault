"use client"

import { useVinylCatalog } from "../../context"
import { getCollectionStats } from "../../data"
import { ConditionBadge } from "../condition-badge"
import { useTauriAuth } from "@/lib/tauri-auth"
import { useState } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import {
  Disc3,
  DollarSign,
  TrendingUp,
  Calendar,
  Music,
  Star,
  RefreshCw,
  Loader2,
} from "lucide-react"
import type { Condition } from "../../types"

export function StatsScreen() {
  const { activeRecords, refreshCollection } = useVinylCatalog()
  const stats = getCollectionStats(activeRecords)
  const { accessToken: token } = useTauriAuth()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshPrices = async () => {
    setIsRefreshing(true)
    try {
      await api.discogs.refreshPrices(token ?? undefined)
      toast.success("Price refresh started. Updates may take a few minutes.")
      refreshCollection()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to refresh prices")
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: "var(--app-text-1)" }}>
            Collection Insights
          </h2>
          <button
            onClick={handleRefreshPrices}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            style={{
              border: "1px solid var(--app-border)",
              background: "var(--app-surface-3)",
              color: "var(--app-text-2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--app-text-1)"
              e.currentTarget.style.background = "var(--app-hover)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--app-text-2)"
              e.currentTarget.style.background = "var(--app-surface-3)"
            }}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isRefreshing ? "Refreshing..." : "Update Prices"}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Disc3}
            label="Total Records"
            value={stats.totalRecords.toString()}
            sub="In your collection"
          />
          <StatCard
            icon={DollarSign}
            label="Collection Value"
            value={`$${stats.totalValue.toLocaleString()}`}
            sub="Estimated from Discogs"
            highlight
          />
          <StatCard
            icon={Music}
            label="Genres"
            value={Object.keys(stats.byGenre).length.toString()}
            sub="Different genres"
          />
          <StatCard
            icon={Calendar}
            label="Decades"
            value={Object.keys(stats.byDecade).length.toString()}
            sub="Decades represented"
          />
        </div>

        {/* Genre + Decade */}
        <div className="mt-5 grid gap-5 lg:grid-cols-2">

          {/* Genre Distribution */}
          <Panel>
            <PanelHeader icon={Music} label="By Genre" />
            <div className="mt-4 space-y-2.5">
              {Object.entries(stats.byGenre)
                .sort(([, a], [, b]) => b - a)
                .map(([genre, count]) => {
                  const pct = (count / stats.totalRecords) * 100
                  return (
                    <div key={genre} className="flex items-center gap-3">
                      <div className="w-20 shrink-0 truncate text-xs" style={{ color: "var(--app-text-3)" }}>
                        {genre}
                      </div>
                      <div className="flex-1 overflow-hidden rounded-full" style={{ height: "5px", background: "var(--app-surface-3)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: "linear-gradient(90deg, var(--app-green) 0%, color-mix(in srgb, var(--app-green) 60%, transparent) 100%)",
                          }}
                        />
                      </div>
                      <div className="w-6 shrink-0 text-right text-xs font-medium" style={{ color: "var(--app-text-1)" }}>
                        {count}
                      </div>
                    </div>
                  )
                })}
            </div>
          </Panel>

          {/* Decade Bar Chart */}
          <Panel>
            <PanelHeader icon={Calendar} label="By Decade" />
            <div className="mt-4">
              <div className="flex h-44 items-end gap-2">
                {Object.entries(stats.byDecade)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([decade, count]) => {
                    const maxCount = Math.max(...Object.values(stats.byDecade))
                    const height = (count / maxCount) * 100
                    return (
                      <div key={decade} className="group flex flex-1 flex-col items-center gap-1">
                        <span
                          className="text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
                          style={{ color: "var(--app-green)" }}
                        >
                          {count}
                        </span>
                        <div
                          className="w-full rounded-t-md transition-opacity"
                          style={{
                            height: `${height}%`,
                            background: "linear-gradient(180deg, var(--app-green) 0%, color-mix(in srgb, var(--app-green) 50%, transparent) 100%)",
                            opacity: 0.85,
                          }}
                        />
                        <span className="mt-1 text-[10px]" style={{ color: "var(--app-text-3)" }}>
                          {decade}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          </Panel>
        </div>

        {/* Condition + Recently Added */}
        <div className="mt-5 grid gap-5 lg:grid-cols-2">

          {/* Condition Breakdown */}
          <Panel>
            <PanelHeader icon={Star} label="Condition Breakdown" />
            <div className="mt-4 grid grid-cols-4 gap-2">
              {(["M", "NM", "VG+", "VG", "G+", "G", "F", "P"] as Condition[]).map((condition) => {
                const count = stats.byCondition[condition]
                const pct = stats.totalRecords > 0
                  ? Math.round((count / stats.totalRecords) * 100)
                  : 0
                return (
                  <div
                    key={condition}
                    className="flex flex-col items-center gap-1.5 rounded-xl py-3"
                    style={{
                      background: count > 0 ? "var(--app-surface-3)" : "transparent",
                      border: count > 0 ? "1px solid var(--app-border)" : "1px solid transparent",
                    }}
                  >
                    <ConditionBadge condition={condition} />
                    <span className="text-lg font-bold leading-none" style={{ color: "var(--app-text-1)" }}>
                      {count}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--app-text-3)" }}>
                      {pct}%
                    </span>
                  </div>
                )
              })}
            </div>
          </Panel>

          {/* Recently Added */}
          <Panel>
            <PanelHeader icon={TrendingUp} label="Recently Added" />
            <div className="mt-4 space-y-2">
              {stats.recentlyAdded.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-3 rounded-xl p-2.5"
                  style={{ border: "1px solid var(--app-border)" }}
                >
                  <div
                    className="h-10 w-10 shrink-0 rounded-lg bg-cover bg-center"
                    style={{
                      backgroundImage: record.coverUrl ? `url(${record.coverUrl})` : undefined,
                      background: record.coverUrl ? undefined : "var(--app-surface-3)",
                    }}
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--app-text-1)" }}>
                      {record.title}
                    </p>
                    <p className="truncate text-xs" style={{ color: "var(--app-text-3)" }}>
                      {record.artist}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ background: "var(--app-surface-3)", color: "var(--app-text-3)" }}
                  >
                    {formatDate(record.dateAdded)}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Most Valuable */}
        <div className="mt-5">
          <Panel>
            <PanelHeader icon={DollarSign} label="Most Valuable Records" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...activeRecords]
                .filter((r) => r.discogs?.value)
                .sort((a, b) => (b.discogs?.value || 0) - (a.discogs?.value || 0))
                .slice(0, 3)
                .map((record, index) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{ border: "1px solid var(--app-border)" }}
                  >
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: "var(--app-green-bg)", color: "var(--app-green)" }}
                    >
                      #{index + 1}
                    </div>
                    <div
                      className="h-12 w-12 shrink-0 rounded-lg bg-cover bg-center"
                      style={{
                        backgroundImage: record.coverUrl ? `url(${record.coverUrl})` : undefined,
                        background: record.coverUrl ? undefined : "var(--app-surface-3)",
                      }}
                    />
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium" style={{ color: "var(--app-text-1)" }}>
                        {record.title}
                      </p>
                      <p className="truncate text-xs" style={{ color: "var(--app-text-3)" }}>
                        {record.artist}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--app-green)" }}>
                        ${record.discogs?.value}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </Panel>
        </div>

      </div>
    </div>
  )
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--app-surface-2, var(--app-surface-3))",
        border: "1px solid var(--app-border)",
      }}
    >
      {children}
    </div>
  )
}

function PanelHeader({ icon: Icon, label }: { icon: typeof Disc3; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4" style={{ color: "var(--app-green)" }} />
      <h3 className="text-sm font-semibold" style={{ color: "var(--app-text-1)" }}>
        {label}
      </h3>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: typeof Disc3
  label: string
  value: string
  sub: string
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: highlight ? "var(--app-green-bg)" : "var(--app-surface-2, var(--app-surface-3))",
        border: highlight ? "1px solid var(--app-green-border)" : "1px solid var(--app-border)",
      }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{
          background: highlight ? "color-mix(in srgb, var(--app-green) 15%, transparent)" : "var(--app-surface-3)",
          color: highlight ? "var(--app-green)" : "var(--app-text-2)",
        }}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-3 text-xs font-medium" style={{ color: highlight ? "var(--app-green)" : "var(--app-text-3)" }}>
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-bold" style={{ color: highlight ? "var(--app-green)" : "var(--app-text-1)" }}>
        {value}
      </p>
      <p className="mt-0.5 text-xs" style={{ color: highlight ? "color-mix(in srgb, var(--app-green) 70%, transparent)" : "var(--app-text-3)" }}>
        {sub}
      </p>
    </div>
  )
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
