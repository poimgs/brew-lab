import { ArrowUp, ArrowDown, Minus, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DeltaTrend } from "@/lib/api"

interface DeltaIndicatorProps {
  trend: DeltaTrend
  min?: number | string
  max?: number | string
  className?: string
}

export function DeltaIndicator({ trend, min, max, className }: DeltaIndicatorProps) {
  const Icon = {
    increasing: ArrowUp,
    decreasing: ArrowDown,
    stable: Minus,
    variable: Activity,
  }[trend]

  const colorClass = {
    increasing: "text-green-600",
    decreasing: "text-red-600",
    stable: "text-muted-foreground",
    variable: "text-amber-600",
  }[trend]

  const label = {
    increasing: "Increasing",
    decreasing: "Decreasing",
    stable: "Stable",
    variable: "Variable",
  }[trend]

  const formatValue = (val: number | string | undefined) => {
    if (val === undefined) return "-"
    if (typeof val === "number") {
      return Number.isInteger(val) ? val : val.toFixed(2)
    }
    return val
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon className={cn("h-4 w-4", colorClass)} />
      <span className={cn("text-xs font-medium", colorClass)}>{label}</span>
      {min !== undefined && max !== undefined && min !== max && (
        <span className="text-xs text-muted-foreground">
          ({formatValue(min)} - {formatValue(max)})
        </span>
      )}
    </div>
  )
}
