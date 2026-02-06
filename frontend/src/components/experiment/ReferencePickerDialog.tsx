import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Experiment } from '@/api/experiments';

interface ReferencePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experiments: Experiment[];
  currentReferenceId?: string;
  isLoading: boolean;
  onSelect: (experiment: Experiment) => void;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ReferencePickerDialog({
  open,
  onOpenChange,
  experiments,
  currentReferenceId,
  isLoading,
  onSelect,
}: ReferencePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Reference Brew</DialogTitle>
          <DialogDescription>
            Choose an experiment to use as reference for this session.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-14 bg-muted rounded" />
              ))}
            </div>
          ) : experiments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No experiments found for this coffee.
            </p>
          ) : (
            <div className="divide-y">
              {experiments.map((exp) => (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => {
                    onSelect(exp);
                    onOpenChange(false);
                  }}
                  className="w-full flex items-center gap-3 py-3 text-left hover:bg-muted/50 transition-colors rounded"
                >
                  <div className="w-5 shrink-0 flex items-center justify-center">
                    {exp.id === currentReferenceId && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{formatDate(exp.brew_date)}</span>
                      {exp.overall_score != null && (
                        <span className="text-muted-foreground">{exp.overall_score}/10</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {exp.grind_size != null && <span>Grind: {exp.grind_size}</span>}
                      {exp.ratio != null && <span>Ratio: 1:{exp.ratio}</span>}
                      {exp.water_temperature != null && <span>Temp: {exp.water_temperature}°C</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
