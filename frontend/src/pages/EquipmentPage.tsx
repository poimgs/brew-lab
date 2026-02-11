import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/Skeleton"
import { isAxiosError } from "axios"
import { toast } from "sonner"
import {
  listFilterPapers,
  createFilterPaper,
  updateFilterPaper,
  deleteFilterPaper,
  type FilterPaper,
} from "@/api/filterPapers"
import { FilterPaperCard } from "@/components/equipment/FilterPaperCard"
import {
  FilterPaperForm,
  type FilterPaperFormData,
} from "@/components/equipment/FilterPaperForm"

export function EquipmentPage() {
  const [papers, setPapers] = useState<FilterPaper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Form dialog state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPaper, setEditingPaper] = useState<FilterPaper | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Delete confirmation state
  const [deletingPaper, setDeletingPaper] = useState<FilterPaper | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchPapers = useCallback(async () => {
    try {
      setLoadError(null)
      const data = await listFilterPapers(1, 100, "name")
      setPapers(data.items)
    } catch {
      setLoadError("Failed to load filter papers. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPapers()
  }, [fetchPapers])

  const openAddForm = () => {
    setEditingPaper(null)
    setServerError(null)
    setIsFormOpen(true)
  }

  const openEditForm = (paper: FilterPaper) => {
    setEditingPaper(paper)
    setServerError(null)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingPaper(null)
    setServerError(null)
  }

  const handleSubmit = async (data: FilterPaperFormData) => {
    setServerError(null)
    setIsSubmitting(true)

    const payload = {
      name: data.name,
      brand: data.brand || null,
      notes: data.notes || null,
    }

    try {
      if (editingPaper) {
        await updateFilterPaper(editingPaper.id, payload)
        toast.success("Filter paper updated")
      } else {
        await createFilterPaper(payload)
        toast.success("Filter paper added")
      }
      closeForm()
      await fetchPapers()
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setServerError("A filter paper with this name already exists.")
      } else {
        setServerError("Something went wrong. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteConfirm = (paper: FilterPaper) => {
    setDeletingPaper(paper)
  }

  const closeDeleteConfirm = () => {
    setDeletingPaper(null)
  }

  const handleDelete = async () => {
    if (!deletingPaper) return
    setIsDeleting(true)
    try {
      await deleteFilterPaper(deletingPaper.id)
      toast.success("Filter paper deleted")
      closeDeleteConfirm()
      await fetchPapers()
    } catch {
      toast.error("Failed to delete filter paper", { duration: 5000 })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-8" data-testid="equipment-skeleton">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-56" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-4 sm:p-8">
        <h1 className="text-3xl font-semibold">Equipment</h1>
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">{loadError}</p>
          <button
            onClick={() => {
              setIsLoading(true)
              fetchPapers()
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
    <div className="p-4 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold">Equipment</h1>
        <button
          onClick={openAddForm}
          className="flex h-11 sm:h-10 items-center gap-2 rounded-md bg-primary px-4 text-base sm:text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Add Filter Paper
        </button>
      </div>

      <div className="mt-6">
        {papers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-muted-foreground">No filter papers yet.</p>
            <button
              onClick={openAddForm}
              className="mt-2 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Add your first filter paper
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {papers.map((paper) => (
              <FilterPaperCard
                key={paper.id}
                paper={paper}
                onEdit={openEditForm}
                onDelete={openDeleteConfirm}
              />
            ))}
          </div>
        )}
      </div>

      <FilterPaperForm
        paper={editingPaper}
        isOpen={isFormOpen}
        isSubmitting={isSubmitting}
        serverError={serverError}
        onSubmit={handleSubmit}
        onClose={closeForm}
      />

      {/* Delete confirmation dialog */}
      {deletingPaper && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDeleteConfirm()
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Delete filter paper"
        >
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-card-foreground">
              Delete Filter Paper
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingPaper.name}
              </span>
              ? Existing brews referencing this filter will keep the association.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeDeleteConfirm}
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
    </div>
  )
}
