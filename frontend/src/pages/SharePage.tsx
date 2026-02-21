import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { Coffee } from "lucide-react"
import { Skeleton } from "@/components/ui/Skeleton"
import { getSharedCoffees, type ShareCoffee } from "@/api/shareLink"
import { ShareCoffeeCard } from "@/components/share/ShareCoffeeCard"

export function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [coffees, setCoffees] = useState<ShareCoffee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isNotFound, setIsNotFound] = useState(false)
  const hasFetched = useRef(false)

  const fetchCoffees = useCallback(async () => {
    if (!token) return
    try {
      setError(null)
      setIsNotFound(false)
      const data = await getSharedCoffees(token)
      setCoffees(data.items)
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 404) {
        setIsNotFound(true)
      } else {
        setError("Something went wrong. Please try again.")
      }
    } finally {
      setIsLoading(false)
      hasFetched.current = true
    }
  }, [token])

  useEffect(() => {
    if (!hasFetched.current) {
      fetchCoffees()
    }
  }, [fetchCoffees])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <Coffee className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold text-card-foreground">
            Coffee Collection
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        )}

        {isNotFound && (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">
              This share link is no longer active.
            </p>
          </div>
        )}

        {error && (
          <div className="py-16 text-center">
            <p className="mb-4 text-muted-foreground">{error}</p>
            <button
              onClick={() => {
                setIsLoading(true)
                fetchCoffees()
              }}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !isNotFound && !error && coffees.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">
              No coffees to show.
            </p>
          </div>
        )}

        {!isLoading && !isNotFound && !error && coffees.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coffees.map((coffee, i) => (
              <ShareCoffeeCard key={i} coffee={coffee} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
