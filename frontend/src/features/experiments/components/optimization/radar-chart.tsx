import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { Experiment } from "@/lib/api"

interface SensoryRadarChartProps {
  experiment: Experiment
}

interface ChartDataPoint {
  variable: string
  current: number | null
  target: number | null
}

export function SensoryRadarChart({ experiment }: SensoryRadarChartProps) {
  const data: ChartDataPoint[] = [
    {
      variable: "Acidity",
      current: experiment.acidity_intensity ?? null,
      target: experiment.target_acidity ?? null,
    },
    {
      variable: "Sweetness",
      current: experiment.sweetness_intensity ?? null,
      target: experiment.target_sweetness ?? null,
    },
    {
      variable: "Bitterness",
      current: experiment.bitterness_intensity ?? null,
      target: experiment.target_bitterness ?? null,
    },
    {
      variable: "Body",
      current: experiment.body_weight ?? null,
      target: experiment.target_body ?? null,
    },
    {
      variable: "Aroma",
      current: experiment.aroma_intensity ?? null,
      target: experiment.target_aroma ?? null,
    },
  ]

  const hasCurrentData = data.some((d) => d.current !== null)
  const hasTargetData = data.some((d) => d.target !== null)

  if (!hasCurrentData && !hasTargetData) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No sensory data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis
          dataKey="variable"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 10]}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          tickCount={6}
        />
        {hasCurrentData && (
          <Radar
            name="Current"
            dataKey="current"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        )}
        {hasTargetData && (
          <Radar
            name="Target"
            dataKey="target"
            stroke="hsl(var(--destructive))"
            fill="none"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        )}
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  )
}
