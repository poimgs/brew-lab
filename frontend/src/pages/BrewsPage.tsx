import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react"
import { Skeleton } from "@/components/ui/Skeleton"
import { listBrews, type Brew, type BrewListParams } from "@/api/brews"
import { listCoffees, type Coffee } from "@/api/coffees"
import { BrewDetailModal } from "@/components/brew/BrewDetailModal"
import {
  formatBrewDateShort,
  formatRatio,
  scoreColor,
} from "@/lib/brew-utils"

type SortField = "date" | "score"
type SortDir = "desc" | "asc"

export function BrewsPage() {
  const navigate = useNavigate()
  const [brews, setBrews] = useState<Brew[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  // Filters
  const [coffeeId, setCoffeeId] = useState<string>("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [scoreGte, setScoreGte] = useState("")
  const [scoreLte, setScoreLte] = useState("")

  // Coffee list for filter dropdown
  const [coffees, setCoffees] = useState<Coffee[]>([])

  // Detail modal
  const [selectedBrewId, setSelectedBrewId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const hasFetched = useRef(false)

  // Load coffees for the filter dropdown
  useEffect(() => {
    listCoffees({ per_page: 100 })
      .then((data) => setCoffees(data.items))
      .catch(() => {})
  }, [])

  const sortParam =
    sortField === "date"
      ? sortDir === "desc"
        ? "-brew_date"
        : "brew_date"
      : sortDir === "desc"
        ? "-overall_score"
        : "overall_score"

  const fetchBrews = useCallback(
    async (pageNum: number) => {
      if (!hasFetched.current) setIsLoading(true)
      setLoadError(null)

      const params: BrewListParams = {
        page: pageNum,
        per_page: 20,
        sort: sortParam,
      }
      if (coffeeId) params.coffee_id = coffeeId
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (scoreGte) params.score_gte = Number(scoreGte)
      if (scoreLte) params.score_lte = Number(scoreLte)

      try {
        const res = await listBrews(params)
        setBrews(res.items)
        setPage(res.pagination.page)
        setTotalPages(res.pagination.total_pages)
      } catch {
        setLoadError("Failed to load brews. Please try again.")
      } finally {
        setIsLoading(false)
        hasFetched.current = true
      }
    },
    [sortParam, coffeeId, dateFrom, dateTo, scoreGte, scoreLte]
  )

  // Fetch on filter/sort changes — reset to page 1
  useEffect(() => {
    fetchBrews(1)
  }, [fetchBrews, refreshKey])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === "desc" ? (
      <ArrowDown className="inline h-3 w-3" />
    ) : (
      <ArrowUp className="inline h-3 w-3" />
    )
  }

  const hasFilters = coffeeId || dateFrom || dateTo || scoreGte || scoreLte

  const clearFilters = () => {
    setCoffeeId("")
    setDateFrom("")
    setDateTo("")
    setScoreGte("")
    setScoreLte("")
  }

  const handleModalMutate = () => {
    setRefreshKey((k) => k + 1)
  }

  if (isLoading) {
    return (
      <div className="p-8" data-testid="brews-skeleton">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-20" />
          <button
            onClick={() => navigate("/brews/new")}
            className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Log a Brew
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
        <div className="mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left"><Skeleton className="h-4 w-10" /></th>
                <th className="pb-2 text-left"><Skeleton className="h-4 w-12" /></th>
                <th className="pb-2 text-left"><Skeleton className="h-4 w-10" /></th>
                <th className="pb-2 text-left"><Skeleton className="h-4 w-10" /></th>
                <th className="hidden pb-2 text-left sm:table-cell"><Skeleton className="h-4 w-10" /></th>
                <th className="hidden pb-2 text-left md:table-cell"><Skeleton className="h-4 w-10" /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2"><Skeleton className="h-4 w-16" /></td>
                  <td className="py-2"><Skeleton className="h-4 w-36" /></td>
                  <td className="py-2"><Skeleton className="h-4 w-10" /></td>
                  <td className="py-2"><Skeleton className="h-4 w-12" /></td>
                  <td className="hidden py-2 sm:table-cell"><Skeleton className="h-4 w-8" /></td>
                  <td className="hidden py-2 md:table-cell"><Skeleton className="h-4 w-10" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Brews</h1>
          <button
            onClick={() => navigate("/brews/new")}
            className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Log a Brew
          </button>
        </div>
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">{loadError}</p>
          <button
            onClick={() => {
              setIsLoading(true)
              hasFetched.current = false
              fetchBrews(1)
            }}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Brews</h1>
        <button
          onClick={() => navigate("/brews/new")}
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Log a Brew
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {/* Coffee filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="coffee-filter" className="text-xs text-muted-foreground">
            Coffee
          </label>
          <select
            id="coffee-filter"
            value={coffeeId}
            onChange={(e) => setCoffeeId(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All coffees</option>
            {coffees.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.roaster}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="flex flex-col gap-1">
          <label htmlFor="date-from" className="text-xs text-muted-foreground">
            From
          </label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="date-to" className="text-xs text-muted-foreground">
            To
          </label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Score range */}
        <div className="flex flex-col gap-1">
          <label htmlFor="score-gte" className="text-xs text-muted-foreground">
            Min Score
          </label>
          <input
            id="score-gte"
            type="number"
            min={1}
            max={10}
            value={scoreGte}
            onChange={(e) => setScoreGte(e.target.value)}
            placeholder="1"
            className="flex h-10 w-20 rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="score-lte" className="text-xs text-muted-foreground">
            Max Score
          </label>
          <input
            id="score-lte"
            type="number"
            min={1}
            max={10}
            value={scoreLte}
            onChange={(e) => setScoreLte(e.target.value)}
            placeholder="10"
            className="flex h-10 w-20 rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex h-10 items-center gap-1.5 self-end rounded-md border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {brews.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? "No brews match your filters."
              : "No brews recorded yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th
                    className="cursor-pointer pb-2 font-medium select-none"
                    onClick={() => toggleSort("date")}
                  >
                    Date <SortIcon field="date" />
                  </th>
                  <th className="pb-2 font-medium">Coffee</th>
                  <th
                    className="cursor-pointer pb-2 font-medium select-none"
                    onClick={() => toggleSort("score")}
                  >
                    Score <SortIcon field="score" />
                  </th>
                  <th className="pb-2 font-medium">Ratio</th>
                  <th className="hidden pb-2 font-medium sm:table-cell">Grind</th>
                  <th className="hidden pb-2 font-medium md:table-cell">Temp</th>
                </tr>
              </thead>
              <tbody>
                {brews.map((brew) => (
                  <tr
                    key={brew.id}
                    className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedBrewId(brew.id)}
                  >
                    <td className="py-2 font-medium tabular-nums">
                      {formatBrewDateShort(brew.brew_date)}
                    </td>
                    <td className="py-2">
                      <span className="font-medium">{brew.coffee_name}</span>
                      <span className="ml-1 text-muted-foreground">
                        ({brew.coffee_roaster})
                      </span>
                    </td>
                    <td className="py-2 tabular-nums">
                      {brew.overall_score != null ? (
                        <span className={scoreColor(brew.overall_score)}>
                          {brew.overall_score}/10
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 tabular-nums">
                      {formatRatio(brew.ratio)}
                    </td>
                    <td className="hidden py-2 tabular-nums sm:table-cell">
                      {brew.grind_size != null ? brew.grind_size : "—"}
                    </td>
                    <td className="hidden py-2 tabular-nums md:table-cell">
                      {brew.water_temperature != null
                        ? `${brew.water_temperature}°C`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                disabled={page <= 1}
                onClick={() => fetchBrews(page - 1)}
                className="flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchBrews(page + 1)}
                className="flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Brew detail modal */}
      {selectedBrewId && (
        <BrewDetailModal
          brewId={selectedBrewId}
          referenceBrewId={null}
          onClose={() => setSelectedBrewId(null)}
          onMutate={handleModalMutate}
        />
      )}
    </div>
  )
}
