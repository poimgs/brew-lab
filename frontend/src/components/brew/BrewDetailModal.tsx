import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, X, Pencil, Star, Trash2, Copy } from "lucide-react"
import { toast } from "sonner"
import { getBrew, type Brew } from "@/api/brews"
import { setReferenceBrew } from "@/api/coffees"
import { DeleteBrewDialog } from "./DeleteBrewDialog"
import { BrewDetailContent } from "./BrewDetailContent"
import { formatBrewDate } from "@/lib/brew-utils"

interface BrewDetailModalProps {
  brewId: string
  /** The coffee's current reference_brew_id, used to show star state */
  referenceBrewId: string | null
  onClose: () => void
  /** Called after a mutation (delete, star) so parent can refresh */
  onMutate: () => void
}

export function BrewDetailModal({
  brewId,
  referenceBrewId,
  onClose,
  onMutate,
}: BrewDetailModalProps) {
  const navigate = useNavigate()
  const [brew, setBrew] = useState<Brew | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isStarring, setIsStarring] = useState(false)
  const [currentRefId, setCurrentRefId] = useState(referenceBrewId)

  const isStarred = currentRefId === brewId

  const fetchBrew = useCallback(async () => {
    try {
      setLoadError(null)
      const data = await getBrew(brewId)
      setBrew(data)
    } catch {
      setLoadError("Failed to load brew details.")
    } finally {
      setIsLoading(false)
    }
  }, [brewId])

  useEffect(() => {
    fetchBrew()
  }, [fetchBrew])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showDeleteDialog) onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose, showDeleteDialog])

  const handleStar = async () => {
    if (!brew) return
    setIsStarring(true)
    try {
      await setReferenceBrew(brew.coffee_id, isStarred ? null : brew.id)
      setCurrentRefId(isStarred ? null : brew.id)
      toast.success(isStarred ? "Reference brew cleared" : "Reference brew set")
      onMutate()
    } catch {
      toast.error("Failed to update reference", { duration: 5000 })
    } finally {
      setIsStarring(false)
    }
  }

  const handleDeleted = () => {
    setShowDeleteDialog(false)
    onClose()
    onMutate()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 sm:px-4 sm:py-8"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Brew detail"
      >
        <div className="flex min-h-screen w-full flex-col bg-card sm:min-h-0 sm:max-w-lg sm:rounded-lg sm:shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-card-foreground">
              Brew Detail
              {brew && ` — ${formatBrewDate(brew.brew_date)}`}
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading && (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {loadError && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{loadError}</p>
                <button
                  onClick={() => {
                    setIsLoading(true)
                    fetchBrew()
                  }}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  Try Again
                </button>
              </div>
            )}

            {brew && !isLoading && !loadError && (
              <>
                {/* Coffee info */}
                <div className="mb-4">
                  <p className="font-medium">
                    {brew.coffee_name} — {brew.coffee_roaster}
                  </p>
                  {brew.days_off_roast != null && (
                    <p className="text-sm text-muted-foreground">
                      Days Off Roast: {brew.days_off_roast}
                    </p>
                  )}
                </div>

                <BrewDetailContent brew={brew} />

                {/* Actions */}
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <button
                    onClick={() => {
                      onClose()
                      navigate(`/brews/${brew.id}/edit`)
                    }}
                    className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onClose()
                      navigate(`/brews/new?from=${brew.id}`)
                    }}
                    className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Brew Again
                  </button>
                  <button
                    onClick={handleStar}
                    disabled={isStarring}
                    className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${isStarred ? "fill-amber-500 text-amber-500" : ""}`}
                    />
                    {isStarred ? "Unstar Reference" : "Star as Reference"}
                  </button>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="flex h-9 items-center gap-1.5 rounded-md border border-error/30 px-3 text-sm font-medium text-error transition-colors hover:bg-error-muted"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showDeleteDialog && brew && (
        <DeleteBrewDialog
          brewId={brew.id}
          coffeeName={brew.coffee_name}
          isStarredReference={isStarred}
          onDeleted={handleDeleted}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}
    </>
  )
}
