import { Pencil, Trash2 } from "lucide-react"
import type { Dripper } from "@/api/drippers"

interface DripperCardProps {
  dripper: Dripper
  onEdit: (dripper: Dripper) => void
  onDelete: (dripper: Dripper) => void
}

export function DripperCard({
  dripper,
  onEdit,
  onDelete,
}: DripperCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-card-foreground">
            {dripper.name}
          </h3>
          {dripper.brand && (
            <p className="mt-1 text-sm text-muted-foreground">{dripper.brand}</p>
          )}
          {dripper.notes && (
            <p className="mt-2 text-sm text-muted-foreground">{dripper.notes}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => onEdit(dripper)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Edit ${dripper.name}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(dripper)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-error-muted hover:text-error"
            aria-label={`Delete ${dripper.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
