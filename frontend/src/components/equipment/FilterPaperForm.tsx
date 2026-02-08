import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, X } from "lucide-react"
import { useEffect, useRef } from "react"
import type { FilterPaper } from "@/api/filterPapers"

const filterPaperSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  brand: z.string().max(100, "Brand is too long").optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
})

type FilterPaperFormData = z.infer<typeof filterPaperSchema>

interface FilterPaperFormProps {
  paper?: FilterPaper | null
  isOpen: boolean
  isSubmitting: boolean
  serverError: string | null
  onSubmit: (data: FilterPaperFormData) => void
  onClose: () => void
}

export type { FilterPaperFormData }

export function FilterPaperForm({
  paper,
  isOpen,
  isSubmitting,
  serverError,
  onSubmit,
  onClose,
}: FilterPaperFormProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FilterPaperFormData>({
    resolver: zodResolver(filterPaperSchema),
  })

  useEffect(() => {
    if (isOpen) {
      reset({
        name: paper?.name ?? "",
        brand: paper?.brand ?? "",
        notes: paper?.notes ?? "",
      })
    }
  }, [isOpen, paper, reset])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isEditing = !!paper

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Edit Filter Paper" : "Add Filter Paper"}
    >
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-card-foreground">
            {isEditing ? "Edit Filter Paper" : "Add Filter Paper"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {serverError && (
            <div className="rounded-md bg-error-muted p-3 text-sm text-error">
              {serverError}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="fp-name"
              className="text-sm font-medium text-foreground"
            >
              Name <span className="text-error">*</span>
            </label>
            <input
              id="fp-name"
              type="text"
              autoFocus
              className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                errors.name ? "border-error" : "border-input"
              }`}
              placeholder="e.g., Abaca"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="fp-brand"
              className="text-sm font-medium text-foreground"
            >
              Brand
            </label>
            <input
              id="fp-brand"
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="e.g., Cafec"
              {...register("brand")}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="fp-notes"
              className="text-sm font-medium text-foreground"
            >
              Notes
            </label>
            <textarea
              id="fp-notes"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Notes about this filter paper..."
              {...register("notes")}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
