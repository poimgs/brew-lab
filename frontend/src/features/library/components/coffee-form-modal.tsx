import type { Coffee, CoffeeFormData } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CoffeeForm } from "./coffee-form";

interface CoffeeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coffee?: Coffee;
  onSubmit: (data: CoffeeFormData) => void;
  isSubmitting: boolean;
}

export function CoffeeFormModal({
  open,
  onOpenChange,
  coffee,
  onSubmit,
  isSubmitting,
}: CoffeeFormModalProps) {
  const isEditing = !!coffee;
  const formId = "coffee-form";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Coffee" : "Add Coffee"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this coffee."
              : "Add a new coffee to your library."}
          </DialogDescription>
        </DialogHeader>

        <CoffeeForm
          coffee={coffee}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          formId={formId}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? "Saving..."
                : "Adding..."
              : isEditing
              ? "Save Changes"
              : "Add Coffee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
