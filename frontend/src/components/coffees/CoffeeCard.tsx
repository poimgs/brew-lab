import { useNavigate } from "react-router-dom"
import { Archive } from "lucide-react"
import type { Coffee } from "@/api/coffees"

interface CoffeeCardProps {
  coffee: Coffee
}

export function CoffeeCard({ coffee }: CoffeeCardProps) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/coffees/${coffee.id}`)}
      className="cursor-pointer rounded-lg border border-border bg-card p-6 shadow-sm transition-colors hover:bg-muted/50"
      role="article"
      aria-label={`${coffee.name} by ${coffee.roaster}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-card-foreground">
            {coffee.name}
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {coffee.roaster}
          </p>
        </div>
        {coffee.archived_at && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <Archive className="h-3 w-3" />
            Archived
          </span>
        )}
      </div>

      {(coffee.country || coffee.process) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {coffee.country && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {coffee.country}
            </span>
          )}
          {coffee.process && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {coffee.process}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
        <span>{coffee.brew_count} brews</span>
        {coffee.roast_date && (
          <span>
            Roasted{" "}
            {new Date(coffee.roast_date + "T00:00:00").toLocaleDateString(
              undefined,
              { month: "short", day: "numeric" }
            )}
          </span>
        )}
      </div>
    </div>
  )
}
