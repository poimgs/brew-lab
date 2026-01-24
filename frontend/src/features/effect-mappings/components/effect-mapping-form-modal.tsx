import type { EffectMapping, EffectMappingFormData } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EffectMappingForm } from "./effect-mapping-form";
import { Trash2 } from "lucide-react";

interface EffectMappingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping?: EffectMapping;
  onSubmit: (data: EffectMappingFormData) => void;
  isSubmitting: boolean;
  onDelete?: () => void;
}

export function EffectMappingFormModal({
  open,
  onOpenChange,
  mapping,
  onSubmit,
  isSubmitting,
  onDelete,
}: EffectMappingFormModalProps) {
  const isEditing = !!mapping;
  const formId = "effect-mapping-form";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Effect Mapping" : "Add Effect Mapping"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the effect mapping details and effects."
              : "Create a new cause-effect relationship for brewing variables."}
          </DialogDescription>
        </DialogHeader>

        <EffectMappingForm
          mapping={mapping}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          formId={formId}
        />

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
          <div>
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onDelete}
                disabled={isSubmitting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
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
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                ? "Update Mapping"
                : "Create Mapping"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
