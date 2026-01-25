import { useState, useEffect, useCallback, useRef } from "react"
import { api, type ExperimentWithGaps } from "@/lib/api"

interface UseExperimentsWithGapsResult {
  experiments: ExperimentWithGaps[]
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  setPage: (page: number) => void
  refetch: () => Promise<void>
}

export function useExperimentsWithGaps(
  pageSize: number = 20
): UseExperimentsWithGapsResult {
  const [experiments, setExperiments] = useState<ExperimentWithGaps[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })

  // Use ref to store refetch function for external use
  const refetchRef = useRef<() => Promise<void>>(() => Promise.resolve())

  // Fetch experiments when page/pageSize change
  useEffect(() => {
    async function fetchExperiments() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.getExperimentsWithGaps(page, pageSize)
        setExperiments(response.experiments)
        setPagination({
          page: response.page,
          pageSize: response.page_size,
          total: response.total_count,
          totalPages: response.total_pages,
        })
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch experiments with gaps"
        )
        setExperiments([])
      } finally {
        setIsLoading(false)
      }
    }

    // Store current fetch function for refetch capability
    refetchRef.current = fetchExperiments
    fetchExperiments()
  }, [page, pageSize])

  // Stable refetch function
  const refetch = useCallback(() => refetchRef.current(), [])

  return {
    experiments,
    isLoading,
    error,
    pagination,
    setPage,
    refetch,
  }
}
