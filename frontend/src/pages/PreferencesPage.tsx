import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Plus, Trash2, X } from "lucide-react"
import { Skeleton } from "@/components/ui/Skeleton"
import { toast } from "sonner"
import {
  getDefaults,
  updateDefaults,
  type DefaultsResponse,
  type UpdateDefaultsRequest,
} from "@/api/defaults"
import { listFilterPapers, type FilterPaper } from "@/api/filterPapers"
import { FormPageLayout } from "@/components/layout/FormPageLayout"

interface PourFormData {
  water_amount: string
  pour_style: string
  wait_time: string
}

export function PreferencesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [filterPapers, setFilterPapers] = useState<FilterPaper[]>([])
  const navigate = useNavigate()

  // Setup defaults
  const [coffeeWeight, setCoffeeWeight] = useState("")
  const [ratio, setRatio] = useState("")
  const [grindSize, setGrindSize] = useState("")
  const [waterTemperature, setWaterTemperature] = useState("")
  const [filterPaperId, setFilterPaperId] = useState("")

  // Pour defaults
  const [pours, setPours] = useState<PourFormData[]>([])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [defaults, fpRes] = await Promise.all([
        getDefaults(),
        listFilterPapers(1, 100),
      ])
      setFilterPapers(fpRes.items)
      populateForm(defaults)
    } catch {
      setError("Failed to load preferences. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  function populateForm(defaults: DefaultsResponse) {
    setCoffeeWeight(defaults.coffee_weight != null ? String(defaults.coffee_weight) : "")
    setRatio(defaults.ratio != null ? String(defaults.ratio) : "")
    setGrindSize(defaults.grind_size != null ? String(defaults.grind_size) : "")
    setWaterTemperature(defaults.water_temperature != null ? String(defaults.water_temperature) : "")
    setFilterPaperId(defaults.filter_paper_id ?? "")
    setPours(
      defaults.pour_defaults.map((p) => ({
        water_amount: p.water_amount != null ? String(p.water_amount) : "",
        pour_style: p.pour_style ?? "",
        wait_time: p.wait_time != null ? String(p.wait_time) : "",
      }))
    )
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    setIsSaving(true)

    const toNum = (v: string): number | undefined => {
      if (!v.trim()) return undefined
      const n = Number(v)
      return isNaN(n) ? undefined : n
    }
    const toInt = (v: string): number | undefined => {
      const n = toNum(v)
      return n != null ? Math.round(n) : undefined
    }

    const payload: UpdateDefaultsRequest = {}

    if (coffeeWeight.trim()) payload.coffee_weight = toNum(coffeeWeight)
    if (ratio.trim()) payload.ratio = toNum(ratio)
    if (grindSize.trim()) payload.grind_size = toNum(grindSize)
    if (waterTemperature.trim()) payload.water_temperature = toNum(waterTemperature)
    if (filterPaperId) payload.filter_paper_id = filterPaperId

    if (pours.length > 0) {
      payload.pour_defaults = pours.map((p, i) => ({
        pour_number: i + 1,
        water_amount: toNum(p.water_amount),
        pour_style: p.pour_style || undefined,
        wait_time: toInt(p.wait_time),
      }))
    } else {
      payload.pour_defaults = []
    }

    try {
      const updated = await updateDefaults(payload)
      populateForm(updated)
      toast.success("Preferences saved")
    } catch {
      toast.error("Failed to save preferences", { duration: 5000 })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

  const addPour = () => {
    setPours([...pours, { water_amount: "", pour_style: "", wait_time: "" }])
  }

  const removePour = (index: number) => {
    setPours(pours.filter((_, i) => i !== index))
  }

  const updatePour = (index: number, field: keyof PourFormData, value: string) => {
    setPours(pours.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  const inputClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  const actionButtons = () => (
    <>
      <button
        type="button"
        onClick={handleCancel}
        className="flex flex-1 sm:flex-initial h-12 sm:h-10 items-center justify-center rounded-md border border-border px-4 text-base sm:text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="flex flex-1 sm:flex-initial h-12 sm:h-10 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-base sm:text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save"
        )}
      </button>
    </>
  )

  if (isLoading) {
    return (
      <div className="flex h-full flex-col" data-testid="preferences-skeleton">
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-2xl">
            <Skeleton className="h-5 w-16" />
            <div className="mt-4 flex items-center justify-between">
              <Skeleton className="h-8 w-36" />
              <div className="hidden items-center gap-3 lg:flex">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-16" />
              </div>
            </div>
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <Skeleton className="h-4 w-28" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 flex-1" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-16 w-full rounded-md" />
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-border bg-card px-4 sm:px-8 py-4 lg:hidden">
          <div className="mx-auto flex max-w-2xl justify-end gap-3">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-16" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !coffeeWeight && !ratio && !grindSize && !waterTemperature && !filterPaperId && pours.length === 0) {
    return (
      <FormPageLayout
        title="Preferences"
        onBack={handleCancel}
        actions={() => null}
      >
        <div className="text-center">
          <p className="text-sm text-error">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Try Again
          </button>
        </div>
      </FormPageLayout>
    )
  }

  return (
    <FormPageLayout
      title="Preferences"
      description="These values are used when no reference brew exists for a coffee."
      onBack={handleCancel}
      actions={actionButtons}
    >
      <div className="space-y-6">
        {/* Setup Defaults */}
        <div>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Setup Defaults
          </h3>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <label htmlFor="default-coffee-weight" className="text-sm font-medium text-foreground sm:w-32 sm:shrink-0">
                Coffee Weight
              </label>
              <div className="flex flex-1 items-center gap-2">
                <input
                  id="default-coffee-weight"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 15"
                  value={coffeeWeight}
                  onChange={(e) => setCoffeeWeight(e.target.value)}
                  className={inputClass}
                />
                <span className="shrink-0 text-sm text-muted-foreground">g</span>
                {coffeeWeight && (
                  <button
                    type="button"
                    onClick={() => setCoffeeWeight("")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Clear coffee weight"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <label htmlFor="default-ratio" className="text-sm font-medium text-foreground sm:w-32 sm:shrink-0">
                Ratio
              </label>
              <div className="flex flex-1 items-center gap-2">
                <input
                  id="default-ratio"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 15"
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                  className={inputClass}
                />
                {ratio && (
                  <button
                    type="button"
                    onClick={() => setRatio("")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Clear ratio"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <label htmlFor="default-grind-size" className="text-sm font-medium text-foreground sm:w-32 sm:shrink-0">
                Grind Size
              </label>
              <div className="flex flex-1 items-center gap-2">
                <input
                  id="default-grind-size"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 3.5"
                  value={grindSize}
                  onChange={(e) => setGrindSize(e.target.value)}
                  className={inputClass}
                />
                {grindSize && (
                  <button
                    type="button"
                    onClick={() => setGrindSize("")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Clear grind size"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <label htmlFor="default-temperature" className="text-sm font-medium text-foreground sm:w-32 sm:shrink-0">
                Temperature
              </label>
              <div className="flex flex-1 items-center gap-2">
                <input
                  id="default-temperature"
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  placeholder="e.g., 93"
                  value={waterTemperature}
                  onChange={(e) => setWaterTemperature(e.target.value)}
                  className={inputClass}
                />
                <span className="shrink-0 text-sm text-muted-foreground">C</span>
                {waterTemperature && (
                  <button
                    type="button"
                    onClick={() => setWaterTemperature("")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Clear temperature"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <label htmlFor="default-filter-paper" className="text-sm font-medium text-foreground sm:w-32 sm:shrink-0">
                Filter Paper
              </label>
              <div className="flex flex-1 items-center gap-2">
                <select
                  id="default-filter-paper"
                  value={filterPaperId}
                  onChange={(e) => setFilterPaperId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select filter...</option>
                  {filterPapers.map((fp) => (
                    <option key={fp.id} value={fp.id}>
                      {fp.name}
                      {fp.brand ? ` (${fp.brand})` : ""}
                    </option>
                  ))}
                </select>
                {filterPaperId && (
                  <button
                    type="button"
                    onClick={() => setFilterPaperId("")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Clear filter paper"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pour Defaults */}
        <div>
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Pour Defaults
          </h3>

          <div className="space-y-3">
            {pours.map((pour, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  #{index + 1}
                  {index === 0 && " (Bloom)"}
                </span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="grams"
                  value={pour.water_amount}
                  onChange={(e) => updatePour(index, "water_amount", e.target.value)}
                  className={`${inputClass} sm:w-24`}
                  aria-label={`Pour ${index + 1} water amount`}
                />
                <span className="hidden text-sm text-muted-foreground sm:inline">g</span>
                <select
                  value={pour.pour_style}
                  onChange={(e) => updatePour(index, "pour_style", e.target.value)}
                  className={`${inputClass} sm:w-28`}
                  aria-label={`Pour ${index + 1} style`}
                >
                  <option value="">Style</option>
                  <option value="circular">Circular</option>
                  <option value="center">Center</option>
                </select>
                <div className="flex items-center gap-1">
                  <span className="hidden text-sm text-muted-foreground sm:inline">wait</span>
                  <input
                    type="number"
                    placeholder="seconds"
                    value={pour.wait_time}
                    onChange={(e) => updatePour(index, "wait_time", e.target.value)}
                    className={`${inputClass} sm:w-24`}
                    aria-label={`Pour ${index + 1} wait time`}
                  />
                  <span className="hidden text-sm text-muted-foreground sm:inline">s</span>
                </div>
                <button
                  type="button"
                  onClick={() => removePour(index)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-error"
                  aria-label={`Remove pour ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addPour}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Add Pour
            </button>
          </div>
        </div>
      </div>
    </FormPageLayout>
  )
}
