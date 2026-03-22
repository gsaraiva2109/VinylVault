"use client"

import { useVinylCatalog } from "../../context"
import { getCollectionStats } from "../../data"
import { ConditionBadge } from "../condition-badge"
import {
  Disc3,
  DollarSign,
  TrendingUp,
  Calendar,
  Music,
  Star,
} from "lucide-react"
import type { Condition } from "../../types"

export function StatsScreen() {
  const { records } = useVinylCatalog()
  const stats = getCollectionStats(records)

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-6xl">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Disc3}
            label="Total Records"
            value={stats.totalRecords.toString()}
            description="In your collection"
          />
          <StatCard
            icon={DollarSign}
            label="Collection Value"
            value={`$${stats.totalValue.toLocaleString()}`}
            description="Estimated from Discogs"
            highlight
          />
          <StatCard
            icon={Music}
            label="Genres"
            value={Object.keys(stats.byGenre).length.toString()}
            description="Different genres"
          />
          <StatCard
            icon={Calendar}
            label="Decades Span"
            value={Object.keys(stats.byDecade).length.toString()}
            description="Decades represented"
          />
        </div>

        {/* Charts Row */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Genre Distribution */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <Music className="h-5 w-5" />
              By Genre
            </h3>
            <div className="mt-4 space-y-3">
              {Object.entries(stats.byGenre)
                .sort(([, a], [, b]) => b - a)
                .map(([genre, count]) => (
                  <div key={genre} className="flex items-center gap-3">
                    <div className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
                      {genre}
                    </div>
                    <div className="flex-1">
                      <div className="h-6 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                          style={{
                            width: `${(count / stats.totalRecords) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-8 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {count}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Decade Distribution */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <Calendar className="h-5 w-5" />
              By Decade
            </h3>
            <div className="mt-4">
              <div className="flex h-48 items-end gap-2">
                {Object.entries(stats.byDecade)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([decade, count]) => {
                    const maxCount = Math.max(...Object.values(stats.byDecade))
                    const height = (count / maxCount) * 100
                    return (
                      <div key={decade} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          {count}
                        </span>
                        <div
                          className="w-full rounded-t-lg bg-zinc-900 transition-all dark:bg-zinc-100"
                          style={{ height: `${height}%` }}
                        />
                        <span className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {decade}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Condition & Recent */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Condition Breakdown */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <Star className="h-5 w-5" />
              Condition Breakdown
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {(["mint", "excellent", "good", "fair"] as Condition[]).map((condition) => {
                const count = stats.byCondition[condition]
                const percentage = stats.totalRecords > 0 
                  ? ((count / stats.totalRecords) * 100).toFixed(0)
                  : 0
                return (
                  <div
                    key={condition}
                    className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-center justify-between">
                      <ConditionBadge condition={condition} />
                      <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {count}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {percentage}% of collection
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recently Added */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <TrendingUp className="h-5 w-5" />
              Recently Added
            </h3>
            <div className="mt-4 space-y-3">
              {stats.recentlyAdded.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
                >
                  <div
                    className="h-12 w-12 shrink-0 rounded-lg bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${record.coverUrl})`,
                      backgroundColor: "#1a1a2e",
                    }}
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {record.title}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {record.artist}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                    {formatDate(record.dateAdded)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Most Valuable */}
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <DollarSign className="h-5 w-5" />
            Most Valuable Records
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...records]
              .filter((r) => r.discogs?.value)
              .sort((a, b) => (b.discogs?.value || 0) - (a.discogs?.value || 0))
              .slice(0, 3)
              .map((record, index) => (
                <div
                  key={record.id}
                  className="flex items-center gap-4 rounded-lg border border-zinc-100 p-4 dark:border-zinc-800"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    #{index + 1}
                  </div>
                  <div
                    className="h-14 w-14 shrink-0 rounded-lg bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${record.coverUrl})`,
                      backgroundColor: "#1a1a2e",
                    }}
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {record.title}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {record.artist}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      ${record.discogs?.value}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  highlight,
}: {
  icon: typeof Disc3
  label: string
  value: string
  description: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-6",
        highlight
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          highlight
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p
        className={cn(
          "mt-4 text-sm font-medium",
          highlight
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-zinc-500 dark:text-zinc-400"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold",
          highlight
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-zinc-900 dark:text-zinc-100"
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "mt-1 text-xs",
          highlight
            ? "text-emerald-600 dark:text-emerald-500"
            : "text-zinc-400 dark:text-zinc-500"
        )}
      >
        {description}
      </p>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
