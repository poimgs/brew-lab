import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SensoryRadarChart } from "./radar-chart"
import { GapSummary } from "./gap-summary"
import { RelevantMappingsPanel } from "./relevant-mappings-panel"
import { api, type OptimizationResponse, type Experiment } from "@/lib/api"
import { Loader2 } from "lucide-react"

interface OptimizationTabProps {
  experimentId: string
  experiment: Experiment
}

export function OptimizationTab({ experimentId, experiment }: OptimizationTabProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<OptimizationResponse | null>(null)

  useEffect(() => {
    fetchOptimization()
  }, [experimentId])

  async function fetchOptimization() {
    setLoading(true)
    setError(null)
    try {
      const response = await api.getExperimentOptimization(experimentId)
      setData(response)
    } catch (err) {
      console.error("Failed to fetch optimization data:", err)
      setError(err instanceof Error ? err.message : "Failed to load optimization data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
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
          <SensoryRadarChart experiment={data?.experiment ?? experiment} />
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

      {/* Relevant Mappings */}
      {data && (
        <RelevantMappingsPanel
          mappings={data.relevant_mappings}
          gaps={data.experiment.gaps}
        />
      )}
    </div>
  )
}
