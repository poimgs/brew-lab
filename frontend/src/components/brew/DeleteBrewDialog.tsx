import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { deleteBrew } from "@/api/brews"

interface DeleteBrewDialogProps {
  brewId: string
  coffeeName?: string
  isStarredReference?: boolean
  onDeleted: () => void
  onClose: () => void
}

export function DeleteBrewDialog({
  brewId,
  coffeeName,
  isStarredReference,
  onDeleted,
  onClose,
}: DeleteBrewDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteBrew(brewId)
      toast.success("Brew deleted")
      onDeleted()
    } catch {
      toast.error("Failed to delete brew", { duration: 5000 })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Delete brew"
    >
      <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-card-foreground">
          Delete Brew
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isStarredReference && coffeeName
            ? `This is your starred reference brew for ${coffeeName}. Deleting it will clear the reference. Continue?`
            : "Are you sure you want to delete this brew? This action cannot be undone."}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
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
  )
}
