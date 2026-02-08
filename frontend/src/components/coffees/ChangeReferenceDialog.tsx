import { Loader2, X, Check } from "lucide-react"
import type { Brew } from "@/api/brews"

interface ChangeReferenceDialogProps {
  brews: Brew[]
  isLoading: boolean
  currentReferenceBrewId: string | null
  onSelect: (brewId: string | null) => void
  onClose: () => void
}

export function ChangeReferenceDialog({
  brews,
  isLoading,
  currentReferenceBrewId,
  onSelect,
  onClose,
}: ChangeReferenceDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 sm:px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Change reference brew"
    >
      <div className="flex h-screen w-full flex-col bg-card sm:h-auto sm:max-w-md sm:rounded-lg sm:shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-card-foreground">
            Change Reference Brew
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 sm:max-h-80">
          {isLoading && (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && brews.length === 0 && (
            <p className="text-sm text-muted-foreground">No brews available.</p>
          )}

          {!isLoading && brews.length > 0 && (
            <div className="space-y-1">
              {/* Clear option */}
              <button
                onClick={() => onSelect(null)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                  currentReferenceBrewId == null ? "bg-muted" : ""
                }`}
              >
                <span className="w-5 shrink-0">
                  {currentReferenceBrewId == null && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </span>
                <span className="text-muted-foreground italic">
                  No starred reference (use latest brew)
                </span>
              </button>

              {brews.map((brew) => {
                const isSelected = currentReferenceBrewId === brew.id
                const date = new Date(brew.brew_date + "T00:00:00")
                const dateStr = date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })

                return (
                  <button
                    key={brew.id}
                    onClick={() => onSelect(brew.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                      isSelected ? "bg-muted" : ""
                    }`}
                  >
                    <span className="w-5 shrink-0">
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </span>
                    <span className="flex-1">
                      <span className="font-medium">{dateStr}</span>
                      {brew.overall_score != null && (
                        <span className="ml-2 text-muted-foreground">
                          {brew.overall_score}/10
                        </span>
                      )}
                      {brew.grind_size != null && (
                        <span className="ml-2 text-muted-foreground">
                          Grind {brew.grind_size}
                        </span>
                      )}
                      {brew.ratio != null && (
                        <span className="ml-2 text-muted-foreground">
                          1:{brew.ratio}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
