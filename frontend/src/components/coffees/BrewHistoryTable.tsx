import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Star, ArrowDown, ArrowUp, GitCompareArrows } from "lucide-react"
import { listBrewsByCoffee, type Brew } from "@/api/brews"
import {
  formatBrewDateShort,
  formatRatio,
  formatTemp,
  scoreColor,
} from "@/lib/brew-utils"

const MAX_COMPARE = 4

type SortField = "date" | "score"
type SortDir = "desc" | "asc"

interface BrewHistoryTableProps {
  coffeeId: string
  referenceBrewId: string | null
  /** Increment to trigger a refetch */
  refreshKey: number
  onStarBrew: (brewId: string) => void
  onRowClick: (brewId: string) => void
  isStarring: boolean
}

export function BrewHistoryTable({
  coffeeId,
  referenceBrewId,
  refreshKey,
  onStarBrew,
  onRowClick,
  isStarring,
}: BrewHistoryTableProps) {
  const navigate = useNavigate()
  const [brews, setBrews] = useState<Brew[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [selectedBrewIds, setSelectedBrewIds] = useState<string[]>([])
  const sentinelRef = useRef<HTMLDivElement>(null)

  const toggleSelection = (brewId: string) => {
    setSelectedBrewIds((prev) =>
      prev.includes(brewId)
        ? prev.filter((id) => id !== brewId)
        : prev.length < MAX_COMPARE
          ? [...prev, brewId]
          : prev
    )
  }

  const handleCompare = () => {
    if (selectedBrewIds.length < 2) return
    navigate(
      `/coffees/${coffeeId}/compare?brews=${selectedBrewIds.join(",")}`
    )
  }

  const sortParam =
    sortField === "date"
      ? sortDir === "desc"
        ? "-brew_date"
        : "brew_date"
      : sortDir === "desc"
        ? "-overall_score"
        : "overall_score"

  const fetchBrews = useCallback(
    async (pageNum: number, append: boolean) => {
      if (pageNum === 1) setIsLoading(true)
      else setIsLoadingMore(true)

      try {
        const res = await listBrewsByCoffee(coffeeId, {
          page: pageNum,
          per_page: 20,
          sort: sortParam,
        })
        setBrews((prev) => (append ? [...prev, ...res.items] : res.items))
        setHasMore(res.pagination.page < res.pagination.total_pages)
        setPage(pageNum)
      } catch {
        // Silent fail — table stays in current state
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [coffeeId, sortParam]
  )

  // Reset and fetch on sort change or external refresh
  useEffect(() => {
    fetchBrews(1, false)
  }, [fetchBrews, refreshKey])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMore) {
          fetchBrews(page + 1, true)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, page, fetchBrews])

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

  if (isLoading) {
    return (
      <div className="mt-8 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">Brew History</h2>
        <div className="mt-4 flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (brews.length === 0) {
    return (
      <div className="mt-8 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">Brew History</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No brews recorded for this coffee yet.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h2 className="text-lg font-semibold">Brew History</h2>

      {selectedBrewIds.length > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-muted/50 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {selectedBrewIds.length} selected
          </span>
          <button
            onClick={handleCompare}
            disabled={selectedBrewIds.length < 2}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
            Compare
          </button>
          <button
            onClick={() => setSelectedBrewIds([])}
            className="ml-auto text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="w-8 pb-2" aria-label="Select for comparison" />
              <th className="w-8 pb-2" />
              <th
                className="cursor-pointer pb-2 font-medium select-none"
                onClick={() => toggleSort("date")}
              >
                Date <SortIcon field="date" />
              </th>
              <th
                className="cursor-pointer pb-2 font-medium select-none"
                onClick={() => toggleSort("score")}
              >
                Score <SortIcon field="score" />
              </th>
              <th className="pb-2 font-medium">Ratio</th>
              <th className="pb-2 font-medium">Temp</th>
              <th className="pb-2 font-medium">Filter</th>
            </tr>
          </thead>
          <tbody>
            {brews.map((brew) => {
              const isStar = referenceBrewId === brew.id
              const isSelected = selectedBrewIds.includes(brew.id)
              const atMax =
                selectedBrewIds.length >= MAX_COMPARE && !isSelected
              return (
                <tr
                  key={brew.id}
                  className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/50"
                  onClick={() => onRowClick(brew.id)}
                >
                  <td className="py-2 pr-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={atMax}
                      title={atMax ? "Maximum 4 brews can be compared" : undefined}
                      onChange={() => toggleSelection(brew.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-input bg-background checked:border-primary checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label={`Select brew from ${formatBrewDateShort(brew.brew_date)} for comparison`}
                    />
                  </td>
                  <td className="py-2 pr-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onStarBrew(brew.id)
                      }}
                      disabled={isStarring}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:text-amber-500 disabled:opacity-50"
                      aria-label={isStar ? "Unstar reference" : "Star as reference"}
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${isStar ? "fill-amber-500 text-amber-500" : ""}`}
                      />
                    </button>
                  </td>
                  <td className="py-2 font-medium tabular-nums">
                    {formatBrewDateShort(brew.brew_date)}
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
                  <td className="py-2 tabular-nums">
                    {formatTemp(brew.water_temperature)}
                  </td>
                  <td className="py-2">
                    {brew.filter_paper?.name ?? "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isLoadingMore && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  )
}
