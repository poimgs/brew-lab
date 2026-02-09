import { useCallback, useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  Loader2,
  ArrowLeft,
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react"
import { Skeleton } from "@/components/ui/Skeleton"
import { toast } from "sonner"
import {
  getCoffee,
  updateCoffee,
  deleteCoffee,
  archiveCoffee,
  unarchiveCoffee,
  setReferenceBrew,
  type Coffee,
} from "@/api/coffees"
import {
  getReference,
  listBrewsByCoffee,
  type Brew,
  type ReferenceResponse,
} from "@/api/brews"
import { CoffeeForm, type CoffeeFormData } from "@/components/coffees/CoffeeForm"
import { ReferenceBrewSection } from "@/components/coffees/ReferenceBrewSection"
import { BrewHistoryTable } from "@/components/coffees/BrewHistoryTable"
import { ChangeReferenceDialog } from "@/components/coffees/ChangeReferenceDialog"
import { BrewDetailModal } from "@/components/brew/BrewDetailModal"

export function CoffeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [coffee, setCoffee] = useState<Coffee | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Edit form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Reference brew state
  const [reference, setReference] = useState<ReferenceResponse | null>(null)
  const [isStarring, setIsStarring] = useState(false)

  // Change reference dialog state
  const [showChangeRef, setShowChangeRef] = useState(false)
  const [changeRefBrews, setChangeRefBrews] = useState<Brew[]>([])
  const [isLoadingChangeRef, setIsLoadingChangeRef] = useState(false)

  // Brew detail modal state
  const [detailBrewId, setDetailBrewId] = useState<string | null>(null)

  // Refresh key — increment to trigger BrewHistoryTable refetch
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchCoffee = useCallback(async () => {
    if (!id) return
    try {
      setLoadError(null)
      const data = await getCoffee(id)
      setCoffee(data)
    } catch {
      setLoadError("Failed to load coffee. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [id])

  const fetchReference = useCallback(async () => {
    if (!id) return
    try {
      const data = await getReference(id)
      setReference(data)
    } catch {
      // Silent fail — reference section shows empty state
      setReference(null)
    }
  }, [id])

  useEffect(() => {
    fetchCoffee()
    fetchReference()
  }, [fetchCoffee, fetchReference])

  const handleEdit = async (data: CoffeeFormData) => {
    if (!id) return
    setServerError(null)
    setIsSubmitting(true)

    const payload = {
      roaster: data.roaster,
      name: data.name,
      country: data.country || null,
      region: data.region || null,
      farm: data.farm || null,
      varietal: data.varietal || null,
      elevation: data.elevation || null,
      process: data.process || null,
      roast_level: data.roast_level || null,
      tasting_notes: data.tasting_notes || null,
      roast_date: data.roast_date || null,
      notes: data.notes || null,
    }

    try {
      await updateCoffee(id, payload)
      toast.success("Coffee updated")
      setIsFormOpen(false)
      await fetchCoffee()
    } catch {
      setServerError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchiveToggle = async () => {
    if (!coffee || !id) return
    try {
      if (coffee.archived_at) {
        const updated = await unarchiveCoffee(id)
        setCoffee(updated)
        toast.success("Coffee unarchived")
      } else {
        const updated = await archiveCoffee(id)
        setCoffee(updated)
        toast.success("Coffee archived")
      }
    } catch {
      toast.error("Action failed. Please try again.", { duration: 5000 })
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setIsDeleting(true)
    try {
      await deleteCoffee(id)
      toast.success("Coffee deleted")
      navigate("/coffees")
    } catch {
      toast.error("Failed to delete coffee", { duration: 5000 })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleStar = async (brewId?: string) => {
    if (!coffee || !id) return
    const targetBrewId = brewId ?? reference?.brew?.id
    if (!targetBrewId) return

    setIsStarring(true)
    try {
      const isCurrentlyStarred = coffee.reference_brew_id === targetBrewId
      const updated = await setReferenceBrew(id, isCurrentlyStarred ? null : targetBrewId)
      setCoffee(updated)
      await fetchReference()
      setRefreshKey((k) => k + 1)
      toast.success(isCurrentlyStarred ? "Reference brew cleared" : "Reference brew set")
    } catch {
      toast.error("Failed to update reference", { duration: 5000 })
    } finally {
      setIsStarring(false)
    }
  }

  const handleOpenChangeRef = async () => {
    if (!id) return
    setShowChangeRef(true)
    setIsLoadingChangeRef(true)
    try {
      const res = await listBrewsByCoffee(id, { per_page: 100, sort: "-brew_date" })
      setChangeRefBrews(res.items)
    } catch {
      setChangeRefBrews([])
    } finally {
      setIsLoadingChangeRef(false)
    }
  }

  const handleSelectReference = async (brewId: string | null) => {
    if (!id) return
    setIsStarring(true)
    try {
      const updated = await setReferenceBrew(id, brewId)
      setCoffee(updated)
      await fetchReference()
      setRefreshKey((k) => k + 1)
      setShowChangeRef(false)
      toast.success(brewId ? "Reference brew changed" : "Reference brew cleared")
    } catch {
      toast.error("Failed to update reference", { duration: 5000 })
    } finally {
      setIsStarring(false)
    }
  }

  const handleBrewMutate = () => {
    // Refresh everything after brew delete or star change from modal
    fetchCoffee()
    fetchReference()
    setRefreshKey((k) => k + 1)
  }

  if (isLoading) {
    return (
      <div className="p-8" data-testid="coffee-detail-skeleton">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-5 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="mt-6 flex gap-6">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
        <div className="mt-8 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>
        <div className="mt-6 space-y-2">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loadError || !coffee) {
    return (
      <div className="p-8">
        <Link
          to="/coffees"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Coffees
        </Link>
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            {loadError || "Coffee not found."}
          </p>
          {loadError && (
            <button
              onClick={() => {
                setIsLoading(true)
                fetchCoffee()
              }}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  const subtitle = [coffee.roaster, coffee.country, coffee.region, coffee.farm, coffee.process]
    .filter(Boolean)
    .join(" \u2022 ")

  return (
    <div className="p-8">
      <Link
        to="/coffees"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Coffees
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold">{coffee.name}</h1>
            {coffee.archived_at && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <Archive className="h-3 w-3" />
                Archived
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            onClick={() => navigate(`/brews/new?coffee_id=${coffee.id}`)}
            className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            aria-label="New brew"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Brew</span>
            <span className="sm:hidden">Brew</span>
          </button>
          <button
            onClick={() => {
              setServerError(null)
              setIsFormOpen(true)
            }}
            className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            aria-label="Edit coffee"
          >
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={handleArchiveToggle}
            className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            aria-label={coffee.archived_at ? "Unarchive coffee" : "Archive coffee"}
          >
            {coffee.archived_at ? (
              <>
                <ArchiveRestore className="h-4 w-4" />
                <span className="hidden sm:inline">Unarchive</span>
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                <span className="hidden sm:inline">Archive</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex h-10 items-center gap-2 rounded-md border border-error/30 px-3 text-sm font-medium text-error transition-colors hover:bg-error-muted"
            aria-label="Delete coffee"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-6 flex gap-6">
        {coffee.roast_date && (
          <div>
            <p className="text-xs text-muted-foreground">Latest Roast</p>
            <p className="text-sm font-medium tabular-nums">
              {new Date(coffee.roast_date + "T00:00:00").toLocaleDateString(
                undefined,
                { month: "short", day: "numeric", year: "numeric" }
              )}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">Brews</p>
          <p className="text-sm font-medium tabular-nums">
            {coffee.brew_count}
          </p>
        </div>
        {coffee.last_brewed && (
          <div>
            <p className="text-xs text-muted-foreground">Last Brewed</p>
            <p className="text-sm font-medium tabular-nums">
              {new Date(coffee.last_brewed).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        )}
      </div>

      {/* Tasting notes */}
      {coffee.tasting_notes && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Tasting Notes
          </h3>
          <p className="mt-1 text-sm">{coffee.tasting_notes}</p>
        </div>
      )}

      {/* Personal notes */}
      {coffee.notes && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            My Notes
          </h3>
          <p className="mt-1 text-sm">{coffee.notes}</p>
        </div>
      )}

      {/* Reference Brew section */}
      <ReferenceBrewSection
        brew={reference?.brew ?? null}
        source={reference?.source ?? "latest"}
        isStarred={coffee.reference_brew_id != null && coffee.reference_brew_id === reference?.brew?.id}
        isStarring={isStarring}
        onToggleStar={() => handleToggleStar()}
        onChangeReference={handleOpenChangeRef}
      />

      {/* Brew History section */}
      <BrewHistoryTable
        coffeeId={coffee.id}
        referenceBrewId={coffee.reference_brew_id}
        refreshKey={refreshKey}
        onStarBrew={(brewId) => handleToggleStar(brewId)}
        onRowClick={(brewId) => setDetailBrewId(brewId)}
        isStarring={isStarring}
      />

      {/* Edit form */}
      <CoffeeForm
        coffee={coffee}
        isOpen={isFormOpen}
        isSubmitting={isSubmitting}
        serverError={serverError}
        onSubmit={handleEdit}
        onClose={() => {
          setIsFormOpen(false)
          setServerError(null)
        }}
      />

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteConfirm(false)
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Delete coffee"
        >
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-card-foreground">
              Delete Coffee
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {coffee.name}
              </span>{" "}
              by{" "}
              <span className="font-medium text-foreground">
                {coffee.roaster}
              </span>
              ? This will permanently delete the coffee and all its brews. This
              action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex h-10 items-center rounded-md bg-error px-4 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change reference dialog */}
      {showChangeRef && (
        <ChangeReferenceDialog
          brews={changeRefBrews}
          isLoading={isLoadingChangeRef}
          currentReferenceBrewId={coffee.reference_brew_id}
          onSelect={handleSelectReference}
          onClose={() => setShowChangeRef(false)}
        />
      )}

      {/* Brew detail modal */}
      {detailBrewId && (
        <BrewDetailModal
          brewId={detailBrewId}
          referenceBrewId={coffee.reference_brew_id}
          onClose={() => setDetailBrewId(null)}
          onMutate={handleBrewMutate}
        />
      )}
    </div>
  )
}
