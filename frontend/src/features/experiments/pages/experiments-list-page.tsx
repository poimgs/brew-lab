import { useState, useEffect, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import { RootLayout, PageHeader } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { ExperimentFilters } from "../components/experiment-filters"
import { ExperimentList } from "../components/experiment-list"
import { api, type Experiment, type ExperimentListParams } from "@/lib/api"

export function ExperimentsListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 12,
    total: 0,
    total_pages: 0,
  })

  // Parse filters from URL
  const getFiltersFromUrl = useCallback((): ExperimentListParams => {
    return {
      page: parseInt(searchParams.get("page") ?? "1"),
      page_size: 12,
      coffee_id: searchParams.get("coffee_id") ?? undefined,
      tags: searchParams.get("tags") ?? undefined,
      score_gte: searchParams.get("score_gte")
        ? parseInt(searchParams.get("score_gte")!)
        : undefined,
      score_lte: searchParams.get("score_lte")
        ? parseInt(searchParams.get("score_lte")!)
        : undefined,
      date_from: searchParams.get("date_from") ?? undefined,
      date_to: searchParams.get("date_to") ?? undefined,
      sort_by:
        (searchParams.get("sort_by") as ExperimentListParams["sort_by"]) ??
        "brew_date",
      sort_dir:
        (searchParams.get("sort_dir") as ExperimentListParams["sort_dir"]) ??
        "desc",
    }
  }, [searchParams])

  const filters = getFiltersFromUrl()

  const fetchExperiments = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.listExperiments(filters)
      setExperiments(response.experiments)
      setPagination({
        page: response.page,
        page_size: response.per_page,
        total: response.total,
        total_pages: Math.ceil(response.total / response.per_page),
      })
    } catch (err) {
      console.error("Failed to fetch experiments:", err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchExperiments()
  }, [fetchExperiments])

  const updateFilters = (newFilters: ExperimentListParams) => {
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value))
      }
    })
    setSearchParams(params)
  }

  const handlePageChange = (page: number) => {
    updateFilters({ ...filters, page })
  }

  return (
    <RootLayout>
      <PageHeader
        title="Experiments"
        description="Track and analyze your brewing sessions"
        actions={
          <Button onClick={() => navigate("/experiments/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Experiment
          </Button>
        }
      />

      <div className="space-y-6">
        <ExperimentFilters filters={filters} onChange={updateFilters} />

        <ExperimentList
          experiments={experiments}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </div>
    </RootLayout>
  )
}
