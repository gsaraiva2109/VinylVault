import { cn } from "@/lib/utils"
import type { Condition } from "../types"

const conditionStyles: Record<Condition, { bg: string; text: string; label: string }> = {
  mint: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "Mint",
  },
  excellent: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    label: "Excellent",
  },
  good: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    label: "Good",
  },
  fair: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    label: "Fair",
  },
}

interface ConditionBadgeProps {
  condition: Condition
  size?: "sm" | "md"
  className?: string
}

export function ConditionBadge({ condition, size = "sm", className }: ConditionBadgeProps) {
  const style = conditionStyles[condition]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        style.bg,
        style.text,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
    >
      {style.label}
    </span>
  )
}
