import { Link } from "react-router-dom"
import { format } from "date-fns"
import { ArrowUp, ArrowDown, Lightbulb } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ExperimentWithGaps, SensoryGaps } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ExperimentWithGapsCardProps {
  experiment: ExperimentWithGaps
}

function GapIndicator({ gaps }: { gaps?: SensoryGaps }) {
  if (!gaps) return null

  const gapItems: { label: string; direction: string; amount: number }[] = []

  if (gaps.acidity && gaps.acidity.direction !== "on_target") {
    gapItems.push({
      label: "Acidity",
      direction: gaps.acidity.direction,
      amount: gaps.acidity.amount,
    })
  }
  if (gaps.sweetness && gaps.sweetness.direction !== "on_target") {
    gapItems.push({
      label: "Sweetness",
      direction: gaps.sweetness.direction,
      amount: gaps.sweetness.amount,
    })
  }
  if (gaps.bitterness && gaps.bitterness.direction !== "on_target") {
    gapItems.push({
      label: "Bitterness",
      direction: gaps.bitterness.direction,
      amount: gaps.bitterness.amount,
    })
  }
  if (gaps.body && gaps.body.direction !== "on_target") {
    gapItems.push({
      label: "Body",
      direction: gaps.body.direction,
      amount: gaps.body.amount,
    })
  }
  if (gaps.aroma && gaps.aroma.direction !== "on_target") {
    gapItems.push({
      label: "Aroma",
      direction: gaps.aroma.direction,
      amount: gaps.aroma.amount,
    })
  }

  if (gapItems.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {gapItems.map((gap) => (
        <div
          key={gap.label}
          className={cn(
            "flex items-center gap-1 text-xs px-2 py-1 rounded-full border",
            gap.direction === "increase" &&
              "border-green-200 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300",
            gap.direction === "decrease" &&
              "border-red-200 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300"
          )}
        >
          {gap.direction === "increase" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
          <span>
            {gap.label} ({gap.direction === "increase" ? "+" : "-"}
            {gap.amount})
          </span>
        </div>
      ))}
    </div>
  )
}

export function ExperimentWithGapsCard({
  experiment,
}: ExperimentWithGapsCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {experiment.coffee?.name || "Unknown Coffee"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {experiment.coffee?.roaster || "Unknown Roaster"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {experiment.overall_score && (
              <Badge variant="outline">{experiment.overall_score}/10</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {format(new Date(experiment.brew_date), "MMM d, yyyy")}
        </p>

        {experiment.overall_notes && (
          <p className="text-sm line-clamp-2">{experiment.overall_notes}</p>
        )}

        <GapIndicator gaps={experiment.gaps} />

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3 text-orange-500" />
              <span>{experiment.active_gap_count} gaps</span>
            </div>
            <div className="flex items-center gap-1">
              <Lightbulb className="h-3 w-3 text-yellow-500" />
              <span>{experiment.recommendation_count} recommendations</span>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to={`/experiments/${experiment.id}?tab=optimization`}>
              View
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
