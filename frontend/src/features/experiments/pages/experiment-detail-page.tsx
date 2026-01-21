import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { format } from "date-fns"
import {
  ArrowLeft,
  Edit,
  Copy,
  Trash2,
  Calendar,
  Star,
  Clock,
  Droplets,
} from "lucide-react"
import { RootLayout, PageHeader } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ExperimentForm } from "../components/experiment-form"
import { api, type Experiment, type ExperimentFormData } from "@/lib/api"
import { cn } from "@/lib/utils"

export function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchExperiment()
  }, [id])

  async function fetchExperiment() {
    if (!id) return
    setLoading(true)
    try {
      const response = await api.getExperiment(id)
      setExperiment(response.data)
    } catch (err) {
      console.error("Failed to fetch experiment:", err)
      setError(err instanceof Error ? err.message : "Failed to load experiment")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (data: ExperimentFormData) => {
    if (!id) return
    setIsSubmitting(true)
    try {
      const response = await api.updateExperiment(id, data)
      setExperiment(response.data)
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to update experiment:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!id) return
    try {
      const response = await api.copyExperiment(id)
      navigate(`/experiments/${response.data.id}`)
    } catch (err) {
      console.error("Failed to copy experiment:", err)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setIsDeleting(true)
    try {
      await api.deleteExperiment(id)
      navigate("/experiments")
    } catch (err) {
      console.error("Failed to delete experiment:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <RootLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </RootLayout>
    )
  }

  if (error || !experiment) {
    return (
      <RootLayout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-lg font-medium">Experiment not found</h2>
          <p className="text-muted-foreground mt-1">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/experiments")}
          >
            Back to Experiments
          </Button>
        </div>
      </RootLayout>
    )
  }

  if (isEditing) {
    return (
      <RootLayout>
        <PageHeader
          title="Edit Experiment"
          actions={
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel Edit
            </Button>
          }
        />
        <ExperimentForm
          experiment={experiment}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
          isSubmitting={isSubmitting}
        />
      </RootLayout>
    )
  }

  return (
    <RootLayout>
      <PageHeader
        title={
          experiment.coffee
            ? `${experiment.coffee.roaster} - ${experiment.coffee.name}`
            : "Experiment"
        }
        description={`Brewed on ${format(new Date(experiment.brew_date), "MMMM d, yyyy")}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/experiments")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Experiment</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this experiment? This action
                    cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Overview Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start gap-6">
              {experiment.overall_score && (
                <div className="flex items-center gap-2">
                  <Star
                    className={cn(
                      "h-6 w-6",
                      experiment.overall_score >= 7
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground"
                    )}
                  />
                  <span className="font-mono text-2xl font-bold">
                    {experiment.overall_score}
                  </span>
                  <span className="text-muted-foreground">/10</span>
                </div>
              )}
              {experiment.days_off_roast !== undefined && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-5 w-5" />
                  <span>Day {experiment.days_off_roast} off roast</span>
                </div>
              )}
              {experiment.calculated_ratio && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Droplets className="h-5 w-5" />
                  <span>1:{experiment.calculated_ratio.toFixed(1)} ratio</span>
                </div>
              )}
              {experiment.total_brew_time && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-5 w-5" />
                  <span>{formatTime(experiment.total_brew_time)} brew time</span>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Overall Notes</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {experiment.overall_notes}
                </p>
              </div>

              {experiment.improvement_notes && (
                <div>
                  <h4 className="font-medium mb-2">Ideas for Next Time</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {experiment.improvement_notes}
                  </p>
                </div>
              )}

              {experiment.issue_tags && experiment.issue_tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Issue Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {experiment.issue_tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={tag.is_system ? "secondary" : "outline"}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pre-Brew Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pre-Brew Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {experiment.coffee_weight && (
                  <div>
                    <dt className="text-muted-foreground">Coffee</dt>
                    <dd className="font-mono">{experiment.coffee_weight}g</dd>
                  </div>
                )}
                {experiment.water_weight && (
                  <div>
                    <dt className="text-muted-foreground">Water</dt>
                    <dd className="font-mono">{experiment.water_weight}g</dd>
                  </div>
                )}
                {experiment.grind_size && (
                  <div>
                    <dt className="text-muted-foreground">Grind Size</dt>
                    <dd>{experiment.grind_size}</dd>
                  </div>
                )}
                {experiment.water_temperature && (
                  <div>
                    <dt className="text-muted-foreground">Temperature</dt>
                    <dd className="font-mono">{experiment.water_temperature}°C</dd>
                  </div>
                )}
                {experiment.filter_type && (
                  <div>
                    <dt className="text-muted-foreground">Filter</dt>
                    <dd>{experiment.filter_type}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Brew Process */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Brew Process</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {experiment.bloom_water && (
                  <div>
                    <dt className="text-muted-foreground">Bloom Water</dt>
                    <dd className="font-mono">{experiment.bloom_water}g</dd>
                  </div>
                )}
                {experiment.bloom_time && (
                  <div>
                    <dt className="text-muted-foreground">Bloom Time</dt>
                    <dd className="font-mono">{experiment.bloom_time}s</dd>
                  </div>
                )}
                {experiment.total_brew_time && (
                  <div>
                    <dt className="text-muted-foreground">Total Time</dt>
                    <dd className="font-mono">
                      {formatTime(experiment.total_brew_time)}
                    </dd>
                  </div>
                )}
                {experiment.drawdown_time && (
                  <div>
                    <dt className="text-muted-foreground">Drawdown</dt>
                    <dd className="font-mono">
                      {formatTime(experiment.drawdown_time)}
                    </dd>
                  </div>
                )}
                {experiment.final_weight && (
                  <div>
                    <dt className="text-muted-foreground">Final Weight</dt>
                    <dd className="font-mono">{experiment.final_weight}g</dd>
                  </div>
                )}
                {experiment.tds && (
                  <div>
                    <dt className="text-muted-foreground">TDS</dt>
                    <dd className="font-mono">{experiment.tds}%</dd>
                  </div>
                )}
                {experiment.extraction_yield && (
                  <div>
                    <dt className="text-muted-foreground">Extraction</dt>
                    <dd className="font-mono">
                      {experiment.extraction_yield.toFixed(1)}%
                    </dd>
                  </div>
                )}
              </dl>
              {experiment.technique_notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {experiment.technique_notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sensory Evaluation */}
        {(experiment.aroma_intensity ||
          experiment.acidity_intensity ||
          experiment.sweetness_intensity ||
          experiment.bitterness_intensity ||
          experiment.body_weight ||
          experiment.aftertaste_duration ||
          experiment.aftertaste_intensity ||
          experiment.aroma_notes ||
          experiment.flavor_notes ||
          experiment.aftertaste_notes) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sensory Evaluation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {experiment.aroma_intensity && (
                  <SensoryScore
                    label="Aroma"
                    value={experiment.aroma_intensity}
                  />
                )}
                {experiment.acidity_intensity && (
                  <SensoryScore
                    label="Acidity"
                    value={experiment.acidity_intensity}
                  />
                )}
                {experiment.sweetness_intensity && (
                  <SensoryScore
                    label="Sweetness"
                    value={experiment.sweetness_intensity}
                  />
                )}
                {experiment.bitterness_intensity && (
                  <SensoryScore
                    label="Bitterness"
                    value={experiment.bitterness_intensity}
                  />
                )}
                {experiment.body_weight && (
                  <SensoryScore label="Body" value={experiment.body_weight} />
                )}
                {experiment.aftertaste_duration && (
                  <SensoryScore
                    label="Aftertaste Duration"
                    value={experiment.aftertaste_duration}
                  />
                )}
                {experiment.aftertaste_intensity && (
                  <SensoryScore
                    label="Aftertaste Intensity"
                    value={experiment.aftertaste_intensity}
                  />
                )}
              </div>

              {(experiment.aroma_notes ||
                experiment.flavor_notes ||
                experiment.aftertaste_notes) && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4 border-t">
                  {experiment.aroma_notes && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Aroma Notes</h4>
                      <p className="text-sm text-muted-foreground">
                        {experiment.aroma_notes}
                      </p>
                    </div>
                  )}
                  {experiment.flavor_notes && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Flavor Notes</h4>
                      <p className="text-sm text-muted-foreground">
                        {experiment.flavor_notes}
                      </p>
                    </div>
                  )}
                  {experiment.aftertaste_notes && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Aftertaste Notes</h4>
                      <p className="text-sm text-muted-foreground">
                        {experiment.aftertaste_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </RootLayout>
  )
}

function SensoryScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
    </div>
  )
}
