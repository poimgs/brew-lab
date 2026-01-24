import { useState, useEffect, useCallback } from "react"
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

  const fetchAnalysis = useCallback(async () => {
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
  }, [experimentIds, minSamples])

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  return {
    loading,
    error,
    correlations: data?.correlations ?? {},
    inputs: data?.inputs ?? [],
    outcomes: data?.outcomes ?? [],
    experimentCount: data?.experiment_count ?? 0,
    insights: data?.insights ?? [],
    warnings: data?.warnings ?? [],
    refresh: fetchAnalysis,
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

  const fetchDetail = useCallback(async () => {
    if (!inputVariable || !outcomeVariable) {
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
  }, [experimentIds, inputVariable, outcomeVariable])

  useEffect(() => {
    if (inputVariable && outcomeVariable) {
      fetchDetail()
    } else {
      setData(null)
    }
  }, [fetchDetail, inputVariable, outcomeVariable])

  return {
    loading,
    error,
    data,
    fetch: fetchDetail,
  }
}
