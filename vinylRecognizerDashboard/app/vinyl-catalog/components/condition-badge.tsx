import type { Condition } from "../types"

const conditionConfig: Record<
  Condition,
  { color: string; bg: string; border: string; label: string }
> = {
  mint:      { color: "#28d768", bg: "rgba(40,215,104,0.10)",  border: "rgba(40,215,104,0.22)",  label: "Mint" },
  excellent: { color: "#5bc8ff", bg: "rgba(91,200,255,0.10)",  border: "rgba(91,200,255,0.22)",  label: "Excellent" },
  good:      { color: "#f5c842", bg: "rgba(245,200,66,0.10)",  border: "rgba(245,200,66,0.22)",  label: "Good" },
  fair:      { color: "#f5612f", bg: "rgba(245,97,47,0.10)",   border: "rgba(245,97,47,0.22)",   label: "Fair" },
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
