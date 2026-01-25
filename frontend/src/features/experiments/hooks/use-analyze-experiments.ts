import { useState, useEffect, useCallback, useRef } from "react"
import {
  api,
  type AnalyzeExperimentsResponse,
  type AnalyzeDetailResponse,
  type CorrelationResult,
  type Insight,
  type Warning,
} from "@/lib/api"

interface UseAnalyzeExperimentsReturn {
  loading: boolean
  error: string | null
  correlations: Record<string, Record<string, CorrelationResult>>
  inputs: string[]
  outcomes: string[]
  experimentCount: number
  insights: Insight[]
  warnings: Warning[]
  refresh: () => void
}

export function useAnalyzeExperiments(
  experimentIds: string[],
  minSamples: number = 5
): UseAnalyzeExperimentsReturn {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AnalyzeExperimentsResponse | null>(null)

  // Use ref to store refetch function for external use
  const refetchRef = useRef<() => void>(() => {})

  // Stringify experimentIds for stable dependency comparison
  const experimentIdsKey = JSON.stringify(experimentIds)

  useEffect(() => {
    async function fetchAnalysis() {
      if (experimentIds.length < 5) {
        setError("Select at least 5 experiments to analyze")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await api.analyzeExperiments({
          experiment_ids: experimentIds,
          min_samples: minSamples,
        })
        setData(response)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to analyze experiments"
        )
      } finally {
        setLoading(false)
      }
    }

    // Store current fetch function for refresh capability
    refetchRef.current = fetchAnalysis
    fetchAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentIdsKey, minSamples])

  // Stable refresh function
  const refresh = useCallback(() => refetchRef.current(), [])

  return {
    loading,
    error,
    correlations: data?.correlations ?? {},
    inputs: data?.inputs ?? [],
    outcomes: data?.outcomes ?? [],
    experimentCount: data?.experiment_count ?? 0,
    insights: data?.insights ?? [],
    warnings: data?.warnings ?? [],
    refresh,
  }
}

interface UseAnalyzeDetailReturn {
  loading: boolean
  error: string | null
  data: AnalyzeDetailResponse | null
  fetch: () => void
}

export function useAnalyzeDetail(
  experimentIds: string[],
  inputVariable: string | null,
  outcomeVariable: string | null
): UseAnalyzeDetailReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AnalyzeDetailResponse | null>(null)

  // Use ref to store fetch function for external use
  const fetchRef = useRef<() => void>(() => {})

  // Stringify experimentIds for stable dependency comparison
  const experimentIdsKey = JSON.stringify(experimentIds)

  useEffect(() => {
    async function fetchDetail() {
      if (!inputVariable || !outcomeVariable) {
        setData(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await api.analyzeDetail({
          experiment_ids: experimentIds,
          input_variable: inputVariable,
          outcome_variable: outcomeVariable,
        })
        setData(response)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to get correlation details"
        )
      } finally {
        setLoading(false)
      }
    }

    // Store current fetch function
    fetchRef.current = fetchDetail
    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentIdsKey, inputVariable, outcomeVariable])

  // Stable fetch function
  const fetchFn = useCallback(() => fetchRef.current(), [])

  return {
    loading,
    error,
    data,
    fetch: fetchFn,
  }
}
