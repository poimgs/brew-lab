import { FormSection } from "@/components/ui/form-section"
import { IntensitySlider } from "@/components/ui/intensity-slider"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ExperimentFormData } from "@/lib/api"

interface SensorySectionProps {
  data: Partial<ExperimentFormData>
  onChange: (updates: Partial<ExperimentFormData>) => void
}

export function SensorySection({ data, onChange }: SensorySectionProps) {
  return (
    <FormSection
      title="Sensory Evaluation"
      description="Rate intensity and add tasting notes"
    >
      <div className="space-y-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Label>Aroma Intensity</Label>
            <IntensitySlider
              value={data.aroma_intensity}
              onChange={(value) => onChange({ aroma_intensity: value })}
              lowLabel="Faint"
              highLabel="Intense"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aroma_notes">Aroma Notes</Label>
            <Textarea
              id="aroma_notes"
              value={data.aroma_notes ?? ""}
              onChange={(e) =>
                onChange({ aroma_notes: e.target.value || undefined })
              }
              placeholder="Describe the aroma: floral, fruity, chocolatey..."
              rows={2}
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Label>Acidity Intensity</Label>
            <IntensitySlider
              value={data.acidity_intensity}
              onChange={(value) => onChange({ acidity_intensity: value })}
              lowLabel="Flat"
              highLabel="Bright"
            />
          </div>

          <div className="space-y-3">
            <Label>Sweetness Intensity</Label>
            <IntensitySlider
              value={data.sweetness_intensity}
              onChange={(value) => onChange({ sweetness_intensity: value })}
              lowLabel="Minimal"
              highLabel="Very Sweet"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Label>Bitterness Intensity</Label>
            <IntensitySlider
              value={data.bitterness_intensity}
              onChange={(value) => onChange({ bitterness_intensity: value })}
              lowLabel="None"
              highLabel="Harsh"
            />
          </div>

          <div className="space-y-3">
            <Label>Body Weight</Label>
            <IntensitySlider
              value={data.body_weight}
              onChange={(value) => onChange({ body_weight: value })}
              lowLabel="Light"
              highLabel="Heavy"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="flavor_notes">Flavor Notes</Label>
          <Textarea
            id="flavor_notes"
            value={data.flavor_notes ?? ""}
            onChange={(e) =>
              onChange({ flavor_notes: e.target.value || undefined })
            }
            placeholder="Describe the flavors: citrus, berry, caramel, nutty..."
            rows={3}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Label>Aftertaste Duration</Label>
            <IntensitySlider
              value={data.aftertaste_duration}
              onChange={(value) => onChange({ aftertaste_duration: value })}
              lowLabel="Short"
              highLabel="Lingering"
            />
          </div>

          <div className="space-y-3">
            <Label>Aftertaste Intensity</Label>
            <IntensitySlider
              value={data.aftertaste_intensity}
              onChange={(value) => onChange({ aftertaste_intensity: value })}
              lowLabel="Faint"
              highLabel="Strong"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aftertaste_notes">Aftertaste Notes</Label>
          <Textarea
            id="aftertaste_notes"
            value={data.aftertaste_notes ?? ""}
            onChange={(e) =>
              onChange({ aftertaste_notes: e.target.value || undefined })
            }
            placeholder="Describe the aftertaste: clean, dry, pleasant..."
            rows={2}
          />
        </div>
      </div>
    </FormSection>
  )
}
