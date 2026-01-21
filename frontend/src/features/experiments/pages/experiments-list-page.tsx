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
      tag_id: searchParams.get("tag_id") ?? undefined,
      min_score: searchParams.get("min_score")
        ? parseInt(searchParams.get("min_score")!)
        : undefined,
      max_score: searchParams.get("max_score")
        ? parseInt(searchParams.get("max_score")!)
        : undefined,
      start_date: searchParams.get("start_date") ?? undefined,
      end_date: searchParams.get("end_date") ?? undefined,
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
      setExperiments(response.data)
      setPagination(response.pagination)
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
