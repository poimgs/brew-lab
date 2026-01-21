import type { Coffee, RoastLevel } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CoffeeCardProps {
  coffee: Coffee;
  onClick: () => void;
}

const roastLevelColors: Record<RoastLevel, string> = {
  Light: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  Medium: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Medium-Dark": "bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100",
  Dark: "bg-stone-200 text-stone-900 dark:bg-stone-700 dark:text-stone-100",
};

export function CoffeeCard({ coffee, onClick }: CoffeeCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground truncate">
              {coffee.roaster}
            </p>
            <CardTitle className="text-lg truncate">{coffee.name}</CardTitle>
          </div>
          {coffee.roast_level && (
            <Badge
              variant="secondary"
              className={roastLevelColors[coffee.roast_level]}
            >
              {coffee.roast_level}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {coffee.country && (
            <Badge variant="outline">{coffee.country}</Badge>
          )}
          {coffee.process && (
            <Badge variant="secondary">{coffee.process}</Badge>
          )}
        </div>

        {coffee.tasting_notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {coffee.tasting_notes}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {coffee.days_since_roast !== undefined && coffee.days_since_roast !== null ? (
            <span>
              {coffee.days_since_roast === 0
                ? "Roasted today"
                : coffee.days_since_roast === 1
                ? "1 day since roast"
                : `${coffee.days_since_roast} days since roast`}
            </span>
          ) : (
            <span>No roast date</span>
          )}
          {coffee.experiment_count > 0 && (
            <span>{coffee.experiment_count} brews</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
