import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SensoryRadarChart } from "./radar-chart"
import { GapSummary } from "./gap-summary"
import { RelevantMappingsPanel } from "./relevant-mappings-panel"
import type { Experiment } from "@/lib/api"
import { Loader2 } from "lucide-react"
import { useRecommendations, useRecommendationMutations } from "../../hooks"

interface OptimizationTabProps {
  experimentId: string
  experiment: Experiment
}

export function OptimizationTab({ experimentId, experiment }: OptimizationTabProps) {
  const navigate = useNavigate()
  const {
    recommendations,
    isLoading,
    error,
    refetch,
  } = useRecommendations(experimentId)

  const {
    dismissMapping,
    undoDismissMapping,
    tryMapping,
    isDismissing,
    isUndoing,
    isTrying,
  } = useRecommendationMutations()

  const handleDismiss = async (mappingId: string) => {
    await dismissMapping(experimentId, mappingId)
    await refetch()
  }

  const handleUndoDismiss = async (mappingId: string) => {
    await undoDismissMapping(experimentId, mappingId)
    await refetch()
  }

  const handleTryMapping = async (mappingId: string, notes?: string) => {
    const newExperiment = await tryMapping(experimentId, {
      mapping_id: mappingId,
      notes,
    })
    // Navigate to the new experiment
    navigate(`/experiments/${newExperiment.id}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  const hasTargets =
    experiment.target_acidity !== undefined ||
    experiment.target_sweetness !== undefined ||
    experiment.target_bitterness !== undefined ||
    experiment.target_body !== undefined ||
    experiment.target_aroma !== undefined

  if (!hasTargets) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No target profile set. Edit this experiment to add target sensory scores
          and receive optimization recommendations.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current vs Target Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <SensoryRadarChart experiment={experiment} />
        </CardContent>
      </Card>

      {/* Gap Summary */}
      {experiment.gaps && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gap Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <GapSummary gaps={experiment.gaps} />
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <RelevantMappingsPanel
        recommendations={recommendations}
        onDismiss={handleDismiss}
        onUndoDismiss={handleUndoDismiss}
        onTryMapping={handleTryMapping}
        isDismissing={isDismissing}
        isUndoing={isUndoing}
        isTrying={isTrying}
      />
    </div>
  )
}
