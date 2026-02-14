import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/Skeleton"
import { toast } from "sonner"
import { getBrew, type Brew } from "@/api/brews"
import {
  formatBrewDateShort,
  formatRatio,
  formatTemp,
  formatTime,
  formatFilterPaper,
  scoreColor,
} from "@/lib/brew-utils"

// --- Types ---

interface ComparisonRow {
  label: string
  field: string
  section: "setup" | "brewing" | "outcomes" | "notes"
  format: (brew: Brew) => string | null
  isOutcome?: boolean // TDS, EY, score — eligible for "best" highlighting
  isExpandable?: boolean
}

// --- Row definitions ---

const ROWS: ComparisonRow[] = [
  // Setup
  {
    label: "Days Off Roast",
    field: "days_off_roast",
    section: "setup",
    format: (b) => (b.days_off_roast != null ? String(b.days_off_roast) : null),
  },
  {
    label: "Coffee Weight",
    field: "coffee_weight",
    section: "setup",
    format: (b) => (b.coffee_weight != null ? `${b.coffee_weight}g` : null),
  },
  {
    label: "Ratio",
    field: "ratio",
    section: "setup",
    format: (b) => (b.ratio != null ? formatRatio(b.ratio) : null),
  },
  {
    label: "Water Weight",
    field: "water_weight",
    section: "setup",
    format: (b) => (b.water_weight != null ? `${b.water_weight}g` : null),
  },
  {
    label: "Grind Size",
    field: "grind_size",
    section: "setup",
    format: (b) => (b.grind_size != null ? String(b.grind_size) : null),
  },
  {
    label: "Temperature",
    field: "water_temperature",
    section: "setup",
    format: (b) => (b.water_temperature != null ? formatTemp(b.water_temperature) : null),
  },
  {
    label: "Filter Paper",
    field: "filter_paper",
    section: "setup",
    format: (b) => (b.filter_paper ? formatFilterPaper(b) : null),
  },
  // Brewing
  {
    label: "Pours",
    field: "pours",
    section: "brewing",
    format: (b) => (b.pours && b.pours.length > 0 ? String(b.pours.length) : null),
  },
  {
    label: "Total Time",
    field: "total_brew_time",
    section: "brewing",
    format: (b) => (b.total_brew_time != null ? formatTime(b.total_brew_time) : null),
  },
  {
    label: "Technique",
    field: "technique_notes",
    section: "brewing",
    format: (b) => b.technique_notes || null,
    isExpandable: true,
  },
  // Outcomes
  {
    label: "Coffee",
    field: "coffee_ml",
    section: "outcomes",
    format: (b) => (b.coffee_ml != null ? `${b.coffee_ml}ml` : null),
  },
  {
    label: "TDS",
    field: "tds",
    section: "outcomes",
    format: (b) => (b.tds != null ? `${b.tds}%` : null),
    isOutcome: true,
  },
  {
    label: "Extraction Yield",
    field: "extraction_yield",
    section: "outcomes",
    format: (b) => (b.extraction_yield != null ? `${b.extraction_yield}%` : null),
    isOutcome: true,
  },
  {
    label: "Overall Score",
    field: "overall_score",
    section: "outcomes",
    format: (b) => (b.overall_score != null ? `${b.overall_score}/10` : null),
    isOutcome: true,
  },
  {
    label: "Aroma",
    field: "aroma_intensity",
    section: "outcomes",
    format: (b) => (b.aroma_intensity != null ? String(b.aroma_intensity) : null),
  },
  {
    label: "Body",
    field: "body_intensity",
    section: "outcomes",
    format: (b) => (b.body_intensity != null ? String(b.body_intensity) : null),
  },
  {
    label: "Sweetness",
    field: "sweetness_intensity",
    section: "outcomes",
    format: (b) => (b.sweetness_intensity != null ? String(b.sweetness_intensity) : null),
  },
  {
    label: "Brightness",
    field: "brightness_intensity",
    section: "outcomes",
    format: (b) => (b.brightness_intensity != null ? String(b.brightness_intensity) : null),
  },
  {
    label: "Complexity",
    field: "complexity_intensity",
    section: "outcomes",
    format: (b) => (b.complexity_intensity != null ? String(b.complexity_intensity) : null),
  },
  {
    label: "Aftertaste",
    field: "aftertaste_intensity",
    section: "outcomes",
    format: (b) => (b.aftertaste_intensity != null ? String(b.aftertaste_intensity) : null),
  },
  // Notes
  {
    label: "Overall Notes",
    field: "overall_notes",
    section: "notes",
    format: (b) => b.overall_notes || null,
    isExpandable: true,
  },
  {
    label: "Improvement Notes",
    field: "improvement_notes",
    section: "notes",
    format: (b) => b.improvement_notes || null,
    isExpandable: true,
  },
]

