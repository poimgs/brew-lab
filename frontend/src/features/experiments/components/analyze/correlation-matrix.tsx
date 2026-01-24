import { CorrelationCell } from "./correlation-cell"
import type { CorrelationResult } from "@/lib/api"

interface CorrelationMatrixProps {
  correlations: Record<string, Record<string, CorrelationResult>>
  inputs: string[]
  outcomes: string[]
  onCellClick: (input: string, outcome: string) => void
}

const formatVarName = (name: string): string => {
  const mapping: Record<string, string> = {
    coffee_weight: "Coffee Wt",
    water_weight: "Water Wt",
    water_temperature: "Temp",
    bloom_time: "Bloom",
    total_brew_time: "Brew Time",
    days_off_roast: "Age",
    overall_score: "Score",
    acidity_intensity: "Acidity",
    sweetness_intensity: "Sweet",
    bitterness_intensity: "Bitter",
    body_weight: "Body",
    aroma_intensity: "Aroma",
    tds: "TDS",
    extraction_yield: "EY",
  }
  return mapping[name] || name
}

export function CorrelationMatrix({
  correlations,
  inputs,
  outcomes,
  onCellClick,
}: CorrelationMatrixProps) {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-sm font-medium text-muted-foreground">
              Input / Outcome
            </th>
            {outcomes.map((outcome) => (
              <th
                key={outcome}
                className="p-2 text-center text-xs font-medium text-muted-foreground"
              >
                <div className="w-16 truncate" title={outcome}>
                  {formatVarName(outcome)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inputs.map((input) => (
            <tr key={input}>
              <td className="p-2 text-sm font-medium whitespace-nowrap">
                {formatVarName(input)}
              </td>
              {outcomes.map((outcome) => (
                <td key={outcome} className="p-1">
                  <CorrelationCell
                    correlation={correlations[input]?.[outcome]}
                    onClick={() => onCellClick(input, outcome)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
