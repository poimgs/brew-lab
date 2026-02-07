import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface IntensityInputProps {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  notesValue?: string | null;
  onNotesChange?: (value: string) => void;
  max?: number;
}

export default function IntensityInput({
  label,
  value,
  onChange,
  notesValue,
  onNotesChange,
  max = 10,
}: IntensityInputProps) {
  // Display "Not rated" when value is null/undefined or 0
  const displayValue = value === null || value === undefined ? 'Not rated' : value;
  const sliderValue = value ?? 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    // If slider is at 0, treat as null (not rated)
    onChange(newValue === 0 ? null : newValue);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-medium text-muted-foreground">
          {displayValue}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max={max}
          value={sliderValue}
          onChange={handleSliderChange}
          className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        {value !== null && value !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => onChange(null)}
          >
            Clear
          </Button>
        )}
      </div>
      {onNotesChange !== undefined && (
        <Input
          value={notesValue ?? ''}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={`${label} notes...`}
          className="text-sm"
        />
      )}
    </div>
  );
}
