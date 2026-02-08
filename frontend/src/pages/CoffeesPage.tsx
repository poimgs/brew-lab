import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, Search } from "lucide-react"
import { Skeleton } from "@/components/ui/Skeleton"
import { toast } from "sonner"
import {
  listCoffees,
  createCoffee,
  type Coffee,
} from "@/api/coffees"
import { CoffeeCard } from "@/components/coffees/CoffeeCard"
import { CoffeeForm, type CoffeeFormData } from "@/components/coffees/CoffeeForm"

export function CoffeesPage() {
  const [coffees, setCoffees] = useState<Coffee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [archivedOnly, setArchivedOnly] = useState(false)
  const hasFetched = useRef(false)

  // Form dialog state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const fetchCoffees = useCallback(async () => {
    try {
      setLoadError(null)
      const data = await listCoffees({
        per_page: 100,
        search: search || undefined,
        archived_only: archivedOnly || undefined,
      })
      setCoffees(data.items)
    } catch {
      setLoadError("Failed to load coffees. Please try again.")
    } finally {
      setIsLoading(false)
      hasFetched.current = true
    }
  }, [search, archivedOnly])

  useEffect(() => {
    if (!hasFetched.current) {
      // Initial load — show spinner
      setIsLoading(true)
    }
    fetchCoffees()
  }, [fetchCoffees])

  const openAddForm = () => {
    setServerError(null)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setServerError(null)
  }

  const handleSubmit = async (data: CoffeeFormData) => {
    setServerError(null)
    setIsSubmitting(true)

    const payload = {
      roaster: data.roaster,
      name: data.name,
      country: data.country || null,
      farm: data.farm || null,
      process: data.process || null,
      roast_level: data.roast_level || null,
      tasting_notes: data.tasting_notes || null,
      roast_date: data.roast_date || null,
      notes: data.notes || null,
    }

    try {
      await createCoffee(payload)
      toast.success("Coffee added")
      closeForm()
      await fetchCoffees()
    } catch {
      setServerError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8" data-testid="coffees-skeleton">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-semibold">Coffees</h1>
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">{loadError}</p>
          <button
            onClick={() => {
              setIsLoading(true)
              fetchCoffees()
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
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold">Coffees</h1>
        <button
          onClick={openAddForm}
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Add Coffee
        </button>
      </div>

      {/* Search + Filter row */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search coffees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={archivedOnly}
            onChange={(e) => setArchivedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Show Archived
        </label>
      </div>

      {/* Grid */}
      <div className="mt-6">
        {coffees.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-muted-foreground">
              {archivedOnly
                ? "No archived coffees."
                : "No coffees in your library yet"}
            </p>
            {!archivedOnly && (
              <button
                onClick={openAddForm}
                className="mt-2 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
              >
                Add Your First Coffee
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coffees.map((coffee) => (
              <CoffeeCard key={coffee.id} coffee={coffee} />
            ))}
          </div>
        )}
      </div>

      <CoffeeForm
        isOpen={isFormOpen}
        isSubmitting={isSubmitting}
        serverError={serverError}
        onSubmit={handleSubmit}
        onClose={closeForm}
      />
    </div>
  )
}
