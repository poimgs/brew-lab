import { ChevronLeft, ChevronRight, Coffee } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ExperimentCard } from "./experiment-card"
import type { Experiment } from "@/lib/api"

interface ExperimentListProps {
  experiments: Experiment[]
  loading: boolean
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
  onPageChange: (page: number) => void
  selectable?: boolean
  selectedIds?: string[]
  onToggleSelect?: (id: string) => void
}

export function ExperimentList({
  experiments,
  loading,
  pagination,
  onPageChange,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
}: ExperimentListProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-lg border bg-muted"
          />
        ))}
      </div>
    )
  }

  if (experiments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Coffee className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No experiments found</h3>
        <p className="text-muted-foreground mt-1">
          Start tracking your brews by creating a new experiment.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {experiments.map((experiment) => (
          <ExperimentCard
            key={experiment.id}
            experiment={experiment}
            selectable={selectable}
            selected={selectedIds.includes(experiment.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>

      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.page_size + 1} to{" "}
            {Math.min(pagination.page * pagination.page_size, pagination.total)}{" "}
            of {pagination.total} experiments
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.total_pages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
