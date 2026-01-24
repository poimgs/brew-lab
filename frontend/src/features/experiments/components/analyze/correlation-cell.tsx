import { cn } from "@/lib/utils"
import type { CorrelationResult } from "@/lib/api"

interface CorrelationCellProps {
  correlation: CorrelationResult | null | undefined
  onClick?: () => void
}

export function getCorrelationColor(r: number): string {
  const absR = Math.abs(r)

  if (absR < 0.1) return "bg-gray-100 text-gray-600"

  if (r > 0) {
    if (absR >= 0.7) return "bg-green-600 text-white"
    if (absR >= 0.4) return "bg-green-400 text-white"
    return "bg-green-200 text-green-800"
  } else {
    if (absR >= 0.7) return "bg-red-600 text-white"
    if (absR >= 0.4) return "bg-red-400 text-white"
    return "bg-red-200 text-red-800"
  }
}

export function CorrelationCell({ correlation, onClick }: CorrelationCellProps) {
  if (!correlation) {
    return (
      <div className="w-16 h-12 flex items-center justify-center bg-muted text-muted-foreground text-xs">
        -
      </div>
    )
  }

  const colorClass = getCorrelationColor(correlation.r)
  const isSignificant = correlation.p < 0.05

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-16 h-12 flex flex-col items-center justify-center",
        "transition-transform hover:scale-105 cursor-pointer",
        colorClass,
        !isSignificant && "opacity-60"
      )}
      title={`r=${correlation.r.toFixed(3)}, n=${correlation.n}, p=${correlation.p.toFixed(3)}`}
    >
      <span className="font-mono text-sm font-medium">
        {correlation.r.toFixed(2)}
      </span>
      <span className="text-[10px] opacity-80">n={correlation.n}</span>
    </button>
  )
}
