import { Star } from "lucide-react"
import type { Brew } from "@/api/brews"
import {
  formatBrewDate,
  formatTime,
  formatPours,
  formatRatio,
  formatTemp,
  scoreColor,
} from "@/lib/brew-utils"

interface ReferenceBrewSectionProps {
  brew: Brew | null
  source: "starred" | "latest"
  isStarred: boolean
  isStarring: boolean
  onToggleStar: () => void
  onChangeReference: () => void
}

export function ReferenceBrewSection({
  brew,
  source,
  isStarred,
  isStarring,
  onToggleStar,
  onChangeReference,
}: ReferenceBrewSectionProps) {
  if (!brew) {
    return (
      <div className="mt-8 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">Reference Brew</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No brews yet. Log your first brew to see reference data here.
        </p>
      </div>
    )
  }

  const sourceLabel = source === "starred" ? "starred" : "latest"

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            Reference ({sourceLabel})
          </h2>
          <span className="text-sm text-muted-foreground">
            {formatBrewDate(brew.brew_date)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleStar}
            disabled={isStarring}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            aria-label={isStarred ? "Unstar reference" : "Star as reference"}
          >
            <Star
              className={`h-4 w-4 ${isStarred ? "fill-amber-500 text-amber-500" : ""}`}
            />
          </button>
          <button
            onClick={onChangeReference}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Change
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {/* Key parameters */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {brew.grind_size != null && (
            <div>
              <span className="text-muted-foreground">Grind:</span>{" "}
              <span className="font-medium tabular-nums">{brew.grind_size}</span>
            </div>
          )}
          {brew.ratio != null && (
            <div>
              <span className="text-muted-foreground">Ratio:</span>{" "}
              <span className="font-medium tabular-nums">{formatRatio(brew.ratio)}</span>
            </div>
          )}
          {brew.water_temperature != null && (
            <div>
              <span className="text-muted-foreground">Temp:</span>{" "}
              <span className="font-medium tabular-nums">{formatTemp(brew.water_temperature)}</span>
            </div>
          )}
        </div>

        {brew.pours && brew.pours.length > 0 && (
          <div>
            <span className="text-muted-foreground">Pours:</span>{" "}
            <span className="font-medium">{formatPours(brew.pours)}</span>
          </div>
        )}

        {brew.total_brew_time != null && (
          <div>
            <span className="text-muted-foreground">Total:</span>{" "}
            <span className="font-medium tabular-nums">{formatTime(brew.total_brew_time)}</span>
          </div>
        )}

        {/* Key outcomes */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 pt-2">
          {brew.tds != null && (
            <div>
              <span className="text-muted-foreground">TDS:</span>{" "}
              <span className="font-medium tabular-nums">{brew.tds}</span>
            </div>
          )}
          {brew.extraction_yield != null && (
            <div>
              <span className="text-muted-foreground">Extraction:</span>{" "}
              <span className="font-medium tabular-nums">{brew.extraction_yield}%</span>
            </div>
          )}
          {brew.overall_score != null && (
            <div>
              <span className="text-muted-foreground">Overall:</span>{" "}
              <span className={`font-medium tabular-nums ${scoreColor(brew.overall_score)}`}>
                {brew.overall_score}/10
              </span>
            </div>
          )}
        </div>

        {/* Improvement notes */}
        {brew.improvement_notes && (
          <div className="border-t border-border/50 pt-2">
            <span className="text-muted-foreground">Improvement:</span>{" "}
            <span className="font-medium italic">&ldquo;{brew.improvement_notes}&rdquo;</span>
          </div>
        )}
      </div>
    </div>
  )
}
