import { ArrowUp, ArrowDown, Check } from "lucide-react"
import type { SensoryGaps, SensoryGap } from "@/lib/api"
import { cn } from "@/lib/utils"

interface GapSummaryProps {
  gaps: SensoryGaps
}

interface GapItemProps {
  label: string
  gap: SensoryGap
}

function GapItem({ label, gap }: GapItemProps) {
  const getIcon = () => {
    switch (gap.direction) {
      case "increase":
        return <ArrowUp className="h-4 w-4 text-green-500" />
      case "decrease":
        return <ArrowDown className="h-4 w-4 text-red-500" />
      case "on_target":
        return <Check className="h-4 w-4 text-primary" />
    }
  }

  const getDescription = () => {
    if (gap.direction === "on_target") {
      return "On target"
    }
    const action = gap.direction === "increase" ? "Increase" : "Decrease"
    return `${action} by ${gap.amount}`
  }

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          {gap.current ?? "-"} → {gap.target ?? "-"}
        </span>
        <span
          className={cn(
            "w-24 text-right",
            gap.direction === "increase" && "text-green-500",
            gap.direction === "decrease" && "text-red-500",
            gap.direction === "on_target" && "text-primary"
          )}
        >
          {getDescription()}
        </span>
      </div>
    </div>
  )
}

export function GapSummary({ gaps }: GapSummaryProps) {
  const gapItems = [
    { label: "Acidity", gap: gaps.acidity },
    { label: "Sweetness", gap: gaps.sweetness },
    { label: "Bitterness", gap: gaps.bitterness },
    { label: "Body", gap: gaps.body },
    { label: "Aroma", gap: gaps.aroma },
  ].filter((item) => item.gap !== undefined) as { label: string; gap: SensoryGap }[]

  if (gapItems.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-4">
        No gaps to display. Set target values to see optimization recommendations.
      </div>
    )
  }

  const needsWork = gapItems.filter((item) => item.gap.direction !== "on_target").length
  const onTarget = gapItems.filter((item) => item.gap.direction === "on_target").length

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        {needsWork > 0 && (
          <span className="text-muted-foreground">
            {needsWork} {needsWork === 1 ? "gap" : "gaps"} to address
          </span>
        )}
        {onTarget > 0 && (
          <span className="text-primary">
            {onTarget} on target
          </span>
        )}
      </div>
      <div className="rounded-lg border bg-card">
        {gapItems.map((item) => (
          <GapItem key={item.label} label={item.label} gap={item.gap} />
        ))}
      </div>
    </div>
  )
}
