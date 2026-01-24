import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowUp,
  ArrowDown,
  Minus,
  Lightbulb,
  AlertTriangle,
  Eye,
  X,
  Undo2,
  Beaker,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { RecommendationResponse } from "@/lib/api"
import { cn } from "@/lib/utils"
import { TryMappingDialog } from "./try-mapping-dialog"

interface RelevantMappingsPanelProps {
  recommendations: RecommendationResponse[]
  onDismiss: (mappingId: string) => Promise<void>
  onUndoDismiss: (mappingId: string) => Promise<void>
  onTryMapping: (mappingId: string, notes?: string) => Promise<void>
  isDismissing?: boolean
  isUndoing?: boolean
  isTrying?: boolean
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
  recommendation,
  onDismiss,
  onUndoDismiss,
  onTryClick,
  onViewDetails,
  isDismissing,
  isUndoing,
}: {
  recommendation: RecommendationResponse
  onDismiss: (mappingId: string) => Promise<void>
  onUndoDismiss: (mappingId: string) => Promise<void>
  onTryClick: () => void
  onViewDetails: () => void
  isDismissing?: boolean
  isUndoing?: boolean
}) {
  const isDismissed = recommendation.is_dismissed

  return (
    <Card
      className={cn(
        "transition-opacity",
        isDismissed && "opacity-50 bg-muted/30"
      )}
    >
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{recommendation.name}</h4>
                {recommendation.has_conflict && (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {recommendation.direction === "increase" ? "Increase" : "Decrease"}{" "}
                {inputVariableLabels[recommendation.variable] ||
                  recommendation.variable}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {recommendation.helps_count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Helps {recommendation.helps_count}
                </Badge>
              )}
              {recommendation.has_conflict && (
                <Badge variant="outline" className="text-xs text-yellow-600">
                  Has conflict
                </Badge>
              )}
            </div>
          </div>

          {recommendation.helps_gaps.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Helps with: {recommendation.helps_gaps.join(", ")}
            </p>
          )}

          <p className="text-sm bg-muted/50 rounded px-2 py-1">
            {recommendation.tick_description}
          </p>

          <div className="flex flex-wrap gap-2">
            {recommendation.effects.map((effect) => (
              <div
                key={effect.id}
                className={cn(
                  "flex items-center gap-1 text-xs px-2 py-1 rounded-full border",
                  effect.confidence === "high" &&
                    "border-green-200 bg-green-50 dark:bg-green-950/20",
                  effect.confidence === "medium" &&
                    "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20",
                  effect.confidence === "low" &&
                    "border-gray-200 bg-gray-50 dark:bg-gray-950/20"
                )}
              >
                <EffectIcon direction={effect.direction} />
                <span>
                  {outputVariableLabels[effect.output_variable] ||
                    effect.output_variable}
                </span>
              </div>
            ))}
          </div>

          {recommendation.source && (
            <p className="text-xs text-muted-foreground">
              Source: {recommendation.source}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {isDismissed ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUndoDismiss(recommendation.id)}
                disabled={isUndoing}
                className="text-xs"
              >
                <Undo2 className="h-3 w-3 mr-1" />
                Undo Dismiss
              </Button>
            ) : (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onTryClick}
                  className="text-xs"
                >
                  <Beaker className="h-3 w-3 mr-1" />
                  Try This
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(recommendation.id)}
                  disabled={isDismissing}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewDetails}
                  className="text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Details
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function RelevantMappingsPanel({
  recommendations,
  onDismiss,
  onUndoDismiss,
  onTryMapping,
  isDismissing,
  isUndoing,
  isTrying,
}: RelevantMappingsPanelProps) {
  const navigate = useNavigate()
  const [tryDialogOpen, setTryDialogOpen] = useState(false)
  const [selectedMapping, setSelectedMapping] =
    useState<RecommendationResponse | null>(null)

  const handleTryClick = (recommendation: RecommendationResponse) => {
    setSelectedMapping(recommendation)
    setTryDialogOpen(true)
  }

  const handleTryConfirm = async (notes?: string) => {
    if (selectedMapping) {
      await onTryMapping(selectedMapping.id, notes)
      setTryDialogOpen(false)
      setSelectedMapping(null)
    }
  }

  const handleViewDetails = (mappingId: string) => {
    navigate(`/effect-mappings?selected=${mappingId}`)
  }

  // Separate dismissed and active recommendations
  const activeRecommendations = recommendations.filter((r) => !r.is_dismissed)
  const dismissedRecommendations = recommendations.filter((r) => r.is_dismissed)

  if (recommendations.length === 0) {
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
            No relevant recommendations found. Make sure you have active effect
            mappings that address the gaps in your target profile.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium flex items-center gap-2">
        <Lightbulb className="h-5 w-5" />
        Recommendations ({activeRecommendations.length})
      </h3>

      {/* Active recommendations */}
      {activeRecommendations.length > 0 && (
        <div className="grid gap-4">
          {activeRecommendations.map((recommendation) => (
            <MappingCard
              key={recommendation.id}
              recommendation={recommendation}
              onDismiss={onDismiss}
              onUndoDismiss={onUndoDismiss}
              onTryClick={() => handleTryClick(recommendation)}
              onViewDetails={() => handleViewDetails(recommendation.id)}
              isDismissing={isDismissing}
              isUndoing={isUndoing}
            />
          ))}
        </div>
      )}

      {/* Dismissed recommendations */}
      {dismissedRecommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Dismissed ({dismissedRecommendations.length})
          </h4>
          <div className="grid gap-2">
            {dismissedRecommendations.map((recommendation) => (
              <MappingCard
                key={recommendation.id}
                recommendation={recommendation}
                onDismiss={onDismiss}
                onUndoDismiss={onUndoDismiss}
                onTryClick={() => handleTryClick(recommendation)}
                onViewDetails={() => handleViewDetails(recommendation.id)}
                isDismissing={isDismissing}
                isUndoing={isUndoing}
              />
            ))}
          </div>
        </div>
      )}

      {/* Try Mapping Dialog */}
      <TryMappingDialog
        open={tryDialogOpen}
        onOpenChange={setTryDialogOpen}
        mapping={selectedMapping}
        onConfirm={handleTryConfirm}
        isLoading={isTrying}
      />
    </div>
  )
}
