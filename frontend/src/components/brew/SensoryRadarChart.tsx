import { useId } from "react"

const ATTRIBUTES = [
  { key: "sweetness_intensity", label: "Sweetness" },
  { key: "brightness_intensity", label: "Brightness" },
  { key: "complexity_intensity", label: "Complexity" },
  { key: "aftertaste_intensity", label: "Aftertaste" },
  { key: "body_intensity", label: "Body" },
  { key: "aroma_intensity", label: "Aroma" },
] as const

export interface SensoryRadarChartProps {
  aroma_intensity?: number | null
  body_intensity?: number | null
  sweetness_intensity?: number | null
  brightness_intensity?: number | null
  complexity_intensity?: number | null
  aftertaste_intensity?: number | null
  size?: number
  className?: string
}

const VIEW_SIZE = 200
const CENTER = VIEW_SIZE / 2
const MAX_RADIUS = 70
const GRID_LEVELS = [2, 4, 6, 8, 10]
const LABEL_OFFSET = 22

function polarToCartesian(angle: number, radius: number) {
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  }
}

function getAngle(index: number) {
  return (Math.PI * 2 * index) / 6 - Math.PI / 2
}

function hexagonPoints(radius: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const { x, y } = polarToCartesian(getAngle(i), radius)
    return `${x},${y}`
  }).join(" ")
}

function hexagonPath(radius: number) {
  const pts = Array.from({ length: 6 }, (_, i) =>
    polarToCartesian(getAngle(i), radius)
  )
  return (
    `M ${pts[0].x},${pts[0].y}` +
    pts
      .slice(1)
      .map((p) => ` L ${p.x},${p.y}`)
      .join("") +
    " Z"
  )
}

export function SensoryRadarChart({
  size = 180,
  className,
  ...values
}: SensoryRadarChartProps) {
  const id = useId()
  const hasData = ATTRIBUTES.some((a) => values[a.key] != null)
  if (!hasData) return null

  const dataPoints = ATTRIBUTES.map((attr, i) => {
    const value = values[attr.key] ?? 0
    const radius = (value / 10) * MAX_RADIUS
    return polarToCartesian(getAngle(i), radius)
  })

  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ")

  const ariaLabel = ATTRIBUTES.map(
    (a) => `${a.label.toLowerCase()} ${values[a.key] ?? 0}`
  ).join(", ")

  const gradientId = `${id}-gradient`
  const glowId = `${id}-glow`

  return (
    <svg
      role="img"
      aria-label={`Sensory profile: ${ariaLabel}`}
      viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
      width={size}
      height={size}
      overflow="visible"
      className={className}
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.08" />
        </radialGradient>
        <filter id={glowId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>

      {/* Background hexagon fill */}
      <path
        d={hexagonPath(MAX_RADIUS)}
        fill="var(--color-muted)"
        fillOpacity="0.3"
        stroke="none"
      />

      {/* Concentric gridlines */}
      {GRID_LEVELS.map((level) => {
        const isOuter = level === 10
        const isMid = level === 6
        return (
          <polygon
            key={level}
            points={hexagonPoints((level / 10) * MAX_RADIUS)}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={isOuter ? "1" : "0.5"}
            strokeOpacity={isOuter ? 1 : isMid ? 0.6 : 0.35}
            strokeDasharray={isMid ? "3 2" : undefined}
          />
        )
      })}

      {/* Axis lines from center to each vertex */}
      {ATTRIBUTES.map((_, i) => {
        const { x, y } = polarToCartesian(getAngle(i), MAX_RADIUS)
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke="var(--color-border)"
            strokeWidth="0.5"
            strokeOpacity="0.4"
          />
        )
      })}

      {/* Data polygon glow */}
      <polygon
        points={dataPolygon}
        fill={`url(#${gradientId})`}
        stroke="var(--color-primary)"
        strokeWidth="1.5"
        filter={`url(#${glowId})`}
      />

      {/* Data polygon */}
      <polygon
        points={dataPolygon}
        fill={`url(#${gradientId})`}
        stroke="var(--color-primary)"
        strokeWidth="1.5"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3"
          fill="var(--color-primary)"
          stroke="var(--color-card)"
          strokeWidth="1.5"
        />
      ))}

      {/* Vertex labels */}
      {ATTRIBUTES.map((attr, i) => {
        const { x, y } = polarToCartesian(
          getAngle(i),
          MAX_RADIUS + LABEL_OFFSET
        )
        const value = values[attr.key]
        return (
          <text
            key={attr.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--color-muted-foreground)"
            fontSize="13"
          >
            {attr.label}
            {value != null && (
              <tspan
                x={x}
                dy="15"
                fill="var(--color-foreground)"
                fontSize="15"
                fontWeight="600"
              >
                {value}
              </tspan>
            )}
          </text>
        )
      })}
    </svg>
  )
}
