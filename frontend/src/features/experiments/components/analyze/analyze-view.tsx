import { useState } from "react"
import { X, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { CorrelationMatrix } from "./correlation-matrix"
import { InsightsPanel } from "./insights-panel"
import { WarningsPanel } from "./warnings-panel"
import { ScatterModal } from "./scatter-modal"
import { useAnalyzeExperiments } from "../../hooks/use-analyze-experiments"

interface AnalyzeViewProps {
  experimentIds: string[]
  onClose: () => void
}

export function AnalyzeView({ experimentIds, onClose }: AnalyzeViewProps) {
  const [minSamples, setMinSamples] = useState(5)
  const [selectedCell, setSelectedCell] = useState<{
    input: string
    outcome: string
  } | null>(null)

  const {
    loading,
    error,
    correlations,
    inputs,
    outcomes,
    experimentCount,
    insights,
    warnings,
  } = useAnalyzeExperiments(experimentIds, minSamples)

  const handleCellClick = (input: string, outcome: string) => {
    const correlation = correlations[input]?.[outcome]
    if (correlation) {
      setSelectedCell({ input, outcome })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-3 text-muted-foreground">
              Analyzing {experimentIds.length} experiments...
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Correlation Analysis
            <span className="text-sm font-normal text-muted-foreground">
              ({experimentCount} experiments)
            </span>
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="min-samples" className="text-sm whitespace-nowrap">
                Min samples:
              </Label>
              <Select
                value={String(minSamples)}
                onValueChange={(v) => setMinSamples(Number(v))}
              >
                <SelectTrigger className="w-20" id="min-samples">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 10, 15, 20, 30, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <WarningsPanel warnings={warnings} />

          {/* Color legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-muted-foreground">Correlation strength:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-600 rounded" />
              <span>Strong +</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-400 rounded" />
              <span>Moderate +</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-200 rounded" />
              <span>Weak +</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-100 rounded border" />
              <span>None</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-200 rounded" />
              <span>Weak -</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-400 rounded" />
              <span>Moderate -</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-600 rounded" />
              <span>Strong -</span>
            </div>
          </div>

          <CorrelationMatrix
            correlations={correlations}
            inputs={inputs}
            outcomes={outcomes}
            onCellClick={handleCellClick}
          />
        </CardContent>
      </Card>

      <InsightsPanel insights={insights} />

      <ScatterModal
        experimentIds={experimentIds}
        inputVariable={selectedCell?.input ?? null}
        outcomeVariable={selectedCell?.outcome ?? null}
        onClose={() => setSelectedCell(null)}
      />
    </div>
  )
}
