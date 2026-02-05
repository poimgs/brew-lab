import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CoffeeSelector from './CoffeeSelector';
import ReferenceSidebar from './ReferenceSidebar';
import { type Experiment, type CreateExperimentInput, createExperiment, updateExperiment } from '@/api/experiments';
import { getDefaults, type Defaults } from '@/api/defaults';
import { listFilterPapers, type FilterPaper } from '@/api/filter-papers';
import { type Coffee, type CoffeeReference, type ReferenceExperiment, getReference, getCoffee } from '@/api/coffees';

const POUR_STYLES = ['circular', 'center', 'pulse'] as const;
const SERVING_TEMPS = ['Hot', 'Warm', 'Cold'] as const;

const pourSchema = z.object({
  pour_number: z.number(),
  water_amount: z.number().positive().optional().nullable(),
  pour_style: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const experimentSchema = z.object({
  coffee_id: z.string().min(1, 'Coffee is required'),

  // Pre-brew variables
  coffee_weight: z.number().positive().optional().nullable(),
  water_weight: z.number().positive().optional().nullable(),
  ratio: z.number().positive().optional().nullable(),
  grind_size: z.number().positive().optional().nullable(),
  water_temperature: z.number().min(0).max(100).optional().nullable(),
  filter_paper_id: z.string().optional().nullable(),

  // Brew variables
  bloom_water: z.number().positive().optional().nullable(),
  bloom_time: z.number().int().positive().optional().nullable(),
  pours: z.array(pourSchema).optional(),
  total_brew_time: z.number().int().positive().optional().nullable(),
  drawdown_time: z.number().int().positive().optional().nullable(),
  technique_notes: z.string().optional().nullable(),

  // Post-brew variables
  serving_temperature: z.string().optional().nullable(),
  water_bypass: z.string().optional().nullable(),
  mineral_additions: z.string().optional().nullable(),

  // Quantitative outcomes
  final_weight: z.number().positive().optional().nullable(),
  tds: z.number().min(0).max(30).optional().nullable(),
  extraction_yield: z.number().min(0).max(30).optional().nullable(),

  // Sensory outcomes (1-10 scale)
  aroma_intensity: z.number().int().min(1).max(10).optional().nullable(),
  aroma_notes: z.string().optional().nullable(),
  acidity_intensity: z.number().int().min(1).max(10).optional().nullable(),
  acidity_notes: z.string().optional().nullable(),
  sweetness_intensity: z.number().int().min(1).max(10).optional().nullable(),
  sweetness_notes: z.string().optional().nullable(),
  bitterness_intensity: z.number().int().min(1).max(10).optional().nullable(),
  bitterness_notes: z.string().optional().nullable(),
  body_weight: z.number().int().min(1).max(10).optional().nullable(),
  body_notes: z.string().optional().nullable(),
  flavor_intensity: z.number().int().min(1).max(10).optional().nullable(),
  flavor_notes: z.string().optional().nullable(),
  aftertaste_duration: z.number().int().min(1).max(10).optional().nullable(),
  aftertaste_intensity: z.number().int().min(1).max(10).optional().nullable(),
  aftertaste_notes: z.string().optional().nullable(),

  // Overall assessment
  overall_score: z.number().int().min(1).max(10).optional().nullable(),
  overall_notes: z.string().min(10, 'Notes must be at least 10 characters'),
  improvement_notes: z.string().optional().nullable(),
});

type ExperimentFormData = z.infer<typeof experimentSchema>;

interface ExperimentFormProps {
  experiment?: Experiment;
  onSuccess: () => void;
  onCancel: () => void;
}

// Collapsible section component
function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left font-medium hover:bg-muted/50 transition-colors"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4 pt-2 border-t">{children}</div>}
    </div>
  );
}

