import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { IntensitySlider } from "@/components/ui/intensity-slider"
import { Input } from "@/components/ui/input"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CoffeeSelect } from "./coffee-select"
import { PreBrewSection } from "./pre-brew-section"
import { BrewSection } from "./brew-section"
import { SensorySection } from "./sensory-section"
import { IssueTagsSection } from "./issue-tags-section"
import { TargetProfileSection } from "./target-profile-section"
import { api, type ExperimentFormData, type Experiment } from "@/lib/api"

interface ExperimentFormProps {
  experiment?: Experiment
  onSubmit: (data: ExperimentFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

const DEFAULT_FORM_DATA: ExperimentFormData = {
  overall_notes: "",
  tag_ids: [],
}

export function ExperimentForm({
  experiment,
  onSubmit,
  onCancel,
  isSubmitting,
}: ExperimentFormProps) {
  const [formData, setFormData] = useState<ExperimentFormData>(DEFAULT_FORM_DATA)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadingDefaults, setLoadingDefaults] = useState(!experiment)

  // Load defaults for new experiments
  useEffect(() => {
    if (experiment) {
      // Edit mode: populate from existing experiment
      setFormData({
        coffee_id: experiment.coffee_id,
        brew_date: experiment.brew_date,
        overall_notes: experiment.overall_notes,
        overall_score: experiment.overall_score,
        coffee_weight: experiment.coffee_weight,
        water_weight: experiment.water_weight,
        grind_size: experiment.grind_size,
        water_temperature: experiment.water_temperature,
        filter_paper_id: experiment.filter_paper_id,
        bloom_water: experiment.bloom_water,
        bloom_time: experiment.bloom_time,
        pour_1: experiment.pour_1,
        pour_2: experiment.pour_2,
        pour_3: experiment.pour_3,
        total_brew_time: experiment.total_brew_time,
        drawdown_time: experiment.drawdown_time,
        technique_notes: experiment.technique_notes,
        serving_temperature: experiment.serving_temperature,
        water_bypass: experiment.water_bypass,
        mineral_additions: experiment.mineral_additions,
        final_weight: experiment.final_weight,
        tds: experiment.tds,
        aroma_intensity: experiment.aroma_intensity,
        acidity_intensity: experiment.acidity_intensity,
        sweetness_intensity: experiment.sweetness_intensity,
        bitterness_intensity: experiment.bitterness_intensity,
        body_weight: experiment.body_weight,
        aftertaste_duration: experiment.aftertaste_duration,
        aftertaste_intensity: experiment.aftertaste_intensity,
        aroma_notes: experiment.aroma_notes,
        flavor_notes: experiment.flavor_notes,
        aftertaste_notes: experiment.aftertaste_notes,
        improvement_notes: experiment.improvement_notes,
        tag_ids: experiment.issue_tags?.map((t) => t.id) ?? [],
        target_acidity: experiment.target_acidity,
        target_sweetness: experiment.target_sweetness,
        target_bitterness: experiment.target_bitterness,
        target_body: experiment.target_body,
        target_aroma: experiment.target_aroma,
      })
      setLoadingDefaults(false)
    } else {
      // New experiment: load user defaults
      loadDefaults()
    }
  }, [experiment])

  async function loadDefaults() {
    try {
      const response = await api.getDefaults()
      const defaults = response.data
      const newData: ExperimentFormData = {
        ...DEFAULT_FORM_DATA,
        brew_date: format(new Date(), "yyyy-MM-dd"),
      }

      // Apply defaults
      if (defaults.coffee_weight) newData.coffee_weight = parseFloat(defaults.coffee_weight)
      if (defaults.water_weight) newData.water_weight = parseFloat(defaults.water_weight)
      if (defaults.water_temperature) newData.water_temperature = parseFloat(defaults.water_temperature)
      if (defaults.grind_size) newData.grind_size = defaults.grind_size
      if (defaults.filter_paper_id) newData.filter_paper_id = defaults.filter_paper_id
      if (defaults.bloom_water) newData.bloom_water = parseFloat(defaults.bloom_water)
      if (defaults.bloom_time) newData.bloom_time = parseFloat(defaults.bloom_time)

      setFormData(newData)
    } catch (err) {
      console.error("Failed to load defaults:", err)
      setFormData({
        ...DEFAULT_FORM_DATA,
        brew_date: format(new Date(), "yyyy-MM-dd"),
      })
    } finally {
      setLoadingDefaults(false)
    }
  }

  // Calculate ratio
  const calculatedRatio = useMemo(() => {
    if (formData.coffee_weight && formData.water_weight && formData.coffee_weight > 0) {
      return formData.water_weight / formData.coffee_weight
    }
    return undefined
  }, [formData.coffee_weight, formData.water_weight])

  const handleChange = (updates: Partial<ExperimentFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    // Clear errors for changed fields
    const errorFields = Object.keys(updates)
    if (errorFields.some((f) => errors[f])) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        errorFields.forEach((f) => delete newErrors[f])
        return newErrors
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.coffee_id) {
      newErrors.coffee_id = "Please select a coffee"
    }

    if (!formData.overall_notes || formData.overall_notes.trim().length < 10) {
      newErrors.overall_notes = "Please add notes (at least 10 characters)"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(formData)
  }

  if (loadingDefaults) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Required Fields */}
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coffee_id">
              Coffee <span className="text-destructive">*</span>
            </Label>
            <CoffeeSelect
              value={formData.coffee_id}
              onChange={(value) => handleChange({ coffee_id: value })}
              error={errors.coffee_id}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brew_date">Brew Date</Label>
              <Input
                id="brew_date"
                type="date"
                value={formData.brew_date ?? ""}
                onChange={(e) => handleChange({ brew_date: e.target.value || undefined })}
              />
            </div>

            <div className="space-y-3">
              <Label>Overall Score (optional)</Label>
              <IntensitySlider
                value={formData.overall_score}
                onChange={(value) => handleChange({ overall_score: value })}
                lowLabel="Poor"
                highLabel="Excellent"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="overall_notes">
              Overall Notes <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="overall_notes"
              value={formData.overall_notes}
              onChange={(e) => handleChange({ overall_notes: e.target.value })}
              placeholder="How was this brew? What stood out? What would you change?"
              rows={4}
              className={errors.overall_notes ? "border-destructive" : ""}
            />
            {errors.overall_notes && (
              <p className="text-sm text-destructive">{errors.overall_notes}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="improvement_notes">Ideas for Next Time</Label>
            <Textarea
              id="improvement_notes"
              value={formData.improvement_notes ?? ""}
              onChange={(e) =>
                handleChange({ improvement_notes: e.target.value || undefined })
              }
              placeholder="What would you try differently next time?"
              rows={2}
            />
          </div>
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-4">
          <PreBrewSection
            data={formData}
            onChange={handleChange}
            calculatedRatio={calculatedRatio}
          />

          <BrewSection data={formData} onChange={handleChange} />

          <SensorySection data={formData} onChange={handleChange} />

          <TargetProfileSection data={formData} onChange={handleChange} />

          <IssueTagsSection
            selectedTagIds={formData.tag_ids ?? []}
            onChange={(tagIds) => handleChange({ tag_ids: tagIds })}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : experiment
              ? "Update Experiment"
              : "Save Experiment"}
          </Button>
        </div>
      </form>
    </TooltipProvider>
  )
}
