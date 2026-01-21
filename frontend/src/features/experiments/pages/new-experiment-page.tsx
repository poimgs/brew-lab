import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { RootLayout, PageHeader } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { ExperimentForm } from "../components/experiment-form"
import { api, type ExperimentFormData } from "@/lib/api"

export function NewExperimentPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: ExperimentFormData) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await api.createExperiment(data)
      navigate(`/experiments/${response.data.id}`)
    } catch (err) {
      console.error("Failed to create experiment:", err)
      setError(err instanceof Error ? err.message : "Failed to create experiment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate("/experiments")
  }

  return (
    <RootLayout>
      <PageHeader
        title="New Experiment"
        description="Log a new brewing session"
        actions={
          <Button variant="ghost" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Experiments
          </Button>
        }
      />

      {error && (
        <div className="mb-6 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      <ExperimentForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </RootLayout>
  )
}
