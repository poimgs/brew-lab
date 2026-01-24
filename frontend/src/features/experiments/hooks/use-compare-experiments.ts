import { useState, useEffect, useCallback } from "react"
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

  const fetchComparison = useCallback(async () => {
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
  }, [experimentIds])

  useEffect(() => {
    fetchComparison()
  }, [fetchComparison])

  return {
    loading,
    error,
    experiments: data?.experiments ?? [],
    deltas: data?.deltas ?? {},
    refresh: fetchComparison,
  }
}
