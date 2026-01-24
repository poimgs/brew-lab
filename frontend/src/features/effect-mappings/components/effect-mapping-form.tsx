import { useState, useEffect } from "react";
import type {
  EffectMapping,
  EffectMappingFormData,
  InputVariable,
  MappingDirection,
  EffectInput,
} from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EffectEditor } from "./effect-editor";

interface EffectMappingFormProps {
  mapping?: EffectMapping;
  onSubmit: (data: EffectMappingFormData) => void;
  isSubmitting: boolean;
  formId: string;
}

const INPUT_VARIABLES: { value: InputVariable; label: string }[] = [
  { value: "temperature", label: "Temperature" },
  { value: "ratio", label: "Ratio" },
  { value: "grind_size", label: "Grind Size" },
  { value: "bloom_time", label: "Bloom Time" },
  { value: "total_brew_time", label: "Brew Time" },
  { value: "coffee_weight", label: "Coffee Weight" },
  { value: "pour_count", label: "Pour Count" },
  { value: "pour_technique", label: "Pour Technique" },
  { value: "filter_type", label: "Filter Type" },
];

const DIRECTIONS: { value: MappingDirection; label: string }[] = [
  { value: "increase", label: "Increase" },
  { value: "decrease", label: "Decrease" },
];

export function EffectMappingForm({
  mapping,
  onSubmit,
  isSubmitting,
  formId,
}: EffectMappingFormProps) {
  const [name, setName] = useState(mapping?.name ?? "");
  const [variable, setVariable] = useState<InputVariable>(
    mapping?.variable ?? "temperature"
  );
  const [direction, setDirection] = useState<MappingDirection>(
    mapping?.direction ?? "increase"
  );
  const [tickDescription, setTickDescription] = useState(
    mapping?.tick_description ?? ""
  );
  const [source, setSource] = useState(mapping?.source ?? "");
  const [notes, setNotes] = useState(mapping?.notes ?? "");
  const [effects, setEffects] = useState<EffectInput[]>(
    mapping?.effects.map((e) => ({
      output_variable: e.output_variable,
      direction: e.direction,
      range_min: e.range_min,
      range_max: e.range_max,
      confidence: e.confidence,
    })) ?? []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mapping) {
      setName(mapping.name);
      setVariable(mapping.variable);
      setDirection(mapping.direction);
      setTickDescription(mapping.tick_description);
      setSource(mapping.source ?? "");
      setNotes(mapping.notes ?? "");
      setEffects(
        mapping.effects.map((e) => ({
          output_variable: e.output_variable,
          direction: e.direction,
          range_min: e.range_min,
          range_max: e.range_max,
          confidence: e.confidence,
        }))
      );
    }
  }, [mapping]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!tickDescription.trim()) {
      newErrors.tickDescription = "Tick description is required";
    }

    if (effects.length === 0) {
      newErrors.effects = "At least one effect is required";
    }

    // Validate range min/max
    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i];
      if (
        effect.range_min !== undefined &&
        effect.range_max !== undefined &&
        effect.range_min > effect.range_max
      ) {
        newErrors[`effect_${i}_range`] =
          "Range min must be less than or equal to range max";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const data: EffectMappingFormData = {
      name: name.trim(),
      variable,
      direction,
      tick_description: tickDescription.trim(),
      source: source.trim() || undefined,
      notes: notes.trim() || undefined,
      effects,
    };

    onSubmit(data);
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Higher Temperature Effect"
          required
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="variable">
            Input Variable <span className="text-destructive">*</span>
          </Label>
          <Select
            value={variable}
            onValueChange={(value) => setVariable(value as InputVariable)}
          >
            <SelectTrigger id="variable">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INPUT_VARIABLES.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="direction">
            Direction <span className="text-destructive">*</span>
          </Label>
          <Select
            value={direction}
            onValueChange={(value) => setDirection(value as MappingDirection)}
          >
            <SelectTrigger id="direction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIRECTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tickDescription">
          Tick Description <span className="text-destructive">*</span>
        </Label>
        <Input
          id="tickDescription"
          value={tickDescription}
          onChange={(e) => setTickDescription(e.target.value)}
          placeholder="e.g., +5C or -10 clicks"
          required
        />
        <p className="text-xs text-muted-foreground">
          Describe the change amount (e.g., "+5C", "-10 clicks", "finer by 2
          steps")
        </p>
        {errors.tickDescription && (
          <p className="text-sm text-destructive">{errors.tickDescription}</p>
        )}
      </div>

      <EffectEditor effects={effects} onChange={setEffects} />
      {errors.effects && (
        <p className="text-sm text-destructive">{errors.effects}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="source">Source (optional)</Label>
        <Input
          id="source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g., James Hoffmann, personal testing"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes about this effect mapping..."
          rows={3}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="sr-only"
        aria-hidden="true"
      />
    </form>
  );
}
