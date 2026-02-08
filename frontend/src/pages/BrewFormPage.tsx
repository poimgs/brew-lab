import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Loader2,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  PanelRightOpen,
  PanelRightClose,
  X,
} from "lucide-react"
import { Skeleton } from "@/components/ui/Skeleton"
import { toast } from "sonner"
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

type SectionFill = "empty" | "partial" | "full"

function SectionFillDot({ fill }: { fill: SectionFill }) {
  if (fill === "full")
    return (
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
    )
  if (fill === "partial")
    return (
      <span className="relative inline-block h-2.5 w-2.5 rounded-full border border-primary">
        <span className="absolute bottom-0 left-0 h-full w-1/2 rounded-l-full bg-primary" />
      </span>
    )
  return (
    <span className="inline-block h-2.5 w-2.5 rounded-full border border-muted-foreground" />
  )
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

// --- Reference Sidebar ---

function ReferenceSidebar({
  reference,
  isOpen,
  onToggle,
  onClose,
  isMobile,
}: {
  reference: ReferenceResponse | null
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  isMobile: boolean
}) {
  const brew = reference?.brew

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Reference{" "}
          {reference?.source && (
            <span className="font-normal text-muted-foreground">
              ({reference.source})
            </span>
          )}
        </h3>
        {isMobile && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Close reference"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!brew ? (
        <p className="text-sm text-muted-foreground">
          No brews yet for this coffee. This will show your reference brew
          parameters after you log some brews.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Based on:{" "}
            {new Date(brew.brew_date + "T00:00:00").toLocaleDateString(
              undefined,
              { month: "short", day: "numeric" }
            )}{" "}
            brew
          </p>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Input Parameters
            </p>
            <div className="space-y-1 text-sm">
              {brew.coffee_weight != null && (
                <p>Coffee: {brew.coffee_weight}g</p>
              )}
              {brew.ratio != null && <p>Ratio: 1:{brew.ratio}</p>}
              {brew.water_weight != null && (
                <p>Water: {brew.water_weight}g</p>
              )}
              {brew.grind_size != null && <p>Grind: {brew.grind_size}</p>}
              {brew.water_temperature != null && (
                <p>Temp: {brew.water_temperature}C</p>
              )}
              {brew.filter_paper && (
                <p>
                  Filter: {brew.filter_paper.name}
                  {brew.filter_paper.brand
                    ? ` (${brew.filter_paper.brand})`
                    : ""}
                </p>
              )}
              {brew.pours.length > 0 && (
                <p>
                  Pours:{" "}
                  {brew.pours
                    .map((p) => {
                      let s = p.water_amount ? `${p.water_amount}g` : "?"
                      if (p.pour_style) s += ` ${p.pour_style}`
                      if (p.wait_time)
                        s += p.pour_number === 1
                          ? ` (${p.wait_time}s bloom)`
                          : ` (${p.wait_time}s wait)`
                      return s
                    })
                    .join(", ")}
                </p>
              )}
              {brew.total_brew_time != null && (
                <p>Total: {formatBrewTime(brew.total_brew_time)}</p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Outcomes
            </p>
            <div className="space-y-1 text-sm">
              {brew.overall_score != null && (
                <p>Score: {brew.overall_score}/10</p>
              )}
              {brew.tds != null && <p>TDS: {brew.tds}</p>}
              {brew.extraction_yield != null && (
                <p>Extraction: {brew.extraction_yield}%</p>
              )}
            </div>
          </div>

          {brew.improvement_notes && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Improvement Notes
              </p>
              <p className="text-sm italic text-muted-foreground">
                "{brew.improvement_notes}"
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )

  // Mobile: sheet overlay
  if (isMobile) {
    if (!isOpen) return null
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="absolute right-0 top-0 h-full w-80 overflow-y-auto bg-card p-4 shadow-lg">
          {content}
        </div>
      </div>
    )
  }

  // Desktop: collapsible panel
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="flex h-full w-10 flex-col items-center justify-start gap-1 rounded-md border border-border bg-card pt-4 text-xs text-muted-foreground hover:bg-muted"
        aria-label="Open reference sidebar"
      >
        <PanelRightOpen className="h-4 w-4" />
        <span
          className="mt-2"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          Reference
        </span>
      </button>
    )
  }

  return (
    <div className="w-72 shrink-0 overflow-y-auto rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex justify-end">
        <button
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Close reference sidebar"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>
      {content}
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
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

  // Responsive check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

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
      <div className="flex h-full gap-4 p-8" data-testid="brew-form-skeleton">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="mt-4 h-8 w-32" />
          <div className="mt-6 max-w-2xl space-y-6">
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
            <div className="flex justify-end gap-3">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full gap-4 p-8">
      {/* Main form */}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="mt-4 text-2xl font-semibold">
          {isEditing ? "Edit Brew" : "New Brew"}
        </h1>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 max-w-2xl space-y-6"
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

          {/* --- Section 1: Setup --- */}
          <div className="rounded-md border border-border">
            <button
              type="button"
              onClick={() => setSetupOpen(!setupOpen)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                {setupOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Setup
              </div>
              <SectionFillDot fill={setupFill} />
            </button>
            {setupOpen && (
              <div className="space-y-4 border-t border-border px-4 py-4">
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
              </div>
            )}
          </div>

          {/* --- Section 2: Brewing --- */}
          <div className="rounded-md border border-border">
            <button
              type="button"
              onClick={() => setBrewingOpen(!brewingOpen)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                {brewingOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Brewing
              </div>
              <SectionFillDot fill={brewingFill} />
            </button>
            {brewingOpen && (
              <div className="space-y-4 border-t border-border px-4 py-4">
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
              </div>
            )}
          </div>

          {/* --- Section 3: Tasting --- */}
          <div className="rounded-md border border-border">
            <button
              type="button"
              onClick={() => setTastingOpen(!tastingOpen)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                {tastingOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Tasting
              </div>
              <SectionFillDot fill={tastingFill} />
            </button>
            {tastingOpen && (
              <div className="space-y-4 border-t border-border px-4 py-4">
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
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
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
          </div>
        </form>
      </div>

      {/* Reference sidebar (desktop) or trigger button (mobile) */}
      {watchedCoffeeId && (
        <>
          {isMobile && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary-hover"
            >
              <PanelRightOpen className="h-4 w-4" />
              Reference
            </button>
          )}
          <ReferenceSidebar
            reference={reference}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onClose={() => setSidebarOpen(false)}
            isMobile={isMobile}
          />
        </>
      )}
    </div>
  )
}
