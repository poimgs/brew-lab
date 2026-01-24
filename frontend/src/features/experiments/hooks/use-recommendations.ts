import { useState, useEffect, useCallback } from "react"
import { api, type RecommendationResponse } from "@/lib/api"

interface UseRecommendationsResult {
  recommendations: RecommendationResponse[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRecommendations(
  experimentId: string | undefined
): UseRecommendationsResult {
  const [recommendations, setRecommendations] = useState<
    RecommendationResponse[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = useCallback(async () => {
    if (!experimentId) {
      setRecommendations([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.getRecommendations(experimentId)
      setRecommendations(response.recommendations)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch recommendations"
      )
      setRecommendations([])
    } finally {
      setIsLoading(false)
    }
  }, [experimentId])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  return {
    recommendations,
    isLoading,
    error,
    refetch: fetchRecommendations,
  }
}
