import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { api } from "@/lib/api"

interface AdjacentExperiments {
  prevId: string | null
  nextId: string | null
  prevDate: string | null
  nextDate: string | null
  currentIndex: number
  totalCount: number
  isLoading: boolean
}

export function useAdjacentExperiments(currentId: string): AdjacentExperiments {
  const [searchParams] = useSearchParams()
  const [experimentIds, setExperimentIds] = useState<
    { id: string; brew_date: string }[]
  >([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Extract filter params from URL (excluding page/page_size)
  const filterParams = useMemo(() => {
    const params: Record<string, string> = {}
    const filterKeys = [
      "coffee_id",
      "score_gte",
      "score_lte",
      "date_from",
      "date_to",
      "sort_by",
      "sort_dir",
      "tags",
    ]
    filterKeys.forEach((key) => {
      const value = searchParams.get(key)
      if (value) params[key] = value
    })
    return params
  }, [searchParams])

  useEffect(() => {
    async function fetchExperimentIds() {
      setIsLoading(true)
      try {
        // Fetch all experiment IDs matching current filters
        // Using a large page_size to get all experiments for navigation
        const response = await api.listExperiments({
          ...filterParams,
          page_size: 1000,
        } as Record<string, string | number>)
        const ids = response.experiments.map((exp) => ({
          id: exp.id,
          brew_date: exp.brew_date,
        }))
        setExperimentIds(ids)
        setTotalCount(response.total)
      } catch (err) {
        console.error("Failed to fetch experiment IDs:", err)
        setExperimentIds([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchExperimentIds()
  }, [filterParams])

  const result = useMemo(() => {
    const currentIndex = experimentIds.findIndex((exp) => exp.id === currentId)

    if (currentIndex === -1) {
      return {
        prevId: null,
        nextId: null,
        prevDate: null,
        nextDate: null,
        currentIndex: -1,
        totalCount,
        isLoading,
      }
    }

    const prevExp = currentIndex > 0 ? experimentIds[currentIndex - 1] : null
    const nextExp =
      currentIndex < experimentIds.length - 1
        ? experimentIds[currentIndex + 1]
        : null

    return {
      prevId: prevExp?.id ?? null,
      nextId: nextExp?.id ?? null,
      prevDate: prevExp?.brew_date ?? null,
      nextDate: nextExp?.brew_date ?? null,
      currentIndex: currentIndex + 1, // 1-indexed for display
      totalCount,
      isLoading,
    }
  }, [experimentIds, currentId, totalCount, isLoading])

  return result
}
