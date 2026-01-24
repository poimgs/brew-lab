import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DeltaIndicator } from "./delta-indicator"
import type { Experiment, DeltaInfo } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ComparisonTableProps {
  experiments: Experiment[]
  deltas: Record<string, DeltaInfo>
  showOnlyDifferent?: boolean
}

interface RowConfig {
  key: string
  label: string
  getValue: (exp: Experiment) => string | number | null | undefined
  format?: (value: unknown) => string
}

const rows: RowConfig[] = [
  {
    key: "brew_date",
    label: "Brew Date",
    getValue: (exp) => exp.brew_date,
    format: (v) => {
      if (!v) return "-"
      try {
        return format(new Date(v as string), "MMM d, yyyy")
      } catch {
        return v as string
      }
    },
  },
  {
    key: "coffee",
    label: "Coffee",
    getValue: (exp) =>
      exp.coffee ? `${exp.coffee.roaster} - ${exp.coffee.name}` : null,
  },
  {
    key: "days_off_roast",
    label: "Days Off Roast",
    getValue: (exp) => exp.days_off_roast,
  },
  {
    key: "coffee_weight",
    label: "Coffee Weight (g)",
    getValue: (exp) => exp.coffee_weight,
    format: (v) => (v ? `${(v as number).toFixed(1)}g` : "-"),
  },
  {
    key: "water_weight",
    label: "Water Weight (g)",
    getValue: (exp) => exp.water_weight,
    format: (v) => (v ? `${(v as number).toFixed(0)}g` : "-"),
  },
  {
    key: "calculated_ratio",
    label: "Ratio",
    getValue: (exp) => exp.calculated_ratio,
    format: (v) => (v ? `1:${(v as number).toFixed(1)}` : "-"),
  },
  {
    key: "water_temperature",
    label: "Water Temp (\u00B0C)",
    getValue: (exp) => exp.water_temperature,
    format: (v) => (v ? `${(v as number).toFixed(0)}\u00B0C` : "-"),
  },
  {
    key: "grind_size",
    label: "Grind Size",
    getValue: (exp) => exp.grind_size,
  },
  {
    key: "bloom_time",
    label: "Bloom Time (s)",
    getValue: (exp) => exp.bloom_time,
    format: (v) => (v ? `${v}s` : "-"),
  },
  {
    key: "total_brew_time",
    label: "Total Brew Time",
    getValue: (exp) => exp.total_brew_time,
    format: (v) => {
      if (!v) return "-"
      const mins = Math.floor((v as number) / 60)
      const secs = (v as number) % 60
      return `${mins}:${secs.toString().padStart(2, "0")}`
    },
  },
  {
    key: "tds",
    label: "TDS (%)",
    getValue: (exp) => exp.tds,
    format: (v) => (v ? `${(v as number).toFixed(2)}%` : "-"),
  },
  {
    key: "extraction_yield",
    label: "Extraction Yield (%)",
    getValue: (exp) => exp.extraction_yield,
    format: (v) => (v ? `${(v as number).toFixed(1)}%` : "-"),
  },
  {
    key: "overall_score",
    label: "Overall Score",
    getValue: (exp) => exp.overall_score,
    format: (v) => (v ? `${v}/10` : "-"),
  },
  {
    key: "acidity_intensity",
    label: "Acidity",
    getValue: (exp) => exp.acidity_intensity,
    format: (v) => (v ? `${v}/10` : "-"),
  },
  {
    key: "sweetness_intensity",
    label: "Sweetness",
    getValue: (exp) => exp.sweetness_intensity,
    format: (v) => (v ? `${v}/10` : "-"),
  },
  {
    key: "bitterness_intensity",
    label: "Bitterness",
    getValue: (exp) => exp.bitterness_intensity,
    format: (v) => (v ? `${v}/10` : "-"),
  },
  {
    key: "body_weight",
    label: "Body",
    getValue: (exp) => exp.body_weight,
    format: (v) => (v ? `${v}/10` : "-"),
  },
  {
    key: "aroma_intensity",
    label: "Aroma",
    getValue: (exp) => exp.aroma_intensity,
    format: (v) => (v ? `${v}/10` : "-"),
  },
]

export function ComparisonTable({
  experiments,
  deltas,
  showOnlyDifferent = false,
}: ComparisonTableProps) {
  const filteredRows = showOnlyDifferent
    ? rows.filter((row) => {
        const delta = deltas[row.key]
        return delta && delta.trend !== "stable"
      })
    : rows

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px] sticky left-0 bg-background z-10">
              Variable
            </TableHead>
            {experiments.map((exp, idx) => (
              <TableHead key={exp.id} className="min-w-[140px]">
                <div className="font-medium">Experiment {idx + 1}</div>
                <div className="text-xs font-normal text-muted-foreground">
                  {format(new Date(exp.brew_date), "MMM d")}
                </div>
              </TableHead>
            ))}
            <TableHead className="min-w-[160px]">Delta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.map((row) => {
            const delta = deltas[row.key]
            const hasVariation = delta && delta.trend !== "stable"

            return (
              <TableRow
                key={row.key}
                className={cn(hasVariation && "bg-muted/30")}
              >
                <TableCell className="font-medium sticky left-0 bg-background z-10">
                  {row.label}
                </TableCell>
                {experiments.map((exp) => {
                  const value = row.getValue(exp)
                  const formatted = row.format
                    ? row.format(value)
                    : value ?? "-"

                  return (
                    <TableCell key={exp.id}>
                      {formatted}
                    </TableCell>
                  )
                })}
                <TableCell>
                  {delta ? (
                    <DeltaIndicator
                      trend={delta.trend}
                      min={delta.min}
                      max={delta.max}
                    />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
