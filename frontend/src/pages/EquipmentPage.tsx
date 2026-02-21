import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
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
import {
  listDrippers,
  createDripper,
  updateDripper,
  deleteDripper,
  type Dripper,
} from "@/api/drippers"
import { FilterPaperCard } from "@/components/equipment/FilterPaperCard"
import {
  FilterPaperForm,
  type FilterPaperFormData,
} from "@/components/equipment/FilterPaperForm"
import { DripperCard } from "@/components/equipment/DripperCard"
import {
  DripperForm,
  type DripperFormData,
} from "@/components/equipment/DripperForm"

type Tab = "filter-papers" | "drippers"

export function EquipmentPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get("tab") as Tab) || "filter-papers"

  const setActiveTab = (tab: Tab) => {
    setSearchParams({ tab }, { replace: true })
  }

  // Filter papers state
  const [papers, setPapers] = useState<FilterPaper[]>([])
  const [isPapersLoading, setIsPapersLoading] = useState(true)
  const [papersError, setPapersError] = useState<string | null>(null)
  const [isPaperFormOpen, setIsPaperFormOpen] = useState(false)
  const [editingPaper, setEditingPaper] = useState<FilterPaper | null>(null)
  const [isPaperSubmitting, setIsPaperSubmitting] = useState(false)
  const [paperServerError, setPaperServerError] = useState<string | null>(null)
  const [deletingPaper, setDeletingPaper] = useState<FilterPaper | null>(null)
  const [isDeletingPaper, setIsDeletingPaper] = useState(false)

  // Drippers state
  const [drippers, setDrippers] = useState<Dripper[]>([])
  const [isDrippersLoading, setIsDrippersLoading] = useState(true)
  const [drippersError, setDrippersError] = useState<string | null>(null)
  const [isDripperFormOpen, setIsDripperFormOpen] = useState(false)
  const [editingDripper, setEditingDripper] = useState<Dripper | null>(null)
  const [isDripperSubmitting, setIsDripperSubmitting] = useState(false)
  const [dripperServerError, setDripperServerError] = useState<string | null>(null)
  const [deletingDripper, setDeletingDripper] = useState<Dripper | null>(null)
  const [isDeletingDripper, setIsDeletingDripper] = useState(false)

  // Fetch filter papers
  const fetchPapers = useCallback(async () => {
    try {
      setPapersError(null)
      const data = await listFilterPapers(1, 100, "name")
      setPapers(data.items)
    } catch {
      setPapersError("Failed to load filter papers. Please try again.")
    } finally {
      setIsPapersLoading(false)
    }
  }, [])

  // Fetch drippers
  const fetchDrippers = useCallback(async () => {
    try {
      setDrippersError(null)
      const data = await listDrippers(1, 100, "name")
      setDrippers(data.items)
    } catch {
      setDrippersError("Failed to load drippers. Please try again.")
    } finally {
      setIsDrippersLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPapers()
    fetchDrippers()
  }, [fetchPapers, fetchDrippers])

  // Filter paper handlers
  const openAddPaperForm = () => {
    setEditingPaper(null)
    setPaperServerError(null)
    setIsPaperFormOpen(true)
  }

  const openEditPaperForm = (paper: FilterPaper) => {
    setEditingPaper(paper)
    setPaperServerError(null)
    setIsPaperFormOpen(true)
  }

  const closePaperForm = () => {
    setIsPaperFormOpen(false)
    setEditingPaper(null)
    setPaperServerError(null)
  }

  const handlePaperSubmit = async (data: FilterPaperFormData) => {
    setPaperServerError(null)
    setIsPaperSubmitting(true)

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
      closePaperForm()
      await fetchPapers()
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setPaperServerError("A filter paper with this name already exists.")
      } else {
        setPaperServerError("Something went wrong. Please try again.")
      }
    } finally {
      setIsPaperSubmitting(false)
    }
  }

  const openDeletePaperConfirm = (paper: FilterPaper) => {
    setDeletingPaper(paper)
  }

  const closeDeletePaperConfirm = () => {
    setDeletingPaper(null)
  }

  const handleDeletePaper = async () => {
    if (!deletingPaper) return
    setIsDeletingPaper(true)
    try {
      await deleteFilterPaper(deletingPaper.id)
      toast.success("Filter paper deleted")
      closeDeletePaperConfirm()
      await fetchPapers()
    } catch {
      toast.error("Failed to delete filter paper", { duration: 5000 })
    } finally {
      setIsDeletingPaper(false)
    }
  }

  // Dripper handlers
  const openAddDripperForm = () => {
    setEditingDripper(null)
    setDripperServerError(null)
    setIsDripperFormOpen(true)
  }

  const openEditDripperForm = (dripper: Dripper) => {
    setEditingDripper(dripper)
    setDripperServerError(null)
    setIsDripperFormOpen(true)
  }

  const closeDripperForm = () => {
    setIsDripperFormOpen(false)
    setEditingDripper(null)
    setDripperServerError(null)
  }

  const handleDripperSubmit = async (data: DripperFormData) => {
    setDripperServerError(null)
    setIsDripperSubmitting(true)

    const payload = {
      name: data.name,
      brand: data.brand || null,
      notes: data.notes || null,
    }

    try {
      if (editingDripper) {
        await updateDripper(editingDripper.id, payload)
        toast.success("Dripper updated")
      } else {
        await createDripper(payload)
        toast.success("Dripper added")
      }
      closeDripperForm()
      await fetchDrippers()
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setDripperServerError("A dripper with this name already exists.")
      } else {
        setDripperServerError("Something went wrong. Please try again.")
      }
    } finally {
      setIsDripperSubmitting(false)
    }
  }

  const openDeleteDripperConfirm = (dripper: Dripper) => {
    setDeletingDripper(dripper)
  }

  const closeDeleteDripperConfirm = () => {
    setDeletingDripper(null)
  }

  const handleDeleteDripper = async () => {
    if (!deletingDripper) return
    setIsDeletingDripper(true)
    try {
      await deleteDripper(deletingDripper.id)
      toast.success("Dripper deleted")
      closeDeleteDripperConfirm()
      await fetchDrippers()
    } catch {
      toast.error("Failed to delete dripper", { duration: 5000 })
    } finally {
      setIsDeletingDripper(false)
    }
  }

  const isLoading = isPapersLoading || isDrippersLoading

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

  const loadError = papersError || drippersError

  if (loadError) {
    return (
      <div className="p-4 sm:p-8">
        <h1 className="text-3xl font-semibold">Equipment</h1>
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">{loadError}</p>
          <button
            onClick={() => {
              setIsPapersLoading(true)
              setIsDrippersLoading(true)
              fetchPapers()
              fetchDrippers()
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
          onClick={activeTab === "filter-papers" ? openAddPaperForm : openAddDripperForm}
          className="flex h-11 sm:h-10 items-center gap-2 rounded-md bg-primary px-4 text-base sm:text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          {activeTab === "filter-papers" ? "Add Filter Paper" : "Add Dripper"}
        </button>
      </div>

      {/* Tab bar */}
      <div className="mt-6 flex border-b border-border">
        <button
          onClick={() => setActiveTab("filter-papers")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "filter-papers"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Filter Papers
        </button>
        <button
          onClick={() => setActiveTab("drippers")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "drippers"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Drippers
        </button>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "filter-papers" && (
          <>
            {papers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-12 text-center">
                <p className="text-muted-foreground">No filter papers yet.</p>
                <button
                  onClick={openAddPaperForm}
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
                    onEdit={openEditPaperForm}
                    onDelete={openDeletePaperConfirm}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "drippers" && (
          <>
            {drippers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-12 text-center">
                <p className="text-muted-foreground">No drippers yet.</p>
                <button
                  onClick={openAddDripperForm}
                  className="mt-2 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
                >
                  Add your first dripper
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {drippers.map((dripper) => (
                  <DripperCard
                    key={dripper.id}
                    dripper={dripper}
                    onEdit={openEditDripperForm}
                    onDelete={openDeleteDripperConfirm}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Filter paper form modal */}
      <FilterPaperForm
        paper={editingPaper}
        isOpen={isPaperFormOpen}
        isSubmitting={isPaperSubmitting}
        serverError={paperServerError}
        onSubmit={handlePaperSubmit}
        onClose={closePaperForm}
      />

      {/* Dripper form modal */}
      <DripperForm
        dripper={editingDripper}
        isOpen={isDripperFormOpen}
        isSubmitting={isDripperSubmitting}
        serverError={dripperServerError}
        onSubmit={handleDripperSubmit}
        onClose={closeDripperForm}
      />

      {/* Delete filter paper confirmation */}
      {deletingPaper && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDeletePaperConfirm()
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
                onClick={closeDeletePaperConfirm}
                className="flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePaper}
                disabled={isDeletingPaper}
                className="flex h-10 items-center rounded-md bg-error px-4 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {isDeletingPaper ? (
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

      {/* Delete dripper confirmation */}
      {deletingDripper && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDeleteDripperConfirm()
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Delete dripper"
        >
          <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-card-foreground">
              Delete Dripper
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingDripper.name}
              </span>
              ? Existing brews referencing this dripper will keep the association.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeDeleteDripperConfirm}
                className="flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDripper}
                disabled={isDeletingDripper}
                className="flex h-10 items-center rounded-md bg-error px-4 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {isDeletingDripper ? (
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
