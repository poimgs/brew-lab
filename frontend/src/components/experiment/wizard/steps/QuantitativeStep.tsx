import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function QuantitativeStep() {
  const { register, watch } = useFormContext();
  const tds = watch('tds');
  const finalWeight = watch('final_weight');
  const coffeeWeight = watch('coffee_weight');

  const hasCalculatedEY = tds && finalWeight && coffeeWeight;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Quantitative Outcomes</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Measure the objective results of your brew.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="final_weight">Final Weight (g)</Label>
          <Input
            id="final_weight"
            type="number"
            step="0.1"
            placeholder="e.g., 200"
            {...register('final_weight', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Weight of brewed coffee in the cup
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tds">TDS (%)</Label>
          <Input
            id="tds"
            type="number"
            step="0.01"
            placeholder="e.g., 1.35"
            {...register('tds', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Total Dissolved Solids measured with refractometer
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="extraction_yield">
            Extraction Yield (%)
            {hasCalculatedEY && (
              <span className="ml-2 text-xs text-muted-foreground">(auto-calculated)</span>
            )}
          </Label>
          <Input
            id="extraction_yield"
            type="number"
            step="0.01"
            placeholder="e.g., 20.5"
            {...register('extraction_yield', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Calculated from TDS, final weight, and coffee weight
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="drawdown_time">Drawdown Time (seconds)</Label>
          <Input
            id="drawdown_time"
            type="number"
            placeholder="e.g., 60"
            {...register('drawdown_time', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Time from last pour to complete drawdown
          </p>
        </div>
      </div>
    </div>
  );
}
