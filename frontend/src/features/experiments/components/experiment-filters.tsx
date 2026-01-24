import { useState, useEffect } from "react"
import { X, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { api, type Coffee, type IssueTag, type ExperimentListParams } from "@/lib/api"

interface ExperimentFiltersProps {
  filters: ExperimentListParams
  onChange: (filters: ExperimentListParams) => void
}

export function ExperimentFilters({ filters, onChange }: ExperimentFiltersProps) {
  const [coffees, setCoffees] = useState<Coffee[]>([])
  const [tags, setTags] = useState<IssueTag[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [coffeesRes, tagsRes] = await Promise.all([
          api.listCoffees({ page_size: 100 }),
          api.listTags(),
        ])
        setCoffees(coffeesRes.coffees)
        setTags(tagsRes.tags)
      } catch (err) {
        console.error("Failed to fetch filter options:", err)
      }
    }
    fetchData()
  }, [])

  const handleChange = (updates: Partial<ExperimentListParams>) => {
    onChange({ ...filters, ...updates, page: 1 })
  }

  const clearFilters = () => {
    onChange({ page: 1, page_size: filters.page_size })
  }

  const activeFilterCount = [
    filters.coffee_id,
    filters.tags,
    filters.score_gte,
    filters.score_lte,
    filters.date_from,
    filters.date_to,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <Select
            value={filters.coffee_id ?? "all"}
            onValueChange={(value) =>
              handleChange({ coffee_id: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All coffees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All coffees</SelectItem>
              {coffees.map((coffee) => (
                <SelectItem key={coffee.id} value={coffee.id}>
                  {coffee.roaster} - {coffee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Tag</Label>
                <Select
                  value={filters.tags ?? "all"}
                  onValueChange={(value) =>
                    handleChange({ tags: value === "all" ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any tag</SelectItem>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.name}>
                        {tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Min Score</Label>
                <Select
                  value={filters.score_gte?.toString() ?? "any"}
                  onValueChange={(value) =>
                    handleChange({
                      score_gte: value === "any" ? undefined : parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <SelectItem key={score} value={score.toString()}>
                        {score}+
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={filters.date_from ?? ""}
                  onChange={(e) =>
                    handleChange({ date_from: e.target.value || undefined })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={filters.date_to ?? ""}
                  onChange={(e) =>
                    handleChange({ date_to: e.target.value || undefined })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Label>Sort by</Label>
              <Select
                value={`${filters.sort_by ?? "brew_date"}-${filters.sort_dir ?? "desc"}`}
                onValueChange={(value) => {
                  const [sortBy, sortDir] = value.split("-") as [
                    ExperimentListParams["sort_by"],
                    ExperimentListParams["sort_dir"]
                  ]
                  handleChange({ sort_by: sortBy, sort_dir: sortDir })
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brew_date-desc">Newest first</SelectItem>
                  <SelectItem value="brew_date-asc">Oldest first</SelectItem>
                  <SelectItem value="overall_score-desc">Highest score</SelectItem>
                  <SelectItem value="overall_score-asc">Lowest score</SelectItem>
                  <SelectItem value="created_at-desc">Recently added</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
