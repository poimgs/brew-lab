import { useState, useEffect } from "react"
import { X, Save, Settings, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api, type UserDefaults } from "@/lib/api"

const FILTER_TYPES = [
  "Paper (bleached)",
  "Paper (unbleached)",
  "Metal",
  "Cloth",
  "Other",
]

interface DefaultField {
  key: string
  label: string
  unit?: string
  type: "number" | "text" | "select"
  options?: string[]
  placeholder?: string
  step?: string
}

const DEFAULT_FIELDS: DefaultField[] = [
  {
    key: "coffee_weight",
    label: "Coffee Weight",
    unit: "g",
    type: "number",
    placeholder: "15",
    step: "0.1",
  },
  {
    key: "water_weight",
    label: "Water Weight",
    unit: "g",
    type: "number",
    placeholder: "250",
    step: "1",
  },
  {
    key: "water_temperature",
    label: "Water Temperature",
    unit: "°C",
    type: "number",
    placeholder: "93",
    step: "1",
  },
  {
    key: "grind_size",
    label: "Grind Size",
    type: "text",
    placeholder: "e.g., 24 clicks, Medium-fine",
  },
  {
    key: "filter_type",
    label: "Filter Type",
    type: "select",
    options: FILTER_TYPES,
  },
  {
    key: "bloom_water",
    label: "Bloom Water",
    unit: "g",
    type: "number",
    placeholder: "45",
    step: "1",
  },
  {
    key: "bloom_time",
    label: "Bloom Time",
    unit: "s",
    type: "number",
    placeholder: "45",
    step: "1",
  },
]

export function BrewDefaultsSection() {
  const [defaults, setDefaults] = useState<UserDefaults>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalDefaults, setOriginalDefaults] = useState<UserDefaults>({})

  useEffect(() => {
    fetchDefaults()
  }, [])

  async function fetchDefaults() {
    try {
      const response = await api.getDefaults()
      const data = response.data ?? {}
      setDefaults(data)
      setOriginalDefaults(data)
    } catch (err) {
      console.error("Failed to fetch defaults:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    const newDefaults = { ...defaults }
    if (value) {
      newDefaults[key] = value
    } else {
      delete newDefaults[key]
    }
    setDefaults(newDefaults)
    setHasChanges(JSON.stringify(newDefaults) !== JSON.stringify(originalDefaults))
  }

  const handleClear = async (key: string) => {
    try {
      await api.deleteDefault(key)
      const newDefaults = { ...defaults }
      delete newDefaults[key]
      setDefaults(newDefaults)
      setOriginalDefaults(newDefaults)
      setHasChanges(false)
    } catch (err) {
      console.error("Failed to clear default:", err)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await api.updateDefaults(defaults)
      const data = response.data ?? {}
      setDefaults(data)
      setOriginalDefaults(data)
      setHasChanges(false)
    } catch (err) {
      console.error("Failed to save defaults:", err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Brew Defaults</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Brew Defaults</CardTitle>
          </div>
          <CardDescription className="mt-1.5">
            These values will be pre-filled when creating a new experiment.
            Clear individual values to remove them from defaults.
          </CardDescription>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DEFAULT_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <div className="flex items-center gap-2">
                {field.type === "select" ? (
                  <Select
                    value={defaults[field.key] ?? ""}
                    onValueChange={(value) => handleChange(field.key, value)}
                  >
                    <SelectTrigger id={field.key} className="flex-1">
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="relative flex-1">
                    <Input
                      id={field.key}
                      type={field.type}
                      value={defaults[field.key] ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      step={field.step}
                      className={field.unit ? "pr-12" : ""}
                    />
                    {field.unit && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        {field.unit}
                      </span>
                    )}
                  </div>
                )}
                {defaults[field.key] && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleClear(field.key)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear {field.label}</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
