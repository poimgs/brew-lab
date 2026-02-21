import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, X } from "lucide-react"
import { useEffect, useRef } from "react"
import type { Dripper } from "@/api/drippers"

const dripperSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  brand: z.string().max(100, "Brand is too long").optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
})

type DripperFormData = z.infer<typeof dripperSchema>

interface DripperFormProps {
  dripper?: Dripper | null
  isOpen: boolean
  isSubmitting: boolean
  serverError: string | null
  onSubmit: (data: DripperFormData) => void
  onClose: () => void
}

export type { DripperFormData }

export function DripperForm({
  dripper,
  isOpen,
  isSubmitting,
  serverError,
  onSubmit,
  onClose,
}: DripperFormProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DripperFormData>({
    resolver: zodResolver(dripperSchema),
  })

  useEffect(() => {
    if (isOpen) {
      reset({
        name: dripper?.name ?? "",
        brand: dripper?.brand ?? "",
        notes: dripper?.notes ?? "",
      })
    }
  }, [isOpen, dripper, reset])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isEditing = !!dripper

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 sm:px-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Edit Dripper" : "Add Dripper"}
    >
      <div className="flex h-screen w-full flex-col bg-card p-6 sm:h-auto sm:max-w-md sm:rounded-lg sm:shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-card-foreground">
            {isEditing ? "Edit Dripper" : "Add Dripper"}
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
              htmlFor="dripper-name"
              className="text-sm font-medium text-foreground"
            >
              Name <span className="text-error">*</span>
            </label>
            <input
              id="dripper-name"
              type="text"
              autoFocus
              className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                errors.name ? "border-error" : "border-input"
              }`}
              placeholder="e.g., Hario V60 02"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="dripper-brand"
              className="text-sm font-medium text-foreground"
            >
              Brand
            </label>
            <input
              id="dripper-brand"
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="e.g., Hario"
              {...register("brand")}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="dripper-notes"
              className="text-sm font-medium text-foreground"
            >
              Notes
            </label>
            <textarea
              id="dripper-notes"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Notes about this dripper..."
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
