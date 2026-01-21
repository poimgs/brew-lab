import { Link } from "react-router-dom"
import { format } from "date-fns"
import { Coffee, Star, Calendar, Clock, Droplets } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Experiment } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ExperimentCardProps {
  experiment: Experiment
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
  const formatBrewDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy")
    } catch {
      return dateStr
    }
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Link to={`/experiments/${experiment.id}`}>
      <Card className="hover:bg-accent/50 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {experiment.coffee ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coffee className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {experiment.coffee.roaster} - {experiment.coffee.name}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coffee className="h-4 w-4 shrink-0" />
                  <span className="italic">No coffee selected</span>
                </div>
              )}
            </div>
            {experiment.overall_score && (
              <div className="flex items-center gap-1 shrink-0">
                <Star
                  className={cn(
                    "h-4 w-4",
                    experiment.overall_score >= 7
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-muted-foreground"
                  )}
                />
                <span className="font-mono font-medium">
                  {experiment.overall_score}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm line-clamp-2">{experiment.overall_notes}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatBrewDate(experiment.brew_date)}
            </div>
            {experiment.days_off_roast !== undefined && (
              <div className="flex items-center gap-1">
                <span>Day {experiment.days_off_roast}</span>
              </div>
            )}
            {experiment.total_brew_time && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(experiment.total_brew_time)}
              </div>
            )}
            {experiment.calculated_ratio && (
              <div className="flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5" />
                1:{experiment.calculated_ratio.toFixed(1)}
              </div>
            )}
          </div>

          {experiment.issue_tags && experiment.issue_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {experiment.issue_tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant={tag.is_system ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {tag.name}
                </Badge>
              ))}
              {experiment.issue_tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{experiment.issue_tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
