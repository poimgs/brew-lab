import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Coffee } from '@/api/coffees';

export interface FilterValues {
  selectedCoffeeIds: string[];
  dateFrom: string;
  dateTo: string;
  scoreMin: string;
  scoreMax: string;
}

interface DashboardFiltersProps {
  coffees: Coffee[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onClear: () => void;
  onApply: () => void;
}

export function getActiveFilterCount(values: FilterValues): number {
  let count = 0;
  if (values.selectedCoffeeIds.length > 0) count++;
  if (values.dateFrom) count++;
  if (values.dateTo) count++;
  if (values.scoreMin) count++;
  if (values.scoreMax) count++;
  return count;
}

export const EMPTY_FILTERS: FilterValues = {
  selectedCoffeeIds: [],
  dateFrom: '',
  dateTo: '',
  scoreMin: '',
  scoreMax: '',
};

export default function DashboardFilters({
  coffees,
  values,
  onChange,
  onClear,
  onApply,
}: DashboardFiltersProps) {
  const allSelected = coffees.length > 0 && values.selectedCoffeeIds.length === coffees.length;

  function toggleCoffee(id: string, checked: boolean) {
    const next = checked
      ? [...values.selectedCoffeeIds, id]
      : values.selectedCoffeeIds.filter((cid) => cid !== id);
    onChange({ ...values, selectedCoffeeIds: next });
  }

  function toggleAll() {
    onChange({
      ...values,
      selectedCoffeeIds: allSelected ? [] : coffees.map((c) => c.id),
    });
  }

  return (
    <div className="space-y-4">
      {/* Coffee selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Coffees</Label>
          <Button variant="ghost" size="sm" onClick={toggleAll} className="h-auto py-1 px-2 text-xs">
            {allSelected ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
        <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
          {coffees.map((coffee) => (
            <label
              key={coffee.id}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <Checkbox
                checked={values.selectedCoffeeIds.includes(coffee.id)}
                onCheckedChange={(checked) => toggleCoffee(coffee.id, !!checked)}
              />
              <span className="flex-1 truncate">
                {coffee.name} · {coffee.roaster}
              </span>
              <span className="text-muted-foreground text-xs shrink-0">
                {coffee.brew_count} brew{coffee.brew_count !== 1 ? 's' : ''}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="filter-date-from" className="text-sm">From</Label>
          <Input
            id="filter-date-from"
            type="date"
            value={values.dateFrom}
            onChange={(e) => onChange({ ...values, dateFrom: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="filter-date-to" className="text-sm">To</Label>
          <Input
            id="filter-date-to"
            type="date"
            value={values.dateTo}
            onChange={(e) => onChange({ ...values, dateTo: e.target.value })}
          />
        </div>
      </div>

      {/* Score range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="filter-score-min" className="text-sm">Min Score</Label>
          <Input
            id="filter-score-min"
            type="number"
            min={1}
            max={10}
            placeholder="1"
            value={values.scoreMin}
            onChange={(e) => onChange({ ...values, scoreMin: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="filter-score-max" className="text-sm">Max Score</Label>
          <Input
            id="filter-score-max"
            type="number"
            min={1}
            max={10}
            placeholder="10"
            value={values.scoreMax}
            onChange={(e) => onChange({ ...values, scoreMax: e.target.value })}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onClear} className="flex-1">
          Clear All
        </Button>
        <Button size="sm" onClick={onApply} className="flex-1">
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
