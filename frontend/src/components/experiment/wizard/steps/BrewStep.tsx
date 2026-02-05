import { useFormContext, Controller, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const POUR_STYLES = ['circular', 'center', 'pulse'] as const;

export default function BrewStep() {
  const { register, control } = useFormContext();
  const { fields: pourFields, append: appendPour, remove: removePour } = useFieldArray({
    control,
    name: 'pours',
  });

  const addPour = () => {
    appendPour({
      pour_number: pourFields.length + 1,
      water_amount: null,
      pour_style: null,
      notes: null,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Brew Variables</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Record your brewing process and technique.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bloom_water">Bloom Water (g)</Label>
          <Input
            id="bloom_water"
            type="number"
            step="0.1"
            placeholder="e.g., 30"
            {...register('bloom_water', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bloom_time">Bloom Time (seconds)</Label>
          <Input
            id="bloom_time"
            type="number"
            placeholder="e.g., 45"
            {...register('bloom_time', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Pours Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Pours</Label>
          <Button type="button" variant="outline" size="sm" onClick={addPour}>
            <Plus className="h-4 w-4 mr-1" />
            Add Pour
          </Button>
        </div>

        {pourFields.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No pours recorded yet. Click "Add Pour" to track individual pours.
          </p>
        )}

        {pourFields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
            <span className="text-sm font-medium text-muted-foreground w-6 pt-2">
              {index + 1}.
            </span>
            <div className="flex-1 grid gap-2 sm:grid-cols-3">
              <Input
                type="number"
                step="0.1"
                placeholder="Water (g)"
                {...register(`pours.${index}.water_amount`, { valueAsNumber: true })}
              />
              <Controller
                name={`pours.${index}.pour_style`}
                control={control}
                render={({ field: selectField }) => (
                  <Select value={selectField.value || ''} onValueChange={selectField.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Style" />
                    </SelectTrigger>
                    <SelectContent>
                      {POUR_STYLES.map((style) => (
                        <SelectItem key={style} value={style}>
                          {style}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Input
                placeholder="Notes"
                {...register(`pours.${index}.notes`)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removePour(index)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="total_brew_time">Total Brew Time (seconds)</Label>
          <Input
            id="total_brew_time"
            type="number"
            placeholder="e.g., 180"
            {...register('total_brew_time', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="technique_notes">Technique Notes</Label>
        <Textarea
          id="technique_notes"
          {...register('technique_notes')}
          placeholder="Any specific techniques used?"
          rows={2}
        />
      </div>
    </div>
  );
}
