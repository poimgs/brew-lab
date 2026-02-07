import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FilterPaper } from '@/api/filter-papers';

interface PreBrewStepProps {
  filterPapers: FilterPaper[];
}

export default function PreBrewStep({ filterPapers }: PreBrewStepProps) {
  const { register, control } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Pre-Brew Variables</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Set up your brew parameters before starting.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="coffee_weight">Coffee Weight (g)</Label>
          <Input
            id="coffee_weight"
            type="number"
            step="0.1"
            placeholder="e.g., 15"
            {...register('coffee_weight', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ratio">Ratio (1:X)</Label>
          <Input
            id="ratio"
            type="number"
            step="0.1"
            placeholder="e.g., 15 for 1:15"
            {...register('ratio', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="water_weight">Water Weight (g)</Label>
          <Input
            id="water_weight"
            type="number"
            step="0.1"
            placeholder="e.g., 225"
            {...register('water_weight', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="grind_size">Grind Size</Label>
          <Input
            id="grind_size"
            type="number"
            step="0.1"
            placeholder="e.g., 3.5 for Fellow Ode"
            {...register('grind_size', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="water_temperature">Water Temperature (C)</Label>
          <Input
            id="water_temperature"
            type="number"
            step="0.1"
            placeholder="e.g., 93"
            {...register('water_temperature', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label>Filter Paper</Label>
          <Controller
            name="filter_paper_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select filter paper" />
                </SelectTrigger>
                <SelectContent>
                  {filterPapers.map((paper) => (
                    <SelectItem key={paper.id} value={paper.id}>
                      {paper.name} {paper.brand && `(${paper.brand})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
    </div>
  );
}
