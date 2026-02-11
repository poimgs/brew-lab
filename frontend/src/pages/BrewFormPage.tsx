import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ChevronDown,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { Skeleton } from "@/components/ui/Skeleton"
import { toast } from "sonner"
import { FormPageLayout } from "@/components/layout/FormPageLayout"
import { CollapsibleSection, type SectionFill } from "@/components/ui/CollapsibleSection"
import { listCoffees, type Coffee } from "@/api/coffees"
import { listFilterPapers, type FilterPaper } from "@/api/filterPapers"
import {
  createBrew,
  updateBrew,
  getBrew,
  getReference,
  type Brew,
  type BrewRequest,
  type ReferenceResponse,
} from "@/api/brews"
import { getDefaults, type DefaultsResponse } from "@/api/defaults"
import { BrewDetailModal } from "@/components/brew/BrewDetailModal"

// --- Zod schema ---

const pourSchema = z.object({
  water_amount: z
    .union([z.coerce.number().positive("Must be positive"), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  pour_style: z.string().optional().default(""),
  wait_time: z
    .union([
      z.coerce.number().int().nonnegative("Must be 0 or more"),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
})

const brewFormSchema = z.object({
  coffee_id: z.string().min(1, "Coffee is required"),
  brew_date: z.string().optional().default(""),
  overall_notes: z.string().optional().default(""),
  overall_score: z
    .union([
      z.coerce.number().int().min(1, "Min 1").max(10, "Max 10"),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  improvement_notes: z.string().optional().default(""),
  // Setup
  coffee_weight: z
    .union([z.coerce.number().positive("Must be positive"), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  ratio: z
    .union([z.coerce.number().positive("Must be positive"), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  grind_size: z
    .union([z.coerce.number().positive("Must be positive"), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  water_temperature: z
    .union([
      z.coerce.number().min(0, "Min 0").max(100, "Max 100"),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  filter_paper_id: z.string().optional().default(""),
  // Brewing
  pours: z.array(pourSchema).optional().default([]),
  total_brew_time_display: z.string().optional().default(""),
  technique_notes: z.string().optional().default(""),
  // Tasting
  coffee_ml: z
    .union([z.coerce.number().positive("Must be positive"), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  tds: z
    .union([z.coerce.number().positive("Must be positive"), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  aroma_intensity: z
    .union([
      z.coerce.number().int().min(1, "Min 1").max(10, "Max 10"),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  body_intensity: z
    .union([
      z.coerce.number().int().min(1, "Min 1").max(10, "Max 10"),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  sweetness_intensity: z
    .union([
      z.coerce.number().int().min(1, "Min 1").max(10, "Max 10"),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  brightness_intensity: z
    .union([
      z.coerce.number().int().min(1, "Min 1").max(10, "Max 10"),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  complexity_intensity: z
    .union([
      z.coerce.number().int().min(1, "Min 1").max(10, "Max 10"),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  aftertaste_intensity: z
    .union([
      z.coerce.number().int().min(1, "Min 1").max(10, "Max 10"),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
})

type BrewFormData = z.input<typeof brewFormSchema>

// --- Helpers ---

function todayStr() {
  return new Date().toISOString().split("T")[0]
}

function parseBrewTime(display: string): number | null {
  if (!display.trim()) return null
  const parts = display.split(":")
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10)
    const secs = parseInt(parts[1], 10)
    if (!isNaN(mins) && !isNaN(secs)) return mins * 60 + secs
  }
  const n = parseInt(display, 10)
  return isNaN(n) ? null : n
}

function formatBrewTime(seconds: number | null | undefined): string {
  if (seconds == null) return ""
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function computeWaterWeight(
  coffeeWeight: number | null | undefined,
  ratio: number | null | undefined
): number | null {
  if (coffeeWeight == null || ratio == null) return null
  return Math.round(coffeeWeight * ratio * 100) / 100
}

function computeExtractionYield(
  coffeeMl: number | null | undefined,
  tds: number | null | undefined,
  coffeeWeight: number | null | undefined
): number | null {
  if (coffeeMl == null || tds == null || coffeeWeight == null || coffeeWeight === 0)
    return null
  return Math.round(((coffeeMl * tds) / coffeeWeight) * 100) / 100
}

// --- Coffee Selector ---

function CoffeeSelector({
  coffees,
  value,
  onChange,
  error,
}: {
  coffees: Coffee[]
  value: string
  onChange: (id: string) => void
  error?: string
}) {
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = coffees.find((c) => c.id === value)
  const filtered = coffees.filter(
    (c) =>
      !c.archived_at &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.roaster.toLowerCase().includes(search.toLowerCase()))
  )

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setIsOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="text-sm font-medium text-foreground">
        Coffee <span className="text-error">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ${
            error ? "border-error" : "border-input"
          }`}
        >
          <span className={selected ? "text-foreground" : "text-muted-foreground"}>
            {selected
              ? `${selected.name} - ${selected.roaster}`
              : "Select coffee..."}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        {isOpen && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
            <div className="p-2">
              <input
                type="text"
                placeholder="Search coffees..."
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <ul className="max-h-48 overflow-auto py-1" role="listbox">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  No coffees found
                </li>
              ) : (
                filtered.map((c) => (
                  <li
                    key={c.id}
                    role="option"
                    aria-selected={c.id === value}
                    className={`cursor-pointer px-3 py-2 text-sm hover:bg-muted ${
                      c.id === value ? "bg-primary-muted font-medium" : ""
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onChange(c.id)
                      setIsOpen(false)
                      setSearch("")
                    }}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      - {c.roaster}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  )
}

// --- Main Form ---

export function BrewFormPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const coffeeIdParam = searchParams.get("coffee_id")
  const fromBrewId = searchParams.get("from")

  // Data loading
  const [coffees, setCoffees] = useState<Coffee[]>([])
  const [filterPapers, setFilterPapers] = useState<FilterPaper[]>([])
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [reference, setReference] = useState<ReferenceResponse | null>(null)
  const [userDefaults, setUserDefaults] = useState<DefaultsResponse | null>(null)

  // UI state
  const [setupOpen, setSetupOpen] = useState(false)
  const [brewingOpen, setBrewingOpen] = useState(false)
  const [tastingOpen, setTastingOpen] = useState(false)
  const [showReference, setShowReference] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const initialLoadDone = useRef(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<BrewFormData>({
    resolver: zodResolver(brewFormSchema),
    defaultValues: {
      coffee_id: coffeeIdParam ?? "",
      brew_date: todayStr(),
      overall_notes: "",
      overall_score: "",
      improvement_notes: "",
      coffee_weight: "",
      ratio: "",
      grind_size: "",
      water_temperature: "",
      filter_paper_id: "",
      pours: [],
      total_brew_time_display: "",
      technique_notes: "",
      coffee_ml: "",
      tds: "",
      aroma_intensity: "",
      body_intensity: "",
      sweetness_intensity: "",
      brightness_intensity: "",
      complexity_intensity: "",
      aftertaste_intensity: "",
    },
  })

  const { fields: pourFields, append: appendPour, remove: removePour } =
    useFieldArray({ control, name: "pours" })

  const watchedCoffeeId = watch("coffee_id")
  const watchedCoffeeWeight = watch("coffee_weight")
  const watchedRatio = watch("ratio")
  const watchedCoffeeMl = watch("coffee_ml")
  const watchedTds = watch("tds")

  // beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  // Load page data
  useEffect(() => {
    async function load() {
      try {
        const [coffeeRes, fpRes, defaultsRes] = await Promise.all([
          listCoffees({ per_page: 100 }),
          listFilterPapers(1, 100),
          !id && !fromBrewId ? getDefaults().catch(() => null) : Promise.resolve(null),
        ])
        setCoffees(coffeeRes.items)
        setFilterPapers(fpRes.items)
        if (defaultsRes) setUserDefaults(defaultsRes)

        // If editing, load the existing brew
        if (id) {
          const brew = await getBrew(id)
          populateFromBrew(brew, false)
        }
        // If "Brew Again" mode
        else if (fromBrewId) {
          const brew = await getBrew(fromBrewId)
          populateFromBrew(brew, true)
        }
        // New brew with coffee pre-selected: try reference, then defaults
        else if (coffeeIdParam) {
          try {
            const ref = await getReference(coffeeIdParam)
            setReference(ref)
            if (ref.brew) {
              populateFromReference(ref.brew)
            } else if (defaultsRes) {
              populateFromDefaults(defaultsRes)
            }
          } catch {
            if (defaultsRes) populateFromDefaults(defaultsRes)
          }
        }
        // New brew with no coffee: leave fields blank until coffee is selected.
        // Defaults will be applied via fetchReference() when the user picks a coffee.
      } catch {
        setServerError("Failed to load data. Please try again.")
      } finally {
        setIsPageLoading(false)
        initialLoadDone.current = true
      }
    }

    function populateFromBrew(brew: Brew, isBrewAgain: boolean) {
      const values: Partial<BrewFormData> = {
        coffee_id: brew.coffee_id,
        coffee_weight: brew.coffee_weight ?? "",
        ratio: brew.ratio ?? "",
        grind_size: brew.grind_size ?? "",
        water_temperature: brew.water_temperature ?? "",
        filter_paper_id: brew.filter_paper?.id ?? "",
        pours: brew.pours.map((p) => ({
          water_amount: p.water_amount ?? "",
          pour_style: p.pour_style ?? "",
          wait_time: p.wait_time ?? "",
        })),
        total_brew_time_display: formatBrewTime(brew.total_brew_time),
        technique_notes: brew.technique_notes ?? "",
      }

      if (!isBrewAgain) {
        // Editing: also populate outcomes
        values.brew_date = brew.brew_date
        values.overall_notes = brew.overall_notes ?? ""
        values.overall_score = brew.overall_score ?? ""
        values.improvement_notes = brew.improvement_notes ?? ""
        values.coffee_ml = brew.coffee_ml ?? ""
        values.tds = brew.tds ?? ""
        values.aroma_intensity = brew.aroma_intensity ?? ""
        values.body_intensity = brew.body_intensity ?? ""
        values.sweetness_intensity = brew.sweetness_intensity ?? ""
        values.brightness_intensity = brew.brightness_intensity ?? ""
        values.complexity_intensity = brew.complexity_intensity ?? ""
        values.aftertaste_intensity = brew.aftertaste_intensity ?? ""
      } else {
        values.brew_date = todayStr()
        values.overall_notes = ""
        values.overall_score = ""
        values.improvement_notes = ""
        values.coffee_ml = ""
        values.tds = ""
        values.aroma_intensity = ""
        values.body_intensity = ""
        values.sweetness_intensity = ""
        values.brightness_intensity = ""
        values.complexity_intensity = ""
        values.aftertaste_intensity = ""
      }

      reset(values as BrewFormData)
    }

    function populateFromReference(brew: Brew) {
      const values: Partial<BrewFormData> = {
        coffee_id: coffeeIdParam ?? "",
        brew_date: todayStr(),
        coffee_weight: brew.coffee_weight ?? "",
        ratio: brew.ratio ?? "",
        grind_size: brew.grind_size ?? "",
        water_temperature: brew.water_temperature ?? "",
        filter_paper_id: brew.filter_paper?.id ?? "",
        pours: brew.pours.map((p) => ({
          water_amount: p.water_amount ?? "",
          pour_style: p.pour_style ?? "",
          wait_time: p.wait_time ?? "",
        })),
        total_brew_time_display: formatBrewTime(brew.total_brew_time),
        technique_notes: brew.technique_notes ?? "",
        // Outcomes blank for new brew
        overall_notes: "",
        overall_score: "",
        improvement_notes: "",
        coffee_ml: "",
        tds: "",
        aroma_intensity: "",
        body_intensity: "",
        sweetness_intensity: "",
        brightness_intensity: "",
        complexity_intensity: "",
        aftertaste_intensity: "",
      }
      reset(values as BrewFormData)
    }

    function populateFromDefaults(defaults: DefaultsResponse) {
      const values: Partial<BrewFormData> = {
        coffee_id: coffeeIdParam ?? "",
        brew_date: todayStr(),
        coffee_weight: defaults.coffee_weight ?? "",
        ratio: defaults.ratio ?? "",
        grind_size: defaults.grind_size ?? "",
        water_temperature: defaults.water_temperature ?? "",
        filter_paper_id: defaults.filter_paper_id ?? "",
        pours: defaults.pour_defaults.map((p) => ({
          water_amount: p.water_amount ?? "",
          pour_style: p.pour_style ?? "",
          wait_time: p.wait_time ?? "",
        })),
        total_brew_time_display: "",
        technique_notes: "",
        overall_notes: "",
        overall_score: "",
        improvement_notes: "",
        coffee_ml: "",
        tds: "",
        aroma_intensity: "",
        body_intensity: "",
        sweetness_intensity: "",
        brightness_intensity: "",
        complexity_intensity: "",
        aftertaste_intensity: "",
      }
      reset(values as BrewFormData)
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch reference when coffee changes and auto-fill for new brews
  const fetchReference = useCallback(async (coffeeId: string) => {
    if (!coffeeId) {
      setReference(null)
      return
    }
    try {
      const ref = await getReference(coffeeId)
      setReference(ref)

      // Auto-fill on coffee change for new brews (not editing or brew-again)
      if (!id && !fromBrewId && initialLoadDone.current) {
        if (ref.brew) {
          // Auto-fill from reference brew (setup + brewing only)
          setValue("coffee_weight", ref.brew.coffee_weight ?? "")
          setValue("ratio", ref.brew.ratio ?? "")
          setValue("grind_size", ref.brew.grind_size ?? "")
          setValue("water_temperature", ref.brew.water_temperature ?? "")
          setValue("filter_paper_id", ref.brew.filter_paper?.id ?? "")
        } else if (userDefaults) {
          // Fall back to user defaults
          setValue("coffee_weight", userDefaults.coffee_weight ?? "")
          setValue("ratio", userDefaults.ratio ?? "")
          setValue("grind_size", userDefaults.grind_size ?? "")
          setValue("water_temperature", userDefaults.water_temperature ?? "")
          setValue("filter_paper_id", userDefaults.filter_paper_id ?? "")
        }
      }
    } catch {
      setReference(null)
    }
  }, [id, fromBrewId, userDefaults, setValue])

  useEffect(() => {
    if (!initialLoadDone.current) return
    fetchReference(watchedCoffeeId)
  }, [watchedCoffeeId, fetchReference])

  // Also fetch reference on initial load if we have a coffee_id
  useEffect(() => {
    if (initialLoadDone.current && watchedCoffeeId) {
      fetchReference(watchedCoffeeId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPageLoading])

  // Computed values
  const cwNum =
    typeof watchedCoffeeWeight === "number" ? watchedCoffeeWeight : null
  const ratioNum = typeof watchedRatio === "number" ? watchedRatio : null
  const coffMlNum = typeof watchedCoffeeMl === "number" ? watchedCoffeeMl : null
  const tdsNum = typeof watchedTds === "number" ? watchedTds : null

  // Parse numbers from string form values
  const cwParsed = cwNum ?? (watchedCoffeeWeight ? Number(watchedCoffeeWeight) : null)
  const ratioParsed = ratioNum ?? (watchedRatio ? Number(watchedRatio) : null)
  const coffMlParsed = coffMlNum ?? (watchedCoffeeMl ? Number(watchedCoffeeMl) : null)
  const tdsParsed = tdsNum ?? (watchedTds ? Number(watchedTds) : null)

  const waterWeight = computeWaterWeight(
    cwParsed && !isNaN(cwParsed) ? cwParsed : null,
    ratioParsed && !isNaN(ratioParsed) ? ratioParsed : null
  )
  const extractionYield = computeExtractionYield(
    coffMlParsed && !isNaN(coffMlParsed) ? coffMlParsed : null,
    tdsParsed && !isNaN(tdsParsed) ? tdsParsed : null,
    cwParsed && !isNaN(cwParsed) ? cwParsed : null
  )

  // Days off roast
  const selectedCoffee = coffees.find((c) => c.id === watchedCoffeeId)
  const watchedBrewDate = watch("brew_date")
  const daysOffRoast = useMemo(() => {
    if (!selectedCoffee?.roast_date || !watchedBrewDate) return null
    const roast = new Date(selectedCoffee.roast_date + "T00:00:00")
    const brew = new Date(watchedBrewDate + "T00:00:00")
    const diff = Math.floor(
      (brew.getTime() - roast.getTime()) / (1000 * 60 * 60 * 24)
    )
    return diff >= 0 ? diff : null
  }, [selectedCoffee?.roast_date, watchedBrewDate])

  // Section fill indicators
  const watchAll = watch()

  const setupFill: SectionFill = useMemo(() => {
    const fields = [
      watchAll.coffee_weight,
      watchAll.ratio,
      watchAll.grind_size,
      watchAll.water_temperature,
      watchAll.filter_paper_id,
    ]
    const filled = fields.filter(
      (v) => v !== "" && v !== null && v !== undefined
    ).length
    if (filled === 0) return "empty"
    if (filled === fields.length) return "full"
    return "partial"
  }, [
    watchAll.coffee_weight,
    watchAll.ratio,
    watchAll.grind_size,
    watchAll.water_temperature,
    watchAll.filter_paper_id,
  ])

  const brewingFill: SectionFill = useMemo(() => {
    const hasPours = (watchAll.pours?.length ?? 0) > 0
    const hasTime = !!watchAll.total_brew_time_display
    const hasTechnique = !!watchAll.technique_notes
    const filled = [hasPours, hasTime, hasTechnique].filter(Boolean).length
    if (filled === 0) return "empty"
    if (filled === 3) return "full"
    return "partial"
  }, [watchAll.pours, watchAll.total_brew_time_display, watchAll.technique_notes])

  const tastingFill: SectionFill = useMemo(() => {
    const fields = [
      watchAll.coffee_ml,
      watchAll.tds,
      watchAll.aroma_intensity,
      watchAll.body_intensity,
      watchAll.sweetness_intensity,
      watchAll.brightness_intensity,
      watchAll.complexity_intensity,
      watchAll.aftertaste_intensity,
      watchAll.overall_score,
    ]
    const filled = fields.filter(
      (v) => v !== "" && v !== null && v !== undefined
    ).length
    if (filled === 0) return "empty"
    if (filled === fields.length) return "full"
    return "partial"
  }, [
    watchAll.coffee_ml,
    watchAll.tds,
    watchAll.aroma_intensity,
    watchAll.body_intensity,
    watchAll.sweetness_intensity,
    watchAll.brightness_intensity,
    watchAll.complexity_intensity,
    watchAll.aftertaste_intensity,
    watchAll.overall_score,
  ])

  // Pour total warning
  const pourTotal = useMemo(() => {
    if (!watchAll.pours?.length) return null
    let sum = 0
    for (const p of watchAll.pours) {
      const amt = typeof p.water_amount === "number" ? p.water_amount : Number(p.water_amount)
      if (!isNaN(amt) && amt > 0) sum += amt
    }
    return sum > 0 ? sum : null
  }, [watchAll.pours])

  const waterWeightMismatch =
    waterWeight != null &&
    pourTotal != null &&
    Math.abs(pourTotal - waterWeight) > 0.5

  // Submit
  const onSubmit = async (data: BrewFormData) => {
    setServerError(null)
    setIsSubmitting(true)

    const toNum = (v: unknown): number | null => {
      if (v === "" || v === undefined || v === null) return null
      const n = Number(v)
      return isNaN(n) ? null : n
    }
    const toInt = (v: unknown): number | null => {
      const n = toNum(v)
      return n != null ? Math.round(n) : null
    }

    const totalBrewTime = parseBrewTime(data.total_brew_time_display ?? "")

    const payload: BrewRequest = {
      coffee_id: data.coffee_id,
      brew_date: data.brew_date || null,
      coffee_weight: toNum(data.coffee_weight),
      ratio: toNum(data.ratio),
      grind_size: toNum(data.grind_size),
      water_temperature: toNum(data.water_temperature),
      filter_paper_id: data.filter_paper_id || null,
      pours: (data.pours ?? []).map((p, i) => ({
        pour_number: i + 1,
        water_amount: toNum(p.water_amount),
        pour_style: p.pour_style || null,
        wait_time: toInt(p.wait_time),
      })),
      total_brew_time: totalBrewTime,
      technique_notes: data.technique_notes || null,
      coffee_ml: toNum(data.coffee_ml),
      tds: toNum(data.tds),
      aroma_intensity: toInt(data.aroma_intensity),
      body_intensity: toInt(data.body_intensity),
      sweetness_intensity: toInt(data.sweetness_intensity),
      brightness_intensity: toInt(data.brightness_intensity),
      complexity_intensity: toInt(data.complexity_intensity),
      aftertaste_intensity: toInt(data.aftertaste_intensity),
      overall_score: toInt(data.overall_score),
      overall_notes: data.overall_notes || null,
      improvement_notes: data.improvement_notes || null,
    }

    try {
      if (isEditing && id) {
        await updateBrew(id, payload)
        toast.success("Brew updated")
      } else {
        await createBrew(payload)
        toast.success("Brew saved")
      }

      // Post-save navigation
      const from = searchParams.get("coffee_id")
      if (from) {
        navigate(`/coffees/${from}`)
      } else {
        navigate("/")
      }
    } catch {
      setServerError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

  // Input class helper
  const inputClass = (hasError?: boolean) =>
    `flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      hasError ? "border-error" : "border-input"
    }`

  if (isPageLoading) {
    return (
      <div className="flex h-full flex-col" data-testid="brew-form-skeleton">
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-2xl">
            <Skeleton className="h-5 w-16" />
            <div className="mt-4 flex items-center justify-between">
              <Skeleton className="h-8 w-32" />
              <div className="hidden items-center gap-3 lg:flex">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-20 w-full" />
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-md border border-border">
                  <div className="flex items-center justify-between px-4 py-3">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-3 w-3 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-border bg-card px-4 sm:px-8 py-4 lg:hidden">
          <div className="mx-auto flex max-w-2xl justify-end gap-3">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    )
  }

  const actionButtons = () => (
    <>
      {watchedCoffeeId && (
        <button
          type="button"
          onClick={() => setShowReference(true)}
          className="flex flex-1 sm:flex-initial h-12 sm:h-10 items-center justify-center rounded-md border border-border px-4 text-base sm:text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Reference
        </button>
      )}
      <button
        type="button"
        onClick={handleCancel}
        className="flex flex-1 sm:flex-initial h-12 sm:h-10 items-center justify-center rounded-md border border-border px-4 text-base sm:text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        className="flex flex-1 sm:flex-initial h-12 sm:h-10 items-center justify-center rounded-md bg-primary px-4 text-base sm:text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Brew"
        )}
      </button>
    </>
  )

  return (
    <>
      <FormPageLayout
        title={isEditing ? "Edit Brew" : "New Brew"}
        onBack={handleCancel}
        actions={actionButtons}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
        >
          {serverError && (
            <div className="rounded-md bg-error-muted p-3 text-sm text-error">
              {serverError}
            </div>
          )}

          {/* Coffee selector */}
          <CoffeeSelector
            coffees={coffees}
            value={watchedCoffeeId}
            onChange={(id) => setValue("coffee_id", id, { shouldValidate: true })}
            error={errors.coffee_id?.message}
          />

          {/* Brew date */}
          <div className="space-y-2">
            <label htmlFor="brew-date" className="text-sm font-medium text-foreground">
              Brew Date
            </label>
            <input
              id="brew-date"
              type="date"
              max={todayStr()}
              className={inputClass()}
              {...register("brew_date")}
            />
          </div>

          {/* Days off roast */}
          {daysOffRoast != null && (
            <p className="text-sm text-muted-foreground">
              Days Off Roast: <span className="font-medium text-foreground">{daysOffRoast}</span>
            </p>
          )}

          {/* --- Section 1: Setup --- */}
          <CollapsibleSection title="Setup" fill={setupFill} open={setupOpen} onToggle={() => setSetupOpen(!setupOpen)}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="coffee-weight" className="text-sm font-medium text-foreground">
                      Coffee Weight (g)
                    </label>
                    <input
                      id="coffee-weight"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 15"
                      className={inputClass(!!errors.coffee_weight)}
                      {...register("coffee_weight")}
                    />
                    {errors.coffee_weight && (
                      <p className="text-sm text-error">{errors.coffee_weight.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="ratio" className="text-sm font-medium text-foreground">
                      Ratio
                    </label>
                    <input
                      id="ratio"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 15"
                      className={inputClass(!!errors.ratio)}
                      {...register("ratio")}
                    />
                    {errors.ratio && (
                      <p className="text-sm text-error">{errors.ratio.message}</p>
                    )}
                  </div>
                </div>

                {waterWeight != null && (
                  <p className="text-sm text-muted-foreground">
                    Water Weight:{" "}
                    <span className="font-medium text-foreground">
                      {waterWeight}g
                    </span>{" "}
                    (computed)
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="grind-size" className="text-sm font-medium text-foreground">
                      Grind Size
                    </label>
                    <input
                      id="grind-size"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 3.5"
                      className={inputClass(!!errors.grind_size)}
                      {...register("grind_size")}
                    />
                    {errors.grind_size && (
                      <p className="text-sm text-error">{errors.grind_size.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="water-temp" className="text-sm font-medium text-foreground">
                      Temperature (C)
                    </label>
                    <input
                      id="water-temp"
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      placeholder="e.g., 96"
                      className={inputClass(!!errors.water_temperature)}
                      {...register("water_temperature")}
                    />
                    {errors.water_temperature && (
                      <p className="text-sm text-error">{errors.water_temperature.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="filter-paper" className="text-sm font-medium text-foreground">
                    Filter Paper
                  </label>
                  <select
                    id="filter-paper"
                    className={inputClass()}
                    {...register("filter_paper_id")}
                  >
                    <option value="">Select filter...</option>
                    {filterPapers.map((fp) => (
                      <option key={fp.id} value={fp.id}>
                        {fp.name}
                        {fp.brand ? ` (${fp.brand})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
          </CollapsibleSection>

          {/* --- Section 2: Brewing --- */}
          <CollapsibleSection title="Brewing" fill={brewingFill} open={brewingOpen} onToggle={() => setBrewingOpen(!brewingOpen)}>
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Pours</label>
                  {pourFields.map((field, index) => (
                    <div
                      key={field.id}
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
                        className={`${inputClass()} sm:w-24`}
                        {...register(`pours.${index}.water_amount`)}
                      />
                      <select
                        className={`${inputClass()} sm:w-28`}
                        {...register(`pours.${index}.pour_style`)}
                      >
                        <option value="">Style</option>
                        <option value="circular">Circular</option>
                        <option value="center">Center</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="wait (s)"
                          className={`${inputClass()} sm:w-24`}
                          {...register(`pours.${index}.wait_time`)}
                        />
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
                    onClick={() =>
                      appendPour({ water_amount: "", pour_style: "", wait_time: "" })
                    }
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    <Plus className="h-4 w-4" />
                    Add Pour
                  </button>
                </div>

                {waterWeightMismatch && (
                  <div className="rounded-md bg-warning-muted p-3 text-sm text-warning">
                    Sum of pours ({pourTotal}g) differs from water weight (
                    {waterWeight}g)
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="total-brew-time" className="text-sm font-medium text-foreground">
                    Total Brew Time (mm:ss)
                  </label>
                  <input
                    id="total-brew-time"
                    type="text"
                    placeholder="e.g., 2:45"
                    className={inputClass()}
                    {...register("total_brew_time_display")}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="technique-notes" className="text-sm font-medium text-foreground">
                    Technique Notes
                  </label>
                  <textarea
                    id="technique-notes"
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="e.g., Gentle swirl after bloom"
                    {...register("technique_notes")}
                  />
                </div>
          </CollapsibleSection>

          {/* --- Section 3: Tasting --- */}
          <CollapsibleSection title="Tasting" fill={tastingFill} open={tastingOpen} onToggle={() => setTastingOpen(!tastingOpen)}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="coffee-ml" className="text-sm font-medium text-foreground">
                      Coffee (ml)
                    </label>
                    <input
                      id="coffee-ml"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 200"
                      className={inputClass(!!errors.coffee_ml)}
                      {...register("coffee_ml")}
                    />
                    {errors.coffee_ml && (
                      <p className="text-sm text-error">{errors.coffee_ml.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="tds" className="text-sm font-medium text-foreground">
                      TDS (%)
                    </label>
                    <input
                      id="tds"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 1.38"
                      className={inputClass(!!errors.tds)}
                      {...register("tds")}
                    />
                    {errors.tds && (
                      <p className="text-sm text-error">{errors.tds.message}</p>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Extraction Yield:{" "}
                  <span className="font-medium text-foreground">
                    {extractionYield != null ? `${extractionYield}%` : "\u2014"}
                  </span>
                  {extractionYield != null && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (computed)
                    </span>
                  )}
                </p>

                <div className="border-t border-border pt-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Sensory (1-10)
                  </p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {(
                      [
                        ["aroma_intensity", "Aroma"],
                        ["body_intensity", "Body"],
                        ["sweetness_intensity", "Sweetness"],
                        ["brightness_intensity", "Brightness"],
                        ["complexity_intensity", "Complexity"],
                        ["aftertaste_intensity", "Aftertaste"],
                      ] as const
                    ).map(([field, label]) => (
                      <div key={field} className="space-y-1">
                        <label
                          htmlFor={field}
                          className="text-sm font-medium text-foreground"
                        >
                          {label}
                        </label>
                        <input
                          id={field}
                          type="number"
                          min={1}
                          max={10}
                          placeholder="1-10"
                          className={inputClass(!!errors[field])}
                          {...register(field)}
                        />
                        {errors[field] && (
                          <p className="text-xs text-error">
                            {errors[field]?.message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overall score */}
                <div className="space-y-2">
                  <label htmlFor="overall-score" className="text-sm font-medium text-foreground">
                    Overall Score
                  </label>
                  <input
                    id="overall-score"
                    type="number"
                    min={1}
                    max={10}
                    placeholder="1-10"
                    className={inputClass(!!errors.overall_score)}
                    {...register("overall_score")}
                  />
                  {errors.overall_score && (
                    <p className="text-sm text-error">
                      {errors.overall_score.message}
                    </p>
                  )}
                </div>

                {/* Overall notes */}
                <div className="space-y-2">
                  <label htmlFor="overall-notes" className="text-sm font-medium text-foreground">
                    Overall Notes
                  </label>
                  <textarea
                    id="overall-notes"
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="How was this brew?"
                    {...register("overall_notes")}
                  />
                </div>

                {/* Improvement notes */}
                <div className="space-y-2">
                  <label htmlFor="improvement-notes" className="text-sm font-medium text-foreground">
                    Improvement Notes
                  </label>
                  <textarea
                    id="improvement-notes"
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Ideas for next time..."
                    {...register("improvement_notes")}
                  />
                </div>
          </CollapsibleSection>

        </form>
      </FormPageLayout>

      {showReference && reference?.brew && (
        <BrewDetailModal
          brew={reference.brew}
          onClose={() => setShowReference(false)}
        />
      )}

      {showReference && !reference?.brew && selectedCoffee && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 sm:px-4 sm:py-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReference(false)
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Reference"
        >
          <div className="flex min-h-screen w-full flex-col bg-card sm:min-h-0 sm:max-w-lg sm:rounded-lg sm:shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-card-foreground">
                Reference
              </h2>
              <button
                onClick={() => setShowReference(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 px-6 py-4">
              <p className="font-medium">
                {selectedCoffee.name} — {selectedCoffee.roaster}
              </p>
              {selectedCoffee.tasting_notes && (
                <p className="mt-1 text-sm italic text-muted-foreground">
                  {selectedCoffee.tasting_notes}
                </p>
              )}
              <p className="mt-4 text-sm text-muted-foreground">
                No reference brew found. Log your first brew!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
