import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, X, Pencil, Star, Trash2, Copy } from "lucide-react"
import { toast } from "sonner"
import { getBrew, type Brew } from "@/api/brews"
import { setReferenceBrew } from "@/api/coffees"
import { DeleteBrewDialog } from "./DeleteBrewDialog"
import {
  formatBrewDate,
  formatTime,
  formatPours,
  formatRatio,
  formatTemp,
  formatFilterPaper,
  scoreColor,
} from "@/lib/brew-utils"

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

  const isStarred = referenceBrewId === brewId

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

                {/* Setup section */}
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Setup
                  </h3>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
                    {brew.coffee_weight != null && (
                      <div>
                        <span className="text-muted-foreground">Coffee:</span>{" "}
                        <span className="font-medium tabular-nums">{brew.coffee_weight}g</span>
                      </div>
                    )}
                    {brew.ratio != null && (
                      <div>
                        <span className="text-muted-foreground">Ratio:</span>{" "}
                        <span className="font-medium tabular-nums">{formatRatio(brew.ratio)}</span>
                      </div>
                    )}
                    {brew.water_weight != null && (
                      <div>
                        <span className="text-muted-foreground">Water:</span>{" "}
                        <span className="font-medium tabular-nums">{brew.water_weight}g</span>
                      </div>
                    )}
                    {brew.grind_size != null && (
                      <div>
                        <span className="text-muted-foreground">Grind:</span>{" "}
                        <span className="font-medium tabular-nums">{brew.grind_size}</span>
                      </div>
                    )}
                    {brew.water_temperature != null && (
                      <div>
                        <span className="text-muted-foreground">Temp:</span>{" "}
                        <span className="font-medium tabular-nums">{formatTemp(brew.water_temperature)}</span>
                      </div>
                    )}
                    {brew.filter_paper && (
                      <div>
                        <span className="text-muted-foreground">Filter:</span>{" "}
                        <span className="font-medium">{formatFilterPaper(brew)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Brewing section */}
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Brewing
                  </h3>
                  <div className="space-y-1 text-sm">
                    {brew.pours && brew.pours.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Pours:</span>{" "}
                        <span className="font-medium">{formatPours(brew.pours)}</span>
                      </div>
                    )}
                    {brew.total_brew_time != null && (
                      <div>
                        <span className="text-muted-foreground">Total:</span>{" "}
                        <span className="font-medium tabular-nums">{formatTime(brew.total_brew_time)}</span>
                      </div>
                    )}
                    {brew.technique_notes && (
                      <div>
                        <span className="text-muted-foreground">Technique:</span>{" "}
                        <span className="font-medium">{brew.technique_notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tasting section */}
                <div className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Tasting
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex flex-wrap gap-x-4">
                      {brew.coffee_ml != null && (
                        <div>
                          <span className="text-muted-foreground">Coffee:</span>{" "}
                          <span className="font-medium tabular-nums">{brew.coffee_ml}ml</span>
                        </div>
                      )}
                      {brew.tds != null && (
                        <div>
                          <span className="text-muted-foreground">TDS:</span>{" "}
                          <span className="font-medium tabular-nums">{brew.tds}</span>
                        </div>
                      )}
                      {brew.extraction_yield != null && (
                        <div>
                          <span className="text-muted-foreground">Extraction:</span>{" "}
                          <span className="font-medium tabular-nums">{brew.extraction_yield}%</span>
                        </div>
                      )}
                    </div>
                    {brew.overall_score != null && (
                      <div>
                        <span className="text-muted-foreground">Overall:</span>{" "}
                        <span className={`font-medium tabular-nums ${scoreColor(brew.overall_score)}`}>
                          {brew.overall_score}/10
                        </span>
                      </div>
                    )}
                    {/* Sensory attributes */}
                    {(brew.aroma_intensity != null ||
                      brew.body_intensity != null ||
                      brew.sweetness_intensity != null ||
                      brew.brightness_intensity != null ||
                      brew.complexity_intensity != null ||
                      brew.aftertaste_intensity != null) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-1">
                        {brew.aroma_intensity != null && (
                          <span>
                            <span className="text-muted-foreground">Aroma:</span>{" "}
                            <span className="font-medium tabular-nums">{brew.aroma_intensity}</span>
                          </span>
                        )}
                        {brew.body_intensity != null && (
                          <span>
                            <span className="text-muted-foreground">Body:</span>{" "}
                            <span className="font-medium tabular-nums">{brew.body_intensity}</span>
                          </span>
                        )}
                        {brew.sweetness_intensity != null && (
                          <span>
                            <span className="text-muted-foreground">Sweetness:</span>{" "}
                            <span className="font-medium tabular-nums">{brew.sweetness_intensity}</span>
                          </span>
                        )}
                        {brew.brightness_intensity != null && (
                          <span>
                            <span className="text-muted-foreground">Brightness:</span>{" "}
                            <span className="font-medium tabular-nums">{brew.brightness_intensity}</span>
                          </span>
                        )}
                        {brew.complexity_intensity != null && (
                          <span>
                            <span className="text-muted-foreground">Complexity:</span>{" "}
                            <span className="font-medium tabular-nums">{brew.complexity_intensity}</span>
                          </span>
                        )}
                        {brew.aftertaste_intensity != null && (
                          <span>
                            <span className="text-muted-foreground">Aftertaste:</span>{" "}
                            <span className="font-medium tabular-nums">{brew.aftertaste_intensity}</span>
                          </span>
                        )}
                      </div>
                    )}
                    {brew.overall_notes && (
                      <div className="pt-1">
                        <span className="text-muted-foreground">Notes:</span>{" "}
                        <span className="font-medium">{brew.overall_notes}</span>
                      </div>
                    )}
                    {brew.improvement_notes && (
                      <div>
                        <span className="text-muted-foreground">Improvement:</span>{" "}
                        <span className="font-medium">{brew.improvement_notes}</span>
                      </div>
                    )}
                  </div>
                </div>

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