// Intensity slider component
function IntensityInput({
  label,
  value,
  onChange,
  notesValue,
  onNotesChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  notesValue?: string | null;
  onNotesChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-medium">{value ?? '-'}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="1"
          max="10"
          value={value ?? 5}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onChange(null)}
        >
          Clear
        </Button>
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

export default function ExperimentForm({ experiment, onSuccess, onCancel }: ExperimentFormProps) {
  const [searchParams] = useSearchParams();
  const initialCoffeeId = searchParams.get('coffee_id');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCoffee, setSelectedCoffee] = useState<Coffee | null>(null);
  const [filterPapers, setFilterPapers] = useState<FilterPaper[]>([]);
  const [defaults, setDefaults] = useState<Defaults>({});
  const [reference, setReference] = useState<CoffeeReference | null>(null);
  const [isLoadingReference, setIsLoadingReference] = useState(false);

  // Section open states
  const [openSections, setOpenSections] = useState({
    preBrew: !!experiment,
    brew: !!experiment,
    postBrew: !!experiment,
    quantitative: !!experiment,
    sensory: !!experiment,
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExperimentFormData>({
    resolver: zodResolver(experimentSchema),
    defaultValues: {
      coffee_id: experiment?.coffee_id || initialCoffeeId || '',
      coffee_weight: experiment?.coffee_weight ?? null,
      water_weight: experiment?.water_weight ?? null,
      ratio: experiment?.ratio ?? null,
      grind_size: experiment?.grind_size ?? null,
      water_temperature: experiment?.water_temperature ?? null,
      filter_paper_id: experiment?.filter_paper_id || '',
      bloom_water: experiment?.bloom_water ?? null,
      bloom_time: experiment?.bloom_time ?? null,
      pours: experiment?.pours?.map((p) => ({
        pour_number: p.pour_number,
        water_amount: p.water_amount ?? null,
        pour_style: p.pour_style ?? null,
        notes: p.notes ?? null,
      })) || [],
      total_brew_time: experiment?.total_brew_time ?? null,
      drawdown_time: experiment?.drawdown_time ?? null,
      technique_notes: experiment?.technique_notes || '',
      serving_temperature: experiment?.serving_temperature || '',
      water_bypass: experiment?.water_bypass || '',
      mineral_additions: experiment?.mineral_additions || '',
      final_weight: experiment?.final_weight ?? null,
      tds: experiment?.tds ?? null,
      extraction_yield: experiment?.extraction_yield ?? null,
      aroma_intensity: experiment?.aroma_intensity ?? null,
      aroma_notes: experiment?.aroma_notes || '',
      acidity_intensity: experiment?.acidity_intensity ?? null,
      acidity_notes: experiment?.acidity_notes || '',
      sweetness_intensity: experiment?.sweetness_intensity ?? null,
      sweetness_notes: experiment?.sweetness_notes || '',
      bitterness_intensity: experiment?.bitterness_intensity ?? null,
      bitterness_notes: experiment?.bitterness_notes || '',
      body_weight: experiment?.body_weight ?? null,
      body_notes: experiment?.body_notes || '',
      flavor_intensity: experiment?.flavor_intensity ?? null,
      flavor_notes: experiment?.flavor_notes || '',
      aftertaste_duration: experiment?.aftertaste_duration ?? null,
      aftertaste_intensity: experiment?.aftertaste_intensity ?? null,
      aftertaste_notes: experiment?.aftertaste_notes || '',
      overall_score: experiment?.overall_score ?? null,
      overall_notes: experiment?.overall_notes || '',
      improvement_notes: experiment?.improvement_notes || '',
    },
  });

  const { fields: pourFields, append: appendPour, remove: removePour } = useFieldArray({
    control,
    name: 'pours',
  });

  const coffeeWeight = watch('coffee_weight');
  const ratio = watch('ratio');
  const waterWeight = watch('water_weight');
  const tds = watch('tds');
  const finalWeight = watch('final_weight');

  // Load filter papers, defaults, and initial coffee from URL
  useEffect(() => {
    const loadData = async () => {
      try {
        const [papersResponse, defaultsData] = await Promise.all([
          listFilterPapers({ per_page: 100 }),
          getDefaults(),
        ]);
        setFilterPapers(papersResponse.items || []);
        setDefaults(defaultsData);
      } catch {
        // Ignore errors
      }
    };
    loadData();
  }, []);

  // Load initial coffee from URL parameter
  useEffect(() => {
    if (initialCoffeeId && !experiment) {
      const loadInitialCoffee = async () => {
        try {
          const coffee = await getCoffee(initialCoffeeId);
          setSelectedCoffee(coffee);
        } catch {
          // Ignore errors - coffee might not exist
        }
      };
      loadInitialCoffee();
    }
  }, [initialCoffeeId, experiment]);

  // Fetch reference data when coffee changes
  useEffect(() => {
    if (!selectedCoffee) {
      setReference(null);
      return;
    }

    const fetchReference = async () => {
      setIsLoadingReference(true);
      try {
        const data = await getReference(selectedCoffee.id);
        setReference(data);
      } catch {
        setReference(null);
      } finally {
        setIsLoadingReference(false);
      }
    };

    fetchReference();
  }, [selectedCoffee]);

  // Apply defaults when opening a section for the first time (only for new experiments)
  const applyDefaultsToSection = useCallback((section: string) => {
    if (experiment) return; // Don't apply defaults when editing

    if (section === 'preBrew') {
      if (defaults.coffee_weight && !watch('coffee_weight')) {
        setValue('coffee_weight', parseFloat(defaults.coffee_weight));
      }
      if (defaults.ratio && !watch('ratio')) {
        setValue('ratio', parseFloat(defaults.ratio));
      }
      if (defaults.grind_size && !watch('grind_size')) {
        setValue('grind_size', parseFloat(defaults.grind_size));
      }
      if (defaults.water_temperature && !watch('water_temperature')) {
        setValue('water_temperature', parseFloat(defaults.water_temperature));
      }
      if (defaults.filter_paper_id && !watch('filter_paper_id')) {
        setValue('filter_paper_id', defaults.filter_paper_id);
      }
    } else if (section === 'brew') {
      if (defaults.bloom_water && !watch('bloom_water')) {
        setValue('bloom_water', parseFloat(defaults.bloom_water));
      }
      if (defaults.bloom_time && !watch('bloom_time')) {
        setValue('bloom_time', parseInt(defaults.bloom_time));
      }
    }
  }, [defaults, experiment, setValue, watch]);

  const toggleSection = (section: keyof typeof openSections) => {
    const wasOpen = openSections[section];
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

    // Apply defaults when opening a section for the first time
    if (!wasOpen) {
      applyDefaultsToSection(section);
    }
  };

  // Calculate water weight from coffee weight and ratio
  useEffect(() => {
    if (coffeeWeight && ratio && !waterWeight) {
      const calculated = coffeeWeight * ratio;
      setValue('water_weight', Math.round(calculated * 10) / 10);
    }
  }, [coffeeWeight, ratio, waterWeight, setValue]);

  // Calculate extraction yield from TDS, final weight, and coffee weight
  useEffect(() => {
    if (tds && finalWeight && coffeeWeight) {
      const ey = (finalWeight * (tds / 100)) / coffeeWeight * 100;
      setValue('extraction_yield', Math.round(ey * 100) / 100);
    }
  }, [tds, finalWeight, coffeeWeight, setValue]);

  const handleCoffeeChange = (coffeeId: string, coffee: Coffee) => {
    setValue('coffee_id', coffeeId);
    setSelectedCoffee(coffee);
  };

  const handleCopyParameters = (exp: ReferenceExperiment) => {
    // Copy input parameters from the reference experiment
    if (exp.coffee_weight) setValue('coffee_weight', exp.coffee_weight);
    if (exp.ratio) setValue('ratio', exp.ratio);
    if (exp.water_weight) setValue('water_weight', exp.water_weight);
    if (exp.grind_size) setValue('grind_size', exp.grind_size);
    if (exp.water_temperature) setValue('water_temperature', exp.water_temperature);
    if (exp.filter_paper?.id) setValue('filter_paper_id', exp.filter_paper.id);
    if (exp.bloom_water) setValue('bloom_water', exp.bloom_water);
    if (exp.bloom_time) setValue('bloom_time', exp.bloom_time);

    // Open the pre-brew and brew sections so user can see the copied values
    setOpenSections((prev) => ({
      ...prev,
      preBrew: true,
      brew: true,
    }));
  };

  const onSubmit = async (data: ExperimentFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Convert null values to undefined for the API
      const cleanData = (obj: Record<string, unknown>): Record<string, unknown> => {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value === null || value === '') {
            continue;
          }
          if (Array.isArray(value)) {
            result[key] = value.map((item) =>
              typeof item === 'object' && item !== null ? cleanData(item as Record<string, unknown>) : item
            );
          } else if (typeof value === 'object' && value !== null) {
            result[key] = cleanData(value as Record<string, unknown>);
          } else {
            result[key] = value;
          }
        }
        return result;
      };

      const input = cleanData(data as unknown as Record<string, unknown>) as unknown as CreateExperimentInput;

      if (experiment) {
        await updateExperiment(experiment.id, input);
      } else {
        await createExperiment(input);
      }
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setSubmitError(error.response?.data?.error || 'Failed to save experiment');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <Button variant="ghost" onClick={onCancel} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Form */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>{experiment ? 'Edit Experiment' : 'New Experiment'}</CardTitle>
            {selectedCoffee && (
              <p className="text-sm text-muted-foreground">
                {selectedCoffee.name} · {selectedCoffee.roaster}
                {selectedCoffee.days_off_roast !== undefined && ` · ${selectedCoffee.days_off_roast} days off roast`}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {submitError && (
                <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
                  {submitError}
                </div>
              )}

              {/* Coffee Selection */}
              <Controller
                name="coffee_id"
                control={control}
                render={({ field }) => (
                  <CoffeeSelector
                    value={field.value}
                    onChange={handleCoffeeChange}
                    error={errors.coffee_id?.message}
                  />
                )}
              />

            {/* Overall Notes (Required) */}
            <div className="space-y-2">
              <Label htmlFor="overall_notes" className={errors.overall_notes ? 'text-destructive' : ''}>
                Overall Notes *
              </Label>
              <Textarea
                id="overall_notes"
                {...register('overall_notes')}
                placeholder="How did this brew taste? What stood out?"
                rows={3}
                className={errors.overall_notes ? 'border-destructive' : ''}
              />
              {errors.overall_notes && (
                <p className="text-sm text-destructive">{errors.overall_notes.message}</p>
              )}
            </div>

            {/* Overall Score */}
            <Controller
              name="overall_score"
              control={control}
              render={({ field }) => (
                <IntensityInput
                  label="Overall Score (1-10)"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            {/* Improvement Notes */}
            <div className="space-y-2">
              <Label htmlFor="improvement_notes">Ideas for Next Time</Label>
              <Textarea
                id="improvement_notes"
                {...register('improvement_notes')}
                placeholder="What would you try differently?"
                rows={2}
              />
            </div>

            {/* Collapsible Sections */}
            <div className="space-y-3">
              {/* Pre-Brew Variables */}
              <CollapsibleSection
                title="Pre-Brew Variables"
                isOpen={openSections.preBrew}
                onToggle={() => toggleSection('preBrew')}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="coffee_weight">Coffee Weight (g)</Label>
                    <Input
                      id="coffee_weight"
                      type="number"
                      step="0.1"
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
                    <Label htmlFor="water_weight">
                      Water Weight (g)
                      {coffeeWeight && ratio && (
                        <span className="ml-2 text-xs text-muted-foreground">(calculated)</span>
                      )}
                    </Label>
                    <Input
                      id="water_weight"
                      type="number"
                      step="0.1"
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
                    <Label htmlFor="water_temperature">Water Temperature (°C)</Label>
                    <Input
                      id="water_temperature"
                      type="number"
                      step="0.1"
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
              </CollapsibleSection>

              {/* Brew Variables */}
              <CollapsibleSection
                title="Brew Variables"
                isOpen={openSections.brew}
                onToggle={() => toggleSection('brew')}
              >
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="bloom_water">Bloom Water (g)</Label>
                      <Input
                        id="bloom_water"
                        type="number"
                        step="0.1"
                        {...register('bloom_water', { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bloom_time">Bloom Time (seconds)</Label>
                      <Input
                        id="bloom_time"
                        type="number"
                        {...register('bloom_time', { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  {/* Pours */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Pours</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addPour}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Pour
                      </Button>
                    </div>
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
                        {...register('total_brew_time', { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="drawdown_time">Drawdown Time (seconds)</Label>
                      <Input
                        id="drawdown_time"
                        type="number"
                        {...register('drawdown_time', { valueAsNumber: true })}
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
              </CollapsibleSection>

              {/* Post-Brew Variables */}
              <CollapsibleSection
                title="Post-Brew Variables"
                isOpen={openSections.postBrew}
                onToggle={() => toggleSection('postBrew')}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Serving Temperature</Label>
                    <Controller
                      name="serving_temperature"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select temperature" />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVING_TEMPS.map((temp) => (
                              <SelectItem key={temp} value={temp}>
                                {temp}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="water_bypass">Water Bypass</Label>
                    <Input
                      id="water_bypass"
                      {...register('water_bypass')}
                      placeholder="e.g., 5 drops"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="mineral_additions">Mineral Additions</Label>
                    <Input
                      id="mineral_additions"
                      {...register('mineral_additions')}
                      placeholder="e.g., 2 drops Catalyst"
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Quantitative Outcomes */}
              <CollapsibleSection
                title="Quantitative Outcomes"
                isOpen={openSections.quantitative}
                onToggle={() => toggleSection('quantitative')}
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="final_weight">Final Weight (g)</Label>
                    <Input
                      id="final_weight"
                      type="number"
                      step="0.1"
                      {...register('final_weight', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tds">TDS (%)</Label>
                    <Input
                      id="tds"
                      type="number"
                      step="0.01"
                      {...register('tds', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="extraction_yield">
                      Extraction Yield (%)
                      {tds && finalWeight && coffeeWeight && (
                        <span className="ml-2 text-xs text-muted-foreground">(calculated)</span>
                      )}
                    </Label>
                    <Input
                      id="extraction_yield"
                      type="number"
                      step="0.01"
                      {...register('extraction_yield', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Sensory Outcomes */}
              <CollapsibleSection
                title="Sensory Outcomes"
                isOpen={openSections.sensory}
                onToggle={() => toggleSection('sensory')}
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <Controller
                    name="aroma_intensity"
                    control={control}
                    render={({ field }) => (
                      <IntensityInput
                        label="Aroma"
                        value={field.value}
                        onChange={field.onChange}
                        notesValue={watch('aroma_notes')}
                        onNotesChange={(v) => setValue('aroma_notes', v)}
                      />
                    )}
                  />
                  <Controller
                    name="acidity_intensity"
                    control={control}
                    render={({ field }) => (
                      <IntensityInput
                        label="Acidity"
                        value={field.value}
                        onChange={field.onChange}
                        notesValue={watch('acidity_notes')}
                        onNotesChange={(v) => setValue('acidity_notes', v)}
                      />
                    )}
                  />
                  <Controller
                    name="sweetness_intensity"
                    control={control}
                    render={({ field }) => (
                      <IntensityInput
                        label="Sweetness"
                        value={field.value}
                        onChange={field.onChange}
                        notesValue={watch('sweetness_notes')}
                        onNotesChange={(v) => setValue('sweetness_notes', v)}
                      />
                    )}
                  />
                  <Controller
                    name="bitterness_intensity"
                    control={control}
                    render={({ field }) => (
                      <IntensityInput
                        label="Bitterness"
                        value={field.value}
                        onChange={field.onChange}
                        notesValue={watch('bitterness_notes')}
                        onNotesChange={(v) => setValue('bitterness_notes', v)}
                      />
                    )}
                  />
                  <Controller
                    name="body_weight"
                    control={control}
                    render={({ field }) => (
                      <IntensityInput
                        label="Body"
                        value={field.value}
                        onChange={field.onChange}
                        notesValue={watch('body_notes')}
                        onNotesChange={(v) => setValue('body_notes', v)}
                      />
                    )}
                  />
                  <Controller
                    name="flavor_intensity"
                    control={control}
                    render={({ field }) => (
                      <IntensityInput
                        label="Flavor"
                        value={field.value}
                        onChange={field.onChange}
                        notesValue={watch('flavor_notes')}
                        onNotesChange={(v) => setValue('flavor_notes', v)}
                      />
                    )}
                  />
                  <Controller
                    name="aftertaste_duration"
                    control={control}
                    render={({ field }) => (
                      <IntensityInput
                        label="Aftertaste Duration"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="aftertaste_intensity"
                    control={control}
                    render={({ field }) => (
                      <IntensityInput
                        label="Aftertaste Intensity"
                        value={field.value}
                        onChange={field.onChange}
                        notesValue={watch('aftertaste_notes')}
                        onNotesChange={(v) => setValue('aftertaste_notes', v)}
                      />
                    )}
                  />
                </div>
              </CollapsibleSection>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {experiment ? 'Save Changes' : 'Save Experiment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

        {/* Reference Sidebar - visible when coffee is selected */}
        {selectedCoffee && (
          <div className="lg:w-80 lg:shrink-0">
            <ReferenceSidebar
              reference={reference}
              isLoading={isLoadingReference}
              onCopyParameters={handleCopyParameters}
            />
          </div>
        )}
      </div>
    </div>
  );
}
