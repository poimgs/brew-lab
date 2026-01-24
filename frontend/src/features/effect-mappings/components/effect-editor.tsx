import type {
  EffectInput,
  OutputVariable,
  EffectDirection,
  Confidence,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface EffectEditorProps {
  effects: EffectInput[];
  onChange: (effects: EffectInput[]) => void;
  errors?: Record<number, Record<string, string>>;
}

const OUTPUT_VARIABLES: { value: OutputVariable; label: string }[] = [
  { value: "acidity", label: "Acidity" },
  { value: "sweetness", label: "Sweetness" },
  { value: "bitterness", label: "Bitterness" },
  { value: "body", label: "Body" },
  { value: "aroma", label: "Aroma" },
  { value: "aftertaste", label: "Aftertaste" },
  { value: "overall", label: "Overall" },
];

const EFFECT_DIRECTIONS: { value: EffectDirection; label: string }[] = [
  { value: "increase", label: "Increase" },
  { value: "decrease", label: "Decrease" },
  { value: "none", label: "No Change" },
];

const CONFIDENCE_LEVELS: { value: Confidence; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function EffectEditor({ effects, onChange, errors }: EffectEditorProps) {
  const addEffect = () => {
    onChange([
      ...effects,
      {
        output_variable: "sweetness",
        direction: "increase",
        confidence: "medium",
      },
    ]);
  };

  const removeEffect = (index: number) => {
    onChange(effects.filter((_, i) => i !== index));
  };

  const updateEffect = (index: number, updates: Partial<EffectInput>) => {
    onChange(
      effects.map((effect, i) =>
        i === index ? { ...effect, ...updates } : effect
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">
          Effects <span className="text-destructive">*</span>
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addEffect}>
          <Plus className="mr-1 h-4 w-4" />
          Add Effect
        </Button>
      </div>

      {effects.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          No effects added. Click "Add Effect" to define what happens when this
          variable changes.
        </p>
      )}

      <div className="space-y-4">
        {effects.map((effect, index) => (
          <div
            key={index}
            className="grid gap-3 p-4 border rounded-lg bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Effect {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeEffect(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`output-${index}`}>Output Variable</Label>
                <Select
                  value={effect.output_variable}
                  onValueChange={(value) =>
                    updateEffect(index, {
                      output_variable: value as OutputVariable,
                    })
                  }
                >
                  <SelectTrigger id={`output-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_VARIABLES.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors?.[index]?.output_variable && (
                  <p className="text-sm text-destructive">
                    {errors[index].output_variable}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`direction-${index}`}>Direction</Label>
                <Select
                  value={effect.direction}
                  onValueChange={(value) =>
                    updateEffect(index, {
                      direction: value as EffectDirection,
                    })
                  }
                >
                  <SelectTrigger id={`direction-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EFFECT_DIRECTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors?.[index]?.direction && (
                  <p className="text-sm text-destructive">
                    {errors[index].direction}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`confidence-${index}`}>Confidence</Label>
                <Select
                  value={effect.confidence}
                  onValueChange={(value) =>
                    updateEffect(index, { confidence: value as Confidence })
                  }
                >
                  <SelectTrigger id={`confidence-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONFIDENCE_LEVELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors?.[index]?.confidence && (
                  <p className="text-sm text-destructive">
                    {errors[index].confidence}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`range-min-${index}`}>Range Min (optional)</Label>
                <Input
                  id={`range-min-${index}`}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={effect.range_min ?? ""}
                  onChange={(e) =>
                    updateEffect(index, {
                      range_min: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`range-max-${index}`}>Range Max (optional)</Label>
                <Input
                  id={`range-max-${index}`}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={effect.range_max ?? ""}
                  onChange={(e) =>
                    updateEffect(index, {
                      range_max: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
