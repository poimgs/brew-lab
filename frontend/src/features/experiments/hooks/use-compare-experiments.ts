import { useState, useEffect, useCallback, useRef } from "react"
import {
  api,
  type CompareExperimentsResponse,
  type Experiment,
  type DeltaInfo,
} from "@/lib/api"

interface UseCompareExperimentsReturn {
  loading: boolean
  error: string | null
  experiments: Experiment[]
  deltas: Record<string, DeltaInfo>
  refresh: () => void
}

export function useCompareExperiments(
  experimentIds: string[]
): UseCompareExperimentsReturn {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CompareExperimentsResponse | null>(null)

  // Use ref to store refetch function for external use
  const refetchRef = useRef<() => void>(() => {})

  // Stringify experimentIds for stable dependency comparison
  const experimentIdsKey = JSON.stringify(experimentIds)

  useEffect(() => {
    async function fetchComparison() {
      if (experimentIds.length < 2 || experimentIds.length > 4) {
        setError("Select 2-4 experiments to compare")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await api.compareExperiments(experimentIds)
        setData(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to compare experiments")
      } finally {
        setLoading(false)
      }
    }

    // Store current fetch function for refresh capability
    refetchRef.current = fetchComparison
    fetchComparison()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentIdsKey])

  // Stable refresh function
  const refresh = useCallback(() => refetchRef.current(), [])

  return {
    loading,
    error,
    experiments: data?.experiments ?? [],
    deltas: data?.deltas ?? {},
    refresh,
  }
}
