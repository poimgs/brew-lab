import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { FilterPaper, FilterPaperFormData } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FilterPaperFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterPaper?: FilterPaper;
  onSubmit: (data: FilterPaperFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function FilterPaperFormModal({
  open,
  onOpenChange,
  filterPaper,
  onSubmit,
  isSubmitting,
}: FilterPaperFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FilterPaperFormData>();

  useEffect(() => {
    if (open) {
      reset(
        filterPaper
          ? {
              name: filterPaper.name,
              brand: filterPaper.brand ?? "",
              notes: filterPaper.notes ?? "",
            }
          : { name: "", brand: "", notes: "" }
      );
    }
  }, [open, filterPaper, reset]);

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit({
      name: data.name,
      brand: data.brand || undefined,
      notes: data.notes || undefined,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {filterPaper ? "Edit Filter Paper" : "Add Filter Paper"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register("name", { required: "Name is required" })}
              placeholder="e.g., Cafec Abaca"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              {...register("brand")}
              placeholder="e.g., Cafec"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Optional notes about this filter paper..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : filterPaper
                  ? "Update"
                  : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
