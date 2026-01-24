import { FormSection } from "@/components/ui/form-section"
import { IntensitySlider } from "@/components/ui/intensity-slider"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { ExperimentFormData } from "@/lib/api"

interface TargetProfileSectionProps {
  data: Partial<ExperimentFormData>
  onChange: (updates: Partial<ExperimentFormData>) => void
}

export function TargetProfileSection({ data, onChange }: TargetProfileSectionProps) {
  const hasAnyTarget =
    data.target_acidity !== undefined ||
    data.target_sweetness !== undefined ||
    data.target_bitterness !== undefined ||
    data.target_body !== undefined ||
    data.target_aroma !== undefined

  const handleClearAll = () => {
    onChange({
      target_acidity: undefined,
      target_sweetness: undefined,
      target_bitterness: undefined,
      target_body: undefined,
      target_aroma: undefined,
    })
  }

  return (
    <FormSection
      title="Target Profile"
      description="Set your desired sensory scores for optimization recommendations"
    >
      <div className="space-y-6">
        {hasAnyTarget && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 h-4 w-4" />
              Clear All Targets
            </Button>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Label>Target Acidity</Label>
            <IntensitySlider
              value={data.target_acidity}
              onChange={(value) => onChange({ target_acidity: value })}
              lowLabel="Low"
              highLabel="High"
            />
          </div>

          <div className="space-y-3">
            <Label>Target Sweetness</Label>
            <IntensitySlider
              value={data.target_sweetness}
              onChange={(value) => onChange({ target_sweetness: value })}
              lowLabel="Low"
              highLabel="High"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Label>Target Bitterness</Label>
            <IntensitySlider
              value={data.target_bitterness}
              onChange={(value) => onChange({ target_bitterness: value })}
              lowLabel="Low"
              highLabel="High"
            />
          </div>

          <div className="space-y-3">
            <Label>Target Body</Label>
            <IntensitySlider
              value={data.target_body}
              onChange={(value) => onChange({ target_body: value })}
              lowLabel="Light"
              highLabel="Heavy"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Label>Target Aroma</Label>
            <IntensitySlider
              value={data.target_aroma}
              onChange={(value) => onChange({ target_aroma: value })}
              lowLabel="Faint"
              highLabel="Intense"
            />
          </div>
        </div>
      </div>
    </FormSection>
  )
}
