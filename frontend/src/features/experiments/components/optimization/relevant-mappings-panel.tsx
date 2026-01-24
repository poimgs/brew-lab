import { ArrowUp, ArrowDown, Minus, Lightbulb } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { EffectMapping, SensoryGaps } from "@/lib/api"
import { cn } from "@/lib/utils"

interface RelevantMappingsPanelProps {
  mappings: EffectMapping[]
  gaps?: SensoryGaps
}

const outputVariableLabels: Record<string, string> = {
  acidity: "Acidity",
  sweetness: "Sweetness",
  bitterness: "Bitterness",
  body: "Body",
  aroma: "Aroma",
  aftertaste: "Aftertaste",
  overall: "Overall",
}

const inputVariableLabels: Record<string, string> = {
  temperature: "Temperature",
  ratio: "Ratio",
  grind_size: "Grind Size",
  bloom_time: "Bloom Time",
  total_brew_time: "Brew Time",
  coffee_weight: "Coffee Weight",
  pour_count: "Pour Count",
  pour_technique: "Pour Technique",
  filter_type: "Filter Type",
}

function EffectIcon({ direction }: { direction: string }) {
  switch (direction) {
    case "increase":
      return <ArrowUp className="h-3 w-3 text-green-500" />
    case "decrease":
      return <ArrowDown className="h-3 w-3 text-red-500" />
    default:
      return <Minus className="h-3 w-3 text-muted-foreground" />
  }
}

function MappingCard({
  mapping,
  gaps,
}: {
  mapping: EffectMapping
  gaps?: SensoryGaps
}) {
  // Determine which gaps this mapping helps address
  const helpsWith: string[] = []
  if (gaps) {
    for (const effect of mapping.effects) {
      if (effect.direction === "none") continue
      const gapKey = effect.output_variable as keyof SensoryGaps
      const gap = gaps[gapKey]
      if (gap && gap.direction !== "on_target") {
        // Check if the effect direction matches what we need
        if (
          (gap.direction === "increase" && effect.direction === "increase") ||
          (gap.direction === "decrease" && effect.direction === "decrease")
        ) {
          helpsWith.push(outputVariableLabels[effect.output_variable] || effect.output_variable)
        }
      }
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium">{mapping.name}</h4>
              <p className="text-sm text-muted-foreground">
                {mapping.direction === "increase" ? "Increase" : "Decrease"}{" "}
                {inputVariableLabels[mapping.variable] || mapping.variable}
              </p>
            </div>
            {helpsWith.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                Helps with {helpsWith.join(", ")}
              </Badge>
            )}
          </div>

          <p className="text-sm bg-muted/50 rounded px-2 py-1">
            {mapping.tick_description}
          </p>

          <div className="flex flex-wrap gap-2">
            {mapping.effects.map((effect) => (
              <div
                key={effect.id}
                className={cn(
                  "flex items-center gap-1 text-xs px-2 py-1 rounded-full border",
                  effect.confidence === "high" && "border-green-200 bg-green-50 dark:bg-green-950/20",
                  effect.confidence === "medium" && "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20",
                  effect.confidence === "low" && "border-gray-200 bg-gray-50 dark:bg-gray-950/20"
                )}
              >
                <EffectIcon direction={effect.direction} />
                <span>
                  {outputVariableLabels[effect.output_variable] || effect.output_variable}
                </span>
              </div>
            ))}
          </div>

          {mapping.source && (
            <p className="text-xs text-muted-foreground">
              Source: {mapping.source}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function RelevantMappingsPanel({ mappings, gaps }: RelevantMappingsPanelProps) {
  if (mappings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No relevant recommendations found. Make sure you have active effect mappings
            that address the gaps in your target profile.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium flex items-center gap-2">
        <Lightbulb className="h-5 w-5" />
        Recommendations ({mappings.length})
      </h3>
      <div className="grid gap-4">
        {mappings.map((mapping) => (
          <MappingCard key={mapping.id} mapping={mapping} gaps={gaps} />
        ))}
      </div>
    </div>
  )
}
