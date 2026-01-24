import { useEffect, useRef } from "react"
import { ExternalLink } from "lucide-react"
import { Link } from "react-router-dom"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAnalyzeDetail } from "../../hooks/use-analyze-experiments"
import { getCorrelationColor } from "./correlation-cell"
import { cn } from "@/lib/utils"

interface ScatterModalProps {
  experimentIds: string[]
  inputVariable: string | null
  outcomeVariable: string | null
  onClose: () => void
}

const formatVarName = (name: string): string => {
  const mapping: Record<string, string> = {
    coffee_weight: "Coffee Weight",
    water_weight: "Water Weight",
    water_temperature: "Water Temperature",
    bloom_time: "Bloom Time",
    total_brew_time: "Total Brew Time",
    days_off_roast: "Days Off Roast",
    overall_score: "Overall Score",
    acidity_intensity: "Acidity",
    sweetness_intensity: "Sweetness",
    bitterness_intensity: "Bitterness",
    body_weight: "Body",
    aroma_intensity: "Aroma",
    tds: "TDS",
    extraction_yield: "Extraction Yield",
  }
  return mapping[name] || name
}

export function ScatterModal({
  experimentIds,
  inputVariable,
  outcomeVariable,
  onClose,
}: ScatterModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { loading, error, data } = useAnalyzeDetail(
    experimentIds,
    inputVariable,
    outcomeVariable
  )

  const isOpen = inputVariable !== null && outcomeVariable !== null

  // Draw scatter plot
  useEffect(() => {
    if (!canvasRef.current || !data || data.scatter_data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const padding = 40

    // Clear canvas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)

    const points = data.scatter_data

    // Find min/max
    const xMin = Math.min(...points.map((p) => p.x))
    const xMax = Math.max(...points.map((p) => p.x))
    const yMin = Math.min(...points.map((p) => p.y))
    const yMax = Math.max(...points.map((p) => p.y))

    const xRange = xMax - xMin || 1
    const yRange = yMax - yMin || 1

    // Scale functions
    const scaleX = (x: number) =>
      padding + ((x - xMin) / xRange) * (width - 2 * padding)
    const scaleY = (y: number) =>
      height - padding - ((y - yMin) / yRange) * (height - 2 * padding)

    // Draw axes
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // Draw grid lines
    ctx.strokeStyle = "#f3f4f6"
    for (let i = 0; i <= 4; i++) {
      const x = padding + (i / 4) * (width - 2 * padding)
      const y = padding + (i / 4) * (height - 2 * padding)

      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw trend line if correlation is significant
    if (data.correlation.p < 0.05 && points.length >= 3) {
      // Simple linear regression
      const n = points.length
      const sumX = points.reduce((a, p) => a + p.x, 0)
      const sumY = points.reduce((a, p) => a + p.y, 0)
      const sumXY = points.reduce((a, p) => a + p.x * p.y, 0)
      const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0)

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n

      const x1 = xMin
      const y1 = slope * x1 + intercept
      const x2 = xMax
      const y2 = slope * x2 + intercept

      ctx.strokeStyle = data.correlation.r > 0 ? "#22c55e" : "#ef4444"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(scaleX(x1), scaleY(y1))
      ctx.lineTo(scaleX(x2), scaleY(y2))
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw points
    const pointColor = data.correlation.r > 0 ? "#22c55e" : "#ef4444"
    points.forEach((point) => {
      ctx.beginPath()
      ctx.arc(scaleX(point.x), scaleY(point.y), 6, 0, Math.PI * 2)
      ctx.fillStyle = pointColor
      ctx.fill()
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // Draw axis labels
    ctx.fillStyle = "#6b7280"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(
      formatVarName(data.input_variable),
      width / 2,
      height - 8
    )

    ctx.save()
    ctx.translate(12, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(formatVarName(data.outcome_variable), 0, 0)
    ctx.restore()
  }, [data])

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {inputVariable && outcomeVariable && (
              <>
                {formatVarName(inputVariable)} vs {formatVarName(outcomeVariable)}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-destructive">{error}</div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Correlation stats */}
            <div className="flex items-center gap-4">
              <Badge
                className={cn("text-sm", getCorrelationColor(data.correlation.r))}
              >
                r = {data.correlation.r.toFixed(3)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                n = {data.correlation.n}
              </span>
              <span className="text-sm text-muted-foreground">
                p = {data.correlation.p.toFixed(3)}
              </span>
              <span className="text-sm font-medium">
                {data.correlation.interpretation}
              </span>
            </div>

            {/* Insight */}
            {data.insight && (
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                {data.insight}
              </p>
            )}

            {/* Scatter plot */}
            <div className="border rounded-lg p-4 bg-white">
              <canvas
                ref={canvasRef}
                width={500}
                height={300}
                className="w-full max-w-[500px] mx-auto"
              />
            </div>

            {/* Data table */}
            <div className="rounded-lg border max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Coffee</TableHead>
                    <TableHead className="text-right">
                      {formatVarName(data.input_variable)}
                    </TableHead>
                    <TableHead className="text-right">
                      {formatVarName(data.outcome_variable)}
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.experiments.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell>{exp.brew_date}</TableCell>
                      <TableCell>{exp.coffee_name || "-"}</TableCell>
                      <TableCell className="text-right font-mono">
                        {exp.input_value.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {exp.outcome_value.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Link to={`/experiments/${exp.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
