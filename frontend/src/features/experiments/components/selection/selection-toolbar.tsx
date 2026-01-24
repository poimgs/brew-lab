import { X, GitCompare, TrendingUp, CheckSquare, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { SelectionMode } from "../../hooks/use-experiment-selection"
import { api, type ExperimentListParams } from "@/lib/api"

interface SelectionToolbarProps {
  selectedCount: number
  totalCount: number
  canCompare: boolean
  canAnalyze: boolean
  mode: SelectionMode
  onClear: () => void
  onSelectAllFiltered: () => void
  onSetMode: (mode: SelectionMode) => void
  filters?: ExperimentListParams
}

export function SelectionToolbar({
  selectedCount,
  totalCount,
  canCompare,
  canAnalyze,
  mode,
  onClear,
  onSelectAllFiltered,
  onSetMode,
  filters,
}: SelectionToolbarProps) {
  const handleExport = async () => {
    try {
      const blob = await api.exportExperiments(filters, "csv")
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `experiments_${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  if (selectedCount === 0 && !mode) {
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-lg">
        <span className="text-sm text-muted-foreground">
          Select experiments to compare or analyze
        </span>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-primary/5 border border-primary/20 rounded-lg">
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="text-sm">
          {selectedCount} selected
        </Badge>

        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>

        {selectedCount < totalCount && (
          <Button variant="ghost" size="sm" onClick={onSelectAllFiltered}>
            <CheckSquare className="h-4 w-4 mr-1" />
            Select All ({totalCount})
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={mode === "compare" ? "default" : "outline"}
          size="sm"
          disabled={!canCompare}
          onClick={() => onSetMode(mode === "compare" ? null : "compare")}
        >
          <GitCompare className="h-4 w-4 mr-2" />
          Compare
          {selectedCount >= 2 && selectedCount <= 4 && (
            <span className="ml-1 text-xs opacity-70">({selectedCount})</span>
          )}
        </Button>

        <Button
          variant={mode === "analyze" ? "default" : "outline"}
          size="sm"
          disabled={!canAnalyze}
          onClick={() => onSetMode(mode === "analyze" ? null : "analyze")}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Analyze
          {selectedCount >= 5 && (
            <span className="ml-1 text-xs opacity-70">({selectedCount})</span>
          )}
        </Button>

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  )
}
