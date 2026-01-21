import { FormSection } from "@/components/ui/form-section"
import { NumericInput } from "@/components/ui/numeric-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ExperimentFormData } from "@/lib/api"

interface PreBrewSectionProps {
  data: Partial<ExperimentFormData>
  onChange: (updates: Partial<ExperimentFormData>) => void
  calculatedRatio?: number
}

const FILTER_TYPES = [
  "Paper (bleached)",
  "Paper (unbleached)",
  "Metal",
  "Cloth",
  "Other",
]

export function PreBrewSection({
  data,
  onChange,
  calculatedRatio,
}: PreBrewSectionProps) {
  return (
    <FormSection
      title="Pre-Brew Parameters"
      description="Dose, water, grind, and temperature settings"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="coffee_weight">Coffee Weight</Label>
          <NumericInput
            id="coffee_weight"
            unit="g"
            value={data.coffee_weight}
            onChange={(value) => onChange({ coffee_weight: value })}
            placeholder="15"
            step="0.1"
            min={0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="water_weight">Water Weight</Label>
          <NumericInput
            id="water_weight"
            unit="g"
            value={data.water_weight}
            onChange={(value) => onChange({ water_weight: value })}
            placeholder="250"
            step="1"
            min={0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ratio">Ratio</Label>
          <NumericInput
            id="ratio"
            unit=":1"
            value={
              calculatedRatio !== undefined
                ? calculatedRatio.toFixed(1)
                : undefined
            }
            calculated={calculatedRatio !== undefined}
            calculatedTooltip="Calculated from coffee and water weight"
            disabled
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="grind_size">Grind Size</Label>
          <Input
            id="grind_size"
            value={data.grind_size ?? ""}
            onChange={(e) => onChange({ grind_size: e.target.value || undefined })}
            placeholder="e.g., 24 clicks, Medium-fine"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="water_temperature">Water Temperature</Label>
          <NumericInput
            id="water_temperature"
            unit="°C"
            value={data.water_temperature}
            onChange={(value) => onChange({ water_temperature: value })}
            placeholder="93"
            step="1"
            min={0}
            max={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter_type">Filter Type</Label>
          <Select
            value={data.filter_type ?? ""}
            onValueChange={(value) =>
              onChange({ filter_type: value || undefined })
            }
          >
            <SelectTrigger id="filter_type">
              <SelectValue placeholder="Select filter" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </FormSection>
  )
}