const SECTION_LABELS: Record<string, string> = {
  setup: "Setup",
  brewing: "Brewing",
  outcomes: "Outcomes",
  notes: "Notes",
}

// --- Helpers ---

function getNumericValue(brew: Brew, field: string): number | null {
  const val = (brew as unknown as Record<string, unknown>)[field]
  return typeof val === "number" ? val : null
}

function computeHighlights(brews: Brew[], rows: ComparisonRow[]) {
  // For each row, compute: isDiff (values differ) and bestIndex (index of highest for outcome rows)
  const result: { isDiff: boolean; bestIndex: number | null }[] = []

  for (const row of rows) {
    const values = brews.map((b) => row.format(b))
    const nonNull = values.filter((v) => v != null)
    const isDiff = nonNull.length > 1 && new Set(nonNull).size > 1

    let bestIndex: number | null = null
    if (row.isOutcome) {
      let best = -Infinity
      for (let i = 0; i < brews.length; i++) {
        const num = getNumericValue(brews[i], row.field)
        if (num != null && num > best) {
          best = num
          bestIndex = i
        }
      }
      // Only highlight if there are at least 2 non-null values and they differ
      const nums = brews.map((b) => getNumericValue(b, row.field)).filter((n) => n != null)
      if (nums.length < 2 || new Set(nums).size === 1) {
        bestIndex = null
      }
    }

    result.push({ isDiff, bestIndex })
  }

  return result
}

// --- Expandable cell ---

function ExpandableCell({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false)

  if (!text) return <span className="text-muted-foreground">&mdash;</span>

  if (text.length <= 60) return <span>{text}</span>

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="text-left"
    >
      <span className={expanded ? "" : "line-clamp-1"}>{text}</span>
      <span className="ml-1 text-xs text-muted-foreground">
        {expanded ? "(less)" : "(more)"}
      </span>
    </button>
  )
}

// --- Main component ---

