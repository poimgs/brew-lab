import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Plus, Pencil, Copy } from "lucide-react"
import { Skeleton } from "@/components/ui/Skeleton"
import { getRecentBrews, type Brew } from "@/api/brews"
import { BrewDetailModal } from "@/components/brew/BrewDetailModal"
import {
  formatBrewDateShort,
  formatRatio,
  scoreColor,
} from "@/lib/brew-utils"

export function HomePage() {
  const navigate = useNavigate()
  const [brews, setBrews] = useState<Brew[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedBrewId, setSelectedBrewId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchRecent = useCallback(async () => {
    setLoadError(null)
    try {
      const data = await getRecentBrews(5)
      setBrews(data.items)
    } catch {
      setLoadError("Failed to load recent brews.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecent()
  }, [fetchRecent, refreshKey])

  const handleModalMutate = () => {
    setRefreshKey((k) => k + 1)
  }

  if (isLoading) {
    return (
      <div className="p-8" data-testid="home-skeleton">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-24" />
          <button
            onClick={() => navigate("/brews/new")}
            className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Log a Brew
          </button>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="mt-3 divide-y divide-border rounded-lg border border-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="h-7 w-7 rounded-md" />
                  <Skeleton className="h-7 w-7 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Home</h1>
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
              fetchRecent()
            }}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Empty state — no brews at all
  if (brews.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Home</h1>
          <button
            onClick={() => navigate("/brews/new")}
            className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Log a Brew
          </button>
        </div>
        <div className="mt-12 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-lg text-muted-foreground">
            Add your first coffee to get started
          </p>
          <Link
            to="/coffees"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Go to Coffees
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Home</h1>
        <button
          onClick={() => navigate("/brews/new")}
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Log a Brew
        </button>
      </div>

      {/* Recent Brews */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Brews</h2>
          <Link
            to="/brews"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all brews &rarr;
          </Link>
        </div>

        <div className="mt-3 divide-y divide-border rounded-lg border border-border">
          {brews.map((brew) => (
            <div
              key={brew.id}
              className="flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setSelectedBrewId(brew.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setSelectedBrewId(brew.id)
                }
              }}
            >
              {/* Row content */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium tabular-nums text-muted-foreground whitespace-nowrap">
                  {formatBrewDateShort(brew.brew_date)}
                </span>
                <span className="text-sm truncate">
                  <span className="font-medium">{brew.coffee_name}</span>
                  <span className="text-muted-foreground">
                    {" "}({brew.coffee_roaster})
                  </span>
                </span>
                {brew.overall_score != null && (
                  <span
                    className={`text-sm font-medium tabular-nums whitespace-nowrap ${scoreColor(brew.overall_score)}`}
                  >
                    {brew.overall_score}/10
                  </span>
                )}
                {brew.ratio != null && (
                  <span className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                    {formatRatio(brew.ratio)}
                  </span>
                )}
              </div>

              {/* Row actions */}
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/brews/${brew.id}/edit`)
                  }}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={`Edit brew from ${formatBrewDateShort(brew.brew_date)}`}
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/brews/new?from=${brew.id}`)
                  }}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={`Brew again from ${formatBrewDateShort(brew.brew_date)}`}
                  title="Brew Again"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
