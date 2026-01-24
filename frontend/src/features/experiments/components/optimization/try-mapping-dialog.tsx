import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { RecommendationResponse } from "@/lib/api"

interface TryMappingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mapping: RecommendationResponse | null
  onConfirm: (notes?: string) => Promise<void>
  isLoading?: boolean
}

const inputVariableLabels: Record<string, string> = {
  temperature: "Temperature",
  ratio: "Ratio",
  grind_size: "Grind Size",
  bloom_time: "Bloom Time",
  total_brew_time: "Brew Time",
  coffee_weight: "Coffee Weight",
  pour_count: "Pour Count",
  pour_technique: "Pour Technique",
  filter_type: "Filter Type",
}

export function TryMappingDialog({
  open,
  onOpenChange,
  mapping,
  onConfirm,
  isLoading,
}: TryMappingDialogProps) {
  const [notes, setNotes] = useState("")

  const handleConfirm = async () => {
    await onConfirm(notes || undefined)
    setNotes("")
  }

  if (!mapping) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Try Recommendation</DialogTitle>
          <DialogDescription>
            Create a new experiment to try this recommendation. The new
            experiment will copy your current brew parameters with a note about
            what you&apos;re testing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Recommendation</Label>
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{mapping.name}</p>
              <p className="text-sm text-muted-foreground">
                {mapping.direction === "increase" ? "Increase" : "Decrease"}{" "}
                {inputVariableLabels[mapping.variable] || mapping.variable}
              </p>
              <p className="text-sm mt-2">{mapping.tick_description}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any specific notes about what you plan to change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Experiment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
