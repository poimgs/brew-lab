import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { MineralProfile } from '@/api/mineral-profiles';

interface MineralProfileDetailProps {
  profile: MineralProfile | null;
  onClose: () => void;
}

export default function MineralProfileDetail({
  profile,
  onClose,
}: MineralProfileDetailProps) {
  const formatValue = (value?: number, unit?: string) => {
    if (value === null || value === undefined) return '—';
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  if (!profile) return null;

  return (
    <Dialog open={!!profile} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{profile.name}</DialogTitle>
          {profile.brand && (
            <DialogDescription>{profile.brand}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Chemical Composition */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Chemical Composition
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Hardness</span>
                <span className="tabular-nums font-medium">
                  {formatValue(profile.hardness, 'ppm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Alkalinity</span>
                <span className="tabular-nums font-medium">
                  {formatValue(profile.alkalinity, 'ppm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Magnesium</span>
                <span className="tabular-nums font-medium">
                  {formatValue(profile.magnesium, 'mg/L')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Calcium</span>
                <span className="tabular-nums font-medium">
                  {formatValue(profile.calcium, 'mg/L')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Potassium</span>
                <span className="tabular-nums font-medium">
                  {formatValue(profile.potassium, 'mg/L')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sodium</span>
                <span className="tabular-nums font-medium">
                  {formatValue(profile.sodium, 'mg/L')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chloride</span>
                <span className="tabular-nums font-medium">
                  {formatValue(profile.chloride, 'mg/L')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sulfate</span>
                <span className="tabular-nums font-medium">
                  {formatValue(profile.sulfate, 'mg/L')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bicarbonate</span>
                <span className="tabular-nums font-medium">
                  {formatValue(profile.bicarbonate, 'mg/L')}
                </span>
              </div>
            </div>
          </div>

          {/* Usage */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Usage
            </h3>
            <div className="space-y-2 text-sm">
              {profile.typical_dose && (
                <div>
                  <span className="text-muted-foreground">Typical Dose: </span>
                  <span>{profile.typical_dose}</span>
                </div>
              )}
              {profile.taste_effects && (
                <div>
                  <span className="text-muted-foreground">Effects: </span>
                  <span>{profile.taste_effects}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
