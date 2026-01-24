import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Insight } from "@/lib/api"
import { cn } from "@/lib/utils"

interface InsightsPanelProps {
  insights: Insight[]
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No strong correlations found. Try adding more experiments with varied
            parameters and sensory scores.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Top Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, idx) => {
          const isPositive =
            insight.type === "strong_positive" ||
            insight.type === "moderate_positive"
          const isStrong =
            insight.type === "strong_positive" ||
            insight.type === "strong_negative"

          return (
            <div
              key={idx}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg",
                isStrong ? "bg-muted" : "bg-muted/50"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium">{insight.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Correlation: r = {insight.r.toFixed(3)}
                </p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
