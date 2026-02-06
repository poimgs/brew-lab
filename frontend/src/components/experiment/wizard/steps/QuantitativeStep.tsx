import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type CoffeeGoalInput } from '@/api/coffee-goals';

interface QuantitativeStepProps {
  goals: CoffeeGoalInput;
  onGoalChange: (field: keyof CoffeeGoalInput, value: number | null) => void;
}

export default function QuantitativeStep({ goals, onGoalChange }: QuantitativeStepProps) {
  const { register, watch } = useFormContext();
  const tds = watch('tds');
  const coffeeMl = watch('coffee_ml');
  const coffeeWeight = watch('coffee_weight');

  const hasCalculatedEY = tds && coffeeMl && coffeeWeight;

  const handleGoalNumberChange = (field: keyof CoffeeGoalInput, value: string) => {
    const parsed = parseFloat(value);
    onGoalChange(field, value === '' || isNaN(parsed) ? null : parsed);
  };

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
          <Label htmlFor="coffee_ml">Coffee (ml)</Label>
          <Input
            id="coffee_ml"
            type="number"
            step="0.1"
            placeholder="e.g., 200"
            {...register('coffee_ml', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Volume of brewed coffee in milliliters
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
            Calculated from TDS, coffee volume, and coffee weight
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

      {/* Target Goals */}
      <div className="border border-dashed rounded-lg p-4 space-y-4 bg-muted/20">
        <div>
          <h4 className="text-sm font-medium">Target Goals</h4>
          <p className="text-xs text-muted-foreground">
            Set target values for this coffee to compare against your results.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="goal_coffee_ml" className="text-xs">Coffee (ml)</Label>
            <Input
              id="goal_coffee_ml"
              type="number"
              step="0.1"
              placeholder="—"
              value={goals.coffee_ml ?? ''}
              onChange={(e) => handleGoalNumberChange('coffee_ml', e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="goal_tds" className="text-xs">TDS (%)</Label>
            <Input
              id="goal_tds"
              type="number"
              step="0.01"
              placeholder="—"
              value={goals.tds ?? ''}
              onChange={(e) => handleGoalNumberChange('tds', e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="goal_extraction_yield" className="text-xs">Extraction (%)</Label>
            <Input
              id="goal_extraction_yield"
              type="number"
              step="0.01"
              placeholder="—"
              value={goals.extraction_yield ?? ''}
              onChange={(e) => handleGoalNumberChange('extraction_yield', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
