import { useState } from "react"
import { X, Filter, FilterX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ComparisonTable } from "./comparison-table"
import { useCompareExperiments } from "../../hooks/use-compare-experiments"

interface ComparisonViewProps {
  experimentIds: string[]
  onClose: () => void
}

export function ComparisonView({ experimentIds, onClose }: ComparisonViewProps) {
  const [showOnlyDifferent, setShowOnlyDifferent] = useState(false)
  const { loading, error, experiments, deltas } =
    useCompareExperiments(experimentIds)

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-3 text-muted-foreground">
              Loading comparison...
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl">
          Comparing {experiments.length} Experiments
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant={showOnlyDifferent ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowOnlyDifferent(!showOnlyDifferent)}
          >
            {showOnlyDifferent ? (
              <>
                <FilterX className="h-4 w-4 mr-2" />
                Show All
              </>
            ) : (
              <>
                <Filter className="h-4 w-4 mr-2" />
                Show Only Different
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ComparisonTable
          experiments={experiments}
          deltas={deltas}
          showOnlyDifferent={showOnlyDifferent}
        />
      </CardContent>
    </Card>
  )
}
