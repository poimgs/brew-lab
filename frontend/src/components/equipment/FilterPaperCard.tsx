import { Pencil, Trash2 } from "lucide-react"
import type { FilterPaper } from "@/api/filterPapers"

interface FilterPaperCardProps {
  paper: FilterPaper
  onEdit: (paper: FilterPaper) => void
  onDelete: (paper: FilterPaper) => void
}

export function FilterPaperCard({
  paper,
  onEdit,
  onDelete,
}: FilterPaperCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-card-foreground">
            {paper.name}
          </h3>
          {paper.brand && (
            <p className="mt-1 text-sm text-muted-foreground">{paper.brand}</p>
          )}
          {paper.notes && (
            <p className="mt-2 text-sm text-muted-foreground">{paper.notes}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => onEdit(paper)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Edit ${paper.name}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(paper)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-error-muted hover:text-error"
            aria-label={`Delete ${paper.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
