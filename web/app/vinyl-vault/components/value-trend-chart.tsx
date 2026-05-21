"use client"

import { useEffect, useState } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { TrendingUp, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { useTauriAuth } from "@/lib/tauri-auth"

type Point = { month: string; totalValue: number; count: number }

function fmtMonth(yyyyMm: string): string {
  // "2026-05" → "May '26"
  const [y, m] = yyyyMm.split("-")
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '")
}

function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

type TooltipPayloadEntry = { payload: Point }
function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        background: "var(--app-surface-2, var(--app-surface-3))",
        border: "1px solid var(--app-border)",
        color: "var(--app-text-1)",
      }}
    >
      <div className="font-semibold">{fmtMonth(point.month)}</div>
      <div style={{ color: "var(--app-green)" }}>${point.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
      <div style={{ color: "var(--app-text-3)" }}>{point.count} records priced</div>
    </div>
  )
}

export function ValueTrendChart() {
  const { accessToken: token } = useTauriAuth()
  const [data, setData] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.collection
      .getValueHistory(token ?? undefined)
      .then((rows: Point[]) => {
        if (!cancelled) setData(rows)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load value history")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [token])

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--app-surface-2, var(--app-surface-3))",
        border: "1px solid var(--app-border)",
      }}
    >
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4" style={{ color: "var(--app-green)" }} />
        <h3 className="text-sm font-semibold" style={{ color: "var(--app-text-1)" }}>
          Value Trend (last 12 months)
        </h3>
      </div>

      <div className="mt-4 h-64">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--app-text-3)" }} />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--app-text-3)" }}>
            {error}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--app-text-3)" }}>
            No price history yet — refresh prices to populate.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="valueTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--app-green)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--app-green)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" vertical={false} opacity={0.4} />
              <XAxis
                dataKey="month"
                tickFormatter={fmtMonth}
                tick={{ fontSize: 11, fill: "var(--app-text-3)" }}
                axisLine={{ stroke: "var(--app-border)" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtUsd}
                tick={{ fontSize: 11, fill: "var(--app-text-3)" }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--app-green)", strokeOpacity: 0.3 }} />
              <Area
                type="monotone"
                dataKey="totalValue"
                stroke="var(--app-green)"
                strokeWidth={2}
                fill="url(#valueTrendFill)"
                isAnimationActive
                animationDuration={700}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
