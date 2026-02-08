import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Star, ArrowDown, ArrowUp } from "lucide-react"
import { listBrewsByCoffee, type Brew } from "@/api/brews"
import {
  formatBrewDateShort,
  formatRatio,
  formatTemp,
  scoreColor,
} from "@/lib/brew-utils"

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
  const [brews, setBrews] = useState<Brew[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const sentinelRef = useRef<HTMLDivElement>(null)

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

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
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
              return (
                <tr
                  key={brew.id}
                  className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/50"
                  onClick={() => onRowClick(brew.id)}
                >
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
