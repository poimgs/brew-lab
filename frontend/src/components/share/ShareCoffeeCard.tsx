import type { ShareCoffee } from "@/api/shareLink"
import { SensoryRadarChart } from "@/components/brew/SensoryRadarChart"

interface ShareCoffeeCardProps {
  coffee: ShareCoffee
}

export function ShareCoffeeCard({ coffee }: ShareCoffeeCardProps) {
  const originParts = [coffee.country, coffee.process, coffee.roast_level].filter(Boolean)
  const ref = coffee.reference_brew

  return (
    <div
      className="rounded-lg border border-border bg-card p-6 shadow-sm"
      role="article"
      aria-label={`${coffee.name}${coffee.roaster ? ` by ${coffee.roaster}` : ""}`}
    >
      <div className="min-w-0">
        <h3 className="truncate text-lg font-semibold text-card-foreground">
          {coffee.name}
        </h3>
        {coffee.roaster && (
          <p className="truncate text-sm text-muted-foreground">
            {coffee.roaster}
          </p>
        )}
      </div>

      {originParts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {originParts.map((part) => (
            <span
              key={part}
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {part}
            </span>
          ))}
        </div>
      )}

      {coffee.tasting_notes && (
        <p className="mt-3 text-sm text-muted-foreground">
          {coffee.tasting_notes}
        </p>
      )}

      {coffee.roast_date && (
        <p className="mt-2 text-xs text-muted-foreground">
          Roasted{" "}
          {new Date(coffee.roast_date + "T00:00:00").toLocaleDateString(
            undefined,
            { month: "short", day: "numeric", year: "numeric" }
          )}
        </p>
      )}

      {ref?.overall_score != null && (
        <p className="mt-3 text-sm font-medium text-card-foreground">
          Score: {ref.overall_score}/10
        </p>
      )}

      {ref && (
        <div className="mt-3 flex justify-center">
          <SensoryRadarChart
            aroma_intensity={ref.aroma_intensity}
            body_intensity={ref.body_intensity}
            sweetness_intensity={ref.sweetness_intensity}
            brightness_intensity={ref.brightness_intensity}
            complexity_intensity={ref.complexity_intensity}
            aftertaste_intensity={ref.aftertaste_intensity}
            size={160}
          />
        </div>
      )}
    </div>
  )
}
