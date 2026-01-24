import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

export type SelectionMode = "compare" | "analyze" | null

export interface UseExperimentSelectionReturn {
  selectedIds: string[]
  mode: SelectionMode
  isSelected: (id: string) => boolean
  toggleSelection: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  setMode: (mode: SelectionMode) => void
  canCompare: boolean
  canAnalyze: boolean
}

export function useExperimentSelection(): UseExperimentSelectionReturn {
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedIds = useMemo(() => {
    const selected = searchParams.get("selected")
    if (!selected) return []
    return selected.split(",").filter(Boolean)
  }, [searchParams])

  const mode = useMemo(() => {
    const modeParam = searchParams.get("mode")
    if (modeParam === "compare" || modeParam === "analyze") {
      return modeParam
    }
    return null
  }, [searchParams])

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds]
  )

  const updateSelection = useCallback(
    (newIds: string[], newMode?: SelectionMode) => {
      const params = new URLSearchParams(searchParams)

      if (newIds.length > 0) {
        params.set("selected", newIds.join(","))
      } else {
        params.delete("selected")
      }

      if (newMode !== undefined) {
        if (newMode) {
          params.set("mode", newMode)
        } else {
          params.delete("mode")
        }
      }

      setSearchParams(params)
    },
    [searchParams, setSearchParams]
  )

  const toggleSelection = useCallback(
    (id: string) => {
      const newIds = selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]

      // Clear mode if selection becomes invalid for current mode
      let newMode: SelectionMode = mode
      if (newMode === "compare" && (newIds.length < 2 || newIds.length > 4)) {
        newMode = null
      }
      if (newMode === "analyze" && newIds.length < 5) {
        newMode = null
      }

      updateSelection(newIds, newMode)
    },
    [selectedIds, mode, updateSelection]
  )

  const selectAll = useCallback(
    (ids: string[]) => {
      updateSelection(ids)
    },
    [updateSelection]
  )

  const clearSelection = useCallback(() => {
    updateSelection([], null)
  }, [updateSelection])

  const setMode = useCallback(
    (newMode: SelectionMode) => {
      updateSelection(selectedIds, newMode)
    },
    [selectedIds, updateSelection]
  )

  const canCompare = selectedIds.length >= 2 && selectedIds.length <= 4
  const canAnalyze = selectedIds.length >= 5

  return {
    selectedIds,
    mode,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    setMode,
    canCompare,
    canAnalyze,
  }
}
