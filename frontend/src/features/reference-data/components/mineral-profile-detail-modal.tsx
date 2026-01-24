import type { MineralProfile } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MineralProfileDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mineralProfile: MineralProfile | null;
}

export function MineralProfileDetailModal({
  open,
  onOpenChange,
  mineralProfile,
}: MineralProfileDetailModalProps) {
  if (!mineralProfile) return null;

  const mineralFields = [
    { label: "Hardness", value: mineralProfile.hardness, unit: "ppm" },
    { label: "Alkalinity", value: mineralProfile.alkalinity, unit: "ppm" },
    { label: "Magnesium", value: mineralProfile.magnesium, unit: "ppm" },
    { label: "Calcium", value: mineralProfile.calcium, unit: "ppm" },
    { label: "Potassium", value: mineralProfile.potassium, unit: "ppm" },
    { label: "Sodium", value: mineralProfile.sodium, unit: "ppm" },
    { label: "Chloride", value: mineralProfile.chloride, unit: "ppm" },
    { label: "Sulfate", value: mineralProfile.sulfate, unit: "ppm" },
    { label: "Bicarbonate", value: mineralProfile.bicarbonate, unit: "ppm" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mineralProfile.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {mineralProfile.brand && (
            <div>
              <p className="text-sm text-muted-foreground">Brand</p>
              <p className="font-medium">{mineralProfile.brand}</p>
            </div>
          )}

          {mineralProfile.typical_dose && (
            <div>
              <p className="text-sm text-muted-foreground">Typical Dose</p>
              <p className="font-medium">{mineralProfile.typical_dose}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Mineral Composition
            </p>
            <div className="grid grid-cols-2 gap-2">
              {mineralFields.map(
                ({ label, value, unit }) =>
                  value !== undefined &&
                  value !== null && (
                    <div
                      key={label}
                      className="flex justify-between text-sm bg-muted/50 rounded px-2 py-1"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">
                        {value} {unit}
                      </span>
                    </div>
                  )
              )}
            </div>
          </div>

          {mineralProfile.taste_effects && (
            <div>
              <p className="text-sm text-muted-foreground">Taste Effects</p>
              <p className="text-sm">{mineralProfile.taste_effects}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
