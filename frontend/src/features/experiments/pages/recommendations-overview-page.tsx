import { Lightbulb, ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { RootLayout } from "@/components/layout/root-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useExperimentsWithGaps } from "../hooks"
import { ExperimentWithGapsCard } from "../components/experiment-with-gaps-card"

export function RecommendationsOverviewPage() {
  const { experiments, isLoading, error, pagination, setPage } =
    useExperimentsWithGaps(20)

  return (
    <RootLayout>
      <PageHeader
        title="Recommendations"
        subtitle="Experiments with target profiles that have improvement opportunities"
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <span className="text-sm text-muted-foreground">
              {pagination.total} experiments with gaps
            </span>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading experiments...</p>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : experiments.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">No Experiments with Gaps</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                To get recommendations, you need experiments with target profiles
                set. Add target values to your experiments and we&apos;ll suggest
                ways to reach them.
              </p>
              <Button asChild>
                <Link to="/experiments">View All Experiments</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {experiments.map((experiment) => (
                <ExperimentWithGapsCard
                  key={experiment.id}
                  experiment={experiment}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </RootLayout>
  )
}
