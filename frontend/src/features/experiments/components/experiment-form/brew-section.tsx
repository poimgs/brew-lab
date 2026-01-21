import { FormSection } from "@/components/ui/form-section"
import { NumericInput } from "@/components/ui/numeric-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ExperimentFormData } from "@/lib/api"

interface BrewSectionProps {
  data: Partial<ExperimentFormData>
  onChange: (updates: Partial<ExperimentFormData>) => void
}

export function BrewSection({ data, onChange }: BrewSectionProps) {
  return (
    <FormSection
      title="Brew Process"
      description="Bloom, pours, timing, and technique"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="bloom_water">Bloom Water</Label>
            <NumericInput
              id="bloom_water"
              unit="g"
              value={data.bloom_water}
              onChange={(value) => onChange({ bloom_water: value })}
              placeholder="45"
              step="1"
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bloom_time">Bloom Time</Label>
            <NumericInput
              id="bloom_time"
              unit="s"
              value={data.bloom_time}
              onChange={(value) => onChange({ bloom_time: value })}
              placeholder="45"
              step="1"
              min={0}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="pour_1">Pour 1</Label>
            <Input
              id="pour_1"
              value={data.pour_1 ?? ""}
              onChange={(e) => onChange({ pour_1: e.target.value || undefined })}
              placeholder="e.g., 100g @ 0:45"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pour_2">Pour 2</Label>
            <Input
              id="pour_2"
              value={data.pour_2 ?? ""}
              onChange={(e) => onChange({ pour_2: e.target.value || undefined })}
              placeholder="e.g., 150g @ 1:15"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pour_3">Pour 3</Label>
            <Input
              id="pour_3"
              value={data.pour_3 ?? ""}
              onChange={(e) => onChange({ pour_3: e.target.value || undefined })}
              placeholder="e.g., 250g @ 1:45"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="total_brew_time">Total Brew Time</Label>
            <NumericInput
              id="total_brew_time"
              unit="s"
              value={data.total_brew_time}
              onChange={(value) => onChange({ total_brew_time: value })}
              placeholder="180"
              step="1"
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="drawdown_time">Drawdown Time</Label>
            <NumericInput
              id="drawdown_time"
              unit="s"
              value={data.drawdown_time}
              onChange={(value) => onChange({ drawdown_time: value })}
              placeholder="60"
              step="1"
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="final_weight">Final Weight</Label>
            <NumericInput
              id="final_weight"
              unit="g"
              value={data.final_weight}
              onChange={(value) => onChange({ final_weight: value })}
              placeholder="235"
              step="1"
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tds">TDS</Label>
            <NumericInput
              id="tds"
              unit="%"
              value={data.tds}
              onChange={(value) => onChange({ tds: value })}
              placeholder="1.35"
              step="0.01"
              min={0}
              max={5}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="serving_temperature">Serving Temperature</Label>
            <NumericInput
              id="serving_temperature"
              unit="°C"
              value={data.serving_temperature}
              onChange={(value) => onChange({ serving_temperature: value })}
              placeholder="65"
              step="1"
              min={0}
              max={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="water_bypass">Water Bypass</Label>
            <NumericInput
              id="water_bypass"
              unit="g"
              value={data.water_bypass}
              onChange={(value) => onChange({ water_bypass: value })}
              placeholder="0"
              step="1"
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mineral_additions">Mineral Additions</Label>
            <Input
              id="mineral_additions"
              value={data.mineral_additions ?? ""}
              onChange={(e) =>
                onChange({ mineral_additions: e.target.value || undefined })
              }
              placeholder="e.g., Third Wave Water"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="technique_notes">Technique Notes</Label>
          <Textarea
            id="technique_notes"
            value={data.technique_notes ?? ""}
            onChange={(e) =>
              onChange({ technique_notes: e.target.value || undefined })
            }
            placeholder="Describe your pour technique, agitation, etc."
            rows={3}
          />
        </div>
      </div>
    </FormSection>
  )
}
