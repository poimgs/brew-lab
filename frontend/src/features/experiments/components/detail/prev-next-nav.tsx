import { Link } from "react-router-dom"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PrevNextNavProps {
  prevId: string | null
  nextId: string | null
  prevDate: string | null
  nextDate: string | null
  currentIndex: number
  totalCount: number
  isLoading?: boolean
}

export function PrevNextNav({
  prevId,
  nextId,
  prevDate,
  nextDate,
  currentIndex,
  totalCount,
  isLoading,
}: PrevNextNavProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    try {
      return format(new Date(dateStr), "MMM d")
    } catch {
      return null
    }
  }

  // Don't render if there's no navigation possible
  if (!prevId && !nextId && !isLoading) {
    return null
  }

  return (
    <div className="flex items-center justify-between border-t pt-6 mt-6">
      <div className="flex-1">
        {prevId ? (
          <Button variant="outline" asChild>
            <Link to={`/experiments/${prevId}`} className="inline-flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              <div className="text-left">
                <span className="block text-sm">Previous</span>
                {prevDate && (
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(prevDate)}
                  </span>
                )}
              </div>
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </div>

      <div
        className={cn(
          "text-sm text-muted-foreground",
          isLoading && "opacity-50"
        )}
      >
        {currentIndex > 0 && totalCount > 0 ? (
          <span>
            {currentIndex} of {totalCount}
          </span>
        ) : isLoading ? (
          <span>Loading...</span>
        ) : null}
      </div>

      <div className="flex-1 flex justify-end">
        {nextId ? (
          <Button variant="outline" asChild>
            <Link to={`/experiments/${nextId}`} className="inline-flex items-center gap-2">
              <div className="text-right">
                <span className="block text-sm">Next</span>
                {nextDate && (
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(nextDate)}
                  </span>
                )}
              </div>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}
