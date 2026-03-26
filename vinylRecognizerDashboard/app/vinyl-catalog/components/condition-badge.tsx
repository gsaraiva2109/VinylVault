import type { Condition } from "../types"

const mintStyle = { color: "#28d768", bg: "rgba(40,215,104,0.10)",  border: "rgba(40,215,104,0.22)" }
const excelStyle = { color: "#5bc8ff", bg: "rgba(91,200,255,0.10)",  border: "rgba(91,200,255,0.22)" }
const goodStyle = { color: "#f5c842", bg: "rgba(245,200,66,0.10)",  border: "rgba(245,200,66,0.22)" }
const fairStyle = { color: "#f5612f", bg: "rgba(245,97,47,0.10)",   border: "rgba(245,97,47,0.22)" }

const conditionConfig: Record<
  Condition,
  { color: string; bg: string; border: string; label: string }
> = {
  "M":   { ...mintStyle, label: "Mint (M)" },
  "NM":  { ...mintStyle, label: "Near Mint (NM)" },
  "VG+": { ...excelStyle, label: "Very Good Plus (VG+)" },
  "VG":  { ...goodStyle, label: "Very Good (VG)" },
  "G+":  { ...goodStyle, label: "Good Plus (G+)" },
  "G":   { ...fairStyle, label: "Good (G)" },
  "F":   { ...fairStyle, label: "Fair (F)" },
  "P":   { ...fairStyle, label: "Poor (P)" },
}

interface ConditionBadgeProps {
  condition: Condition
  size?: "sm" | "md"
  className?: string
}

export function ConditionBadge({ condition }: ConditionBadgeProps) {
  const cfg = conditionConfig[condition]
  return (
    <span
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        padding: "2px 7px",
        borderRadius: "9999px",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.05em",
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1.5,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  )
}
