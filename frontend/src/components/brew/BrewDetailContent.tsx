import type { Brew } from "@/api/brews"
import {
  formatTime,
  formatPours,
  formatRatio,
  formatTemp,
  formatFilterPaper,
  scoreColor,
} from "@/lib/brew-utils"

interface BrewDetailContentProps {
  brew: Brew
}

export function BrewDetailContent({ brew }: BrewDetailContentProps) {
  return (
    <>
      {/* Setup section */}
      <div className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Setup
        </h3>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
          {brew.coffee_weight != null && (
            <div>
              <span className="text-muted-foreground">Coffee:</span>{" "}
              <span className="font-medium tabular-nums">{brew.coffee_weight}g</span>
            </div>
          )}
          {brew.ratio != null && (
            <div>
              <span className="text-muted-foreground">Ratio:</span>{" "}
              <span className="font-medium tabular-nums">{formatRatio(brew.ratio)}</span>
            </div>
          )}
          {brew.water_weight != null && (
            <div>
              <span className="text-muted-foreground">Water:</span>{" "}
              <span className="font-medium tabular-nums">{brew.water_weight}g</span>
            </div>
          )}
          {brew.grind_size != null && (
            <div>
              <span className="text-muted-foreground">Grind:</span>{" "}
              <span className="font-medium tabular-nums">{brew.grind_size}</span>
            </div>
          )}
          {brew.water_temperature != null && (
            <div>
              <span className="text-muted-foreground">Temp:</span>{" "}
              <span className="font-medium tabular-nums">{formatTemp(brew.water_temperature)}</span>
            </div>
          )}
          {brew.filter_paper && (
            <div>
              <span className="text-muted-foreground">Filter:</span>{" "}
              <span className="font-medium">{formatFilterPaper(brew)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Brewing section */}
      <div className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Brewing
        </h3>
        <div className="space-y-1 text-sm">
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
          {brew.technique_notes && (
            <div>
              <span className="text-muted-foreground">Technique:</span>{" "}
              <span className="font-medium">{brew.technique_notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tasting section */}
      <div className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Tasting
        </h3>
        <div className="space-y-1 text-sm">
          <div className="flex flex-wrap gap-x-4">
            {brew.coffee_ml != null && (
              <div>
                <span className="text-muted-foreground">Coffee:</span>{" "}
                <span className="font-medium tabular-nums">{brew.coffee_ml}ml</span>
              </div>
            )}
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
          </div>
          {brew.overall_score != null && (
            <div>
              <span className="text-muted-foreground">Overall:</span>{" "}
              <span className={`font-medium tabular-nums ${scoreColor(brew.overall_score)}`}>
                {brew.overall_score}/10
              </span>
            </div>
          )}
          {/* Sensory attributes */}
          {(brew.aroma_intensity != null ||
            brew.body_intensity != null ||
            brew.sweetness_intensity != null ||
            brew.brightness_intensity != null ||
            brew.complexity_intensity != null ||
            brew.aftertaste_intensity != null) && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-1">
              {brew.aroma_intensity != null && (
                <span>
                  <span className="text-muted-foreground">Aroma:</span>{" "}
                  <span className="font-medium tabular-nums">{brew.aroma_intensity}</span>
                </span>
              )}
              {brew.body_intensity != null && (
                <span>
                  <span className="text-muted-foreground">Body:</span>{" "}
                  <span className="font-medium tabular-nums">{brew.body_intensity}</span>
                </span>
              )}
              {brew.sweetness_intensity != null && (
                <span>
                  <span className="text-muted-foreground">Sweetness:</span>{" "}
                  <span className="font-medium tabular-nums">{brew.sweetness_intensity}</span>
                </span>
              )}
              {brew.brightness_intensity != null && (
                <span>
                  <span className="text-muted-foreground">Brightness:</span>{" "}
                  <span className="font-medium tabular-nums">{brew.brightness_intensity}</span>
                </span>
              )}
              {brew.complexity_intensity != null && (
                <span>
                  <span className="text-muted-foreground">Complexity:</span>{" "}
                  <span className="font-medium tabular-nums">{brew.complexity_intensity}</span>
                </span>
              )}
              {brew.aftertaste_intensity != null && (
                <span>
                  <span className="text-muted-foreground">Aftertaste:</span>{" "}
                  <span className="font-medium tabular-nums">{brew.aftertaste_intensity}</span>
                </span>
              )}
            </div>
          )}
          {brew.overall_notes && (
            <div className="pt-1">
              <span className="text-muted-foreground">Notes:</span>{" "}
              <span className="font-medium">{brew.overall_notes}</span>
            </div>
          )}
          {brew.improvement_notes && (
            <div>
              <span className="text-muted-foreground">Improvement:</span>{" "}
              <span className="font-medium">{brew.improvement_notes}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