export function BrewComparisonPage() {
  const { id: coffeeId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [brews, setBrews] = useState<Brew[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Determine origin for back navigation
  const from = searchParams.get("from")
  const backTo = from === "brews" ? "/brews" : `/coffees/${coffeeId}`
  const backLabel = from === "brews" ? "Back to Brews" : "Back to Coffee"

  // Parse brew IDs
  const brewIds = useMemo(() => {
    const raw = searchParams.get("brews") || ""
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }, [searchParams])

  const fetchBrews = useCallback(async () => {
    if (!coffeeId) return

    if (brewIds.length < 2) {
      toast.info("Select at least 2 brews to compare")
      navigate(`/coffees/${coffeeId}`, { replace: true })
      return
    }

    if (brewIds.length > 4) {
      toast.info("Maximum 4 brews can be compared")
      navigate(`/coffees/${coffeeId}`, { replace: true })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const results = await Promise.all(brewIds.map((id) => getBrew(id)))

      // Validate same coffee
      const mismatch = results.find((b) => b.coffee_id !== coffeeId)
      if (mismatch) {
        toast.error("All brews must belong to the same coffee")
        navigate(backTo, { replace: true })
        return
      }

      setBrews(results)
    } catch {
      toast.error("One or more brews could not be found")
      navigate(backTo, { replace: true })
    } finally {
      setIsLoading(false)
    }
  }, [coffeeId, brewIds, navigate, backTo])

  useEffect(() => {
    fetchBrews()
  }, [fetchBrews])

  const highlights = useMemo(() => computeHighlights(brews, ROWS), [brews])

  // Group rows by section
  const sections = useMemo(() => {
    const grouped: { section: string; rows: { row: ComparisonRow; index: number }[] }[] = []
    let current: { section: string; rows: { row: ComparisonRow; index: number }[] } | null = null

    ROWS.forEach((row, index) => {
      if (!current || current.section !== row.section) {
        current = { section: row.section, rows: [] }
        grouped.push(current)
      }
      current.rows.push({ row, index })
    })

    return grouped
  }, [])

  if (isLoading) {
    return (
      <div className="p-4 sm:p-8" data-testid="comparison-skeleton">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-4 h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-40" />
        <div className="mt-6">
          <Skeleton className="h-[400px] w-full rounded-md" />
        </div>
      </div>
    )
  }

  if (error || brews.length === 0) {
    return null // Redirect already handled in fetchBrews
  }

  const coffeeName = brews[0].coffee_name
  const coffeeRoaster = brews[0].coffee_roaster

  return (
    <div className="p-4 sm:p-8">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          {coffeeName}
          <span className="ml-2 text-lg font-normal text-muted-foreground">
            {coffeeRoaster}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Comparing {brews.length} brews
        </p>
      </div>

      {/* Comparison table */}
      <div className="mt-6 -mx-4 overflow-x-auto sm:mx-0" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="w-full min-w-[480px] text-sm" data-testid="comparison-table">
          {/* Column headers */}
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-card py-2 pl-4 pr-3 text-left font-medium text-muted-foreground sm:pl-0">
                &nbsp;
              </th>
              {brews.map((brew) => (
                <th
                  key={brew.id}
                  className="py-2 px-3 text-left font-medium"
                >
                  <div>{formatBrewDateShort(brew.brew_date)}</div>
                  {brew.days_off_roast != null && (
                    <div className="text-xs font-normal text-muted-foreground">
                      {brew.days_off_roast}d off roast
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map(({ section, rows: sectionRows }) => (
              <SectionGroup key={section}>
                {/* Section header */}
                <tr>
                  <td
                    colSpan={brews.length + 1}
                    className="sticky left-0 z-10 bg-card py-2 pl-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:pl-0"
                  >
                    {SECTION_LABELS[section]}
                  </td>
                </tr>
                {sectionRows.map(({ row, index }) => {
                  const { isDiff, bestIndex } = highlights[index]
                  return (
                    <tr
                      key={row.field}
                      className={isDiff ? "bg-muted/50" : ""}
                      data-diff={isDiff ? "true" : undefined}
                    >
                      <td className="sticky left-0 z-10 bg-inherit py-1.5 pl-4 pr-3 text-muted-foreground sm:pl-0">
                        {row.label}
                      </td>
                      {brews.map((brew, brewIndex) => {
                        const val = row.format(brew)
                        const isBest = bestIndex === brewIndex

                        return (
                          <td
                            key={brew.id}
                            className={`py-1.5 px-3 tabular-nums ${
                              isBest ? "font-bold text-primary" : ""
                            } ${
                              row.field === "overall_score" && val && !isBest
                                ? scoreColor(brew.overall_score!)
                                : ""
                            }`}
                            data-best={isBest ? "true" : undefined}
                          >
                            {row.isExpandable ? (
                              <ExpandableCell text={val} />
                            ) : val != null ? (
                              val
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </SectionGroup>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Fragment wrapper for section groups in tbody
function SectionGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
