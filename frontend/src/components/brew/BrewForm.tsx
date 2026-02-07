import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAutoSave, type AutoSaveStatus } from '@/hooks/useAutoSave';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReferenceSidebar from './ReferenceSidebar';
import { WizardProvider, useWizard } from './wizard/WizardContext';
import WizardProgress from './wizard/WizardProgress';
import WizardNavigation from './wizard/WizardNavigation';
import {
  CoffeeSelectionStep,
  PreBrewStep,
  BrewStep,
  PostBrewStep,
  QuantitativeStep,
  SensoryStep,
  ImprovementStep,
} from './wizard/steps';
import { type Brew, type CreateBrewInput, createBrew, updateBrew, listBrews } from '@/api/brews';
import { getDefaults, type Defaults, type PourDefault } from '@/api/defaults';
import { listFilterPapers, type FilterPaper } from '@/api/filter-papers';
import { listMineralProfiles, type MineralProfile } from '@/api/mineral-profiles';
import { type Coffee, type CoffeeReference, type ReferenceBrew, getReference, getCoffee } from '@/api/coffees';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ReferencePickerDialog from './ReferencePickerDialog';
import { getCoffeeGoal, upsertCoffeeGoal, type CoffeeGoalInput } from '@/api/coffee-goals';

// Helpers to handle NaN from empty number inputs (valueAsNumber returns NaN for empty)
const nanToNull = (v: unknown) => (typeof v === 'number' && Number.isNaN(v) ? null : v);
const optionalPositive = z.preprocess(nanToNull, z.number().positive().optional().nullable());
const optionalPositiveInt = z.preprocess(nanToNull, z.number().int().positive().optional().nullable());
const optionalRange = (min: number, max: number) =>
  z.preprocess(nanToNull, z.number().min(min).max(max).optional().nullable());
const optionalIntRange = (min: number, max: number) =>
  z.preprocess(nanToNull, z.number().int().min(min).max(max).optional().nullable());

const pourSchema = z.object({
  pour_number: z.number(),
  water_amount: optionalPositive,
  pour_style: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const brewSchema = z.object({
  coffee_id: z.string().min(1, 'Coffee is required'),
  roast_date: z.string().optional().nullable(),

  // Pre-brew variables
  coffee_weight: optionalPositive,
  water_weight: optionalPositive,
  ratio: optionalPositive,
  grind_size: optionalPositive,
  water_temperature: optionalRange(0, 100),
  filter_paper_id: z.string().optional().nullable(),

  // Brew variables
  bloom_water: optionalPositive,
  bloom_time: optionalPositiveInt,
  pours: z.array(pourSchema).optional(),
  total_brew_time: optionalPositiveInt,
  technique_notes: z.string().optional().nullable(),

  // Post-brew variables
  water_bypass_ml: optionalPositive,
  mineral_profile_id: z.string().optional().nullable(),

  // Quantitative outcomes
  coffee_ml: optionalPositive,
  tds: optionalRange(0, 30),
  extraction_yield: optionalRange(0, 30),
  drawdown_time: optionalPositiveInt,

  // Sensory outcomes (1-10 scale)
  aroma_intensity: optionalIntRange(1, 10),
  aroma_notes: z.string().optional().nullable(),
  body_intensity: optionalIntRange(1, 10),
  body_notes: z.string().optional().nullable(),
  flavor_intensity: optionalIntRange(1, 10),
  flavor_notes: z.string().optional().nullable(),
  brightness_intensity: optionalIntRange(1, 10),
  brightness_notes: z.string().optional().nullable(),
  sweetness_intensity: optionalIntRange(1, 10),
  sweetness_notes: z.string().optional().nullable(),
  cleanliness_intensity: optionalIntRange(1, 10),
  cleanliness_notes: z.string().optional().nullable(),
  complexity_intensity: optionalIntRange(1, 10),
  complexity_notes: z.string().optional().nullable(),
  balance_intensity: optionalIntRange(1, 10),
  balance_notes: z.string().optional().nullable(),
  aftertaste_intensity: optionalIntRange(1, 10),
  aftertaste_notes: z.string().optional().nullable(),

  // Overall assessment
  overall_score: optionalIntRange(1, 10),
  overall_notes: z.string().optional().nullable(),
  improvement_notes: z.string().optional().nullable(),
});

type BrewFormData = z.infer<typeof brewSchema>;

// Convert null/empty values to undefined for the API
function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
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
}

function formatAutoSaveStatus(status: AutoSaveStatus, lastSavedAt: Date | null): string | null {
  switch (status) {
    case 'saving':
      return 'Saving...';
    case 'saved':
      if (lastSavedAt) {
        return `Saved at ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return 'Saved';
    case 'error':
      return 'Save failed';
    default:
      return null;
  }
}

interface BrewFormProps {
  brew?: Brew;
  onSuccess: () => void;
  onCancel: () => void;
}

function BrewFormContent({ brew, onSuccess, onCancel }: BrewFormProps) {
  const [searchParams] = useSearchParams();
  const initialCoffeeId = searchParams.get('coffee_id');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCoffee, setSelectedCoffee] = useState<Coffee | null>(null);
  const [filterPapers, setFilterPapers] = useState<FilterPaper[]>([]);
  const [mineralProfiles, setMineralProfiles] = useState<MineralProfile[]>([]);
  const [defaults, setDefaults] = useState<Defaults>({});
  const [reference, setReference] = useState<CoffeeReference | null>(null);
  const [isLoadingReference, setIsLoadingReference] = useState(false);
  const [waterWeightManuallySet, setWaterWeightManuallySet] = useState(false);
  const [coffeeGoals, setCoffeeGoals] = useState<CoffeeGoalInput>({});
  const [goalsDirty, setGoalsDirty] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coffeeBrews, setCoffeeBrews] = useState<Brew[]>([]);
  const [isLoadingBrews, setIsLoadingBrews] = useState(false);
  const [overrideReference, setOverrideReference] = useState<CoffeeReference | null>(null);
  const [autoSaveDraftId, setAutoSaveDraftId] = useState<string | null>(brew?.id ?? null);

  const { currentStep } = useWizard();

  const effectiveReference = overrideReference || reference;

  const methods = useForm<BrewFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(brewSchema) as any,
    defaultValues: {
      coffee_id: brew?.coffee_id || initialCoffeeId || '',
      roast_date: brew?.roast_date || '',
      coffee_weight: brew?.coffee_weight ?? null,
      water_weight: brew?.water_weight ?? null,
      ratio: brew?.ratio ?? null,
      grind_size: brew?.grind_size ?? null,
      water_temperature: brew?.water_temperature ?? null,
      filter_paper_id: brew?.filter_paper_id || '',
      bloom_water: brew?.bloom_water ?? null,
      bloom_time: brew?.bloom_time ?? null,
      pours: brew?.pours?.map((p) => ({
        pour_number: p.pour_number,
        water_amount: p.water_amount ?? null,
        pour_style: p.pour_style ?? null,
        notes: p.notes ?? null,
      })) || [],
      total_brew_time: brew?.total_brew_time ?? null,
      technique_notes: brew?.technique_notes || '',
      water_bypass_ml: brew?.water_bypass_ml ?? null,
      mineral_profile_id: brew?.mineral_profile_id || '',
      coffee_ml: brew?.coffee_ml ?? null,
      tds: brew?.tds ?? null,
      extraction_yield: brew?.extraction_yield ?? null,
      drawdown_time: brew?.drawdown_time ?? null,
      aroma_intensity: brew?.aroma_intensity ?? null,
      aroma_notes: brew?.aroma_notes || '',
      body_intensity: brew?.body_intensity ?? null,
      body_notes: brew?.body_notes || '',
      flavor_intensity: brew?.flavor_intensity ?? null,
      flavor_notes: brew?.flavor_notes || '',
      brightness_intensity: brew?.brightness_intensity ?? null,
      brightness_notes: brew?.brightness_notes || '',
      sweetness_intensity: brew?.sweetness_intensity ?? null,
      sweetness_notes: brew?.sweetness_notes || '',
      cleanliness_intensity: brew?.cleanliness_intensity ?? null,
      cleanliness_notes: brew?.cleanliness_notes || '',
      complexity_intensity: brew?.complexity_intensity ?? null,
      complexity_notes: brew?.complexity_notes || '',
      balance_intensity: brew?.balance_intensity ?? null,
      balance_notes: brew?.balance_notes || '',
      aftertaste_intensity: brew?.aftertaste_intensity ?? null,
      aftertaste_notes: brew?.aftertaste_notes || '',
      overall_score: brew?.overall_score ?? null,
      overall_notes: brew?.overall_notes || '',
      improvement_notes: brew?.improvement_notes || '',
    },
  });

  const { setValue, watch } = methods;
  const coffeeWeight = watch('coffee_weight');
  const ratio = watch('ratio');
  const tds = watch('tds');
  const coffeeMl = watch('coffee_ml');
  const watchedCoffeeId = watch('coffee_id');

  // Auto-save as draft every 60 seconds
  const getFormDataForAutoSave = useCallback(() => {
    const rawData = methods.getValues();
    const parsed = brewSchema.safeParse(rawData);
    const data = parsed.success ? parsed.data : rawData;
    return cleanData(data as unknown as Record<string, unknown>);
  }, [methods]);

  const handleAutoSave = useCallback(async (data: Record<string, unknown>) => {
    const input = { ...data, is_draft: true } as unknown as CreateBrewInput;
    if (autoSaveDraftId) {
      await updateBrew(autoSaveDraftId, input);
      return autoSaveDraftId;
    } else {
      const result = await createBrew(input);
      setAutoSaveDraftId(result.id);
      return result.id;
    }
  }, [autoSaveDraftId]);

  const { status: autoSaveStatus, lastSavedAt: autoSaveLastSavedAt } = useAutoSave({
    intervalMs: 60000,
    onSave: handleAutoSave,
    enabled: !!watchedCoffeeId && !isSubmitting,
    getFormData: getFormDataForAutoSave,
  });

  // Load filter papers, mineral profiles, defaults, and initial coffee
  useEffect(() => {
    const loadData = async () => {
      try {
        const [papersResponse, profilesResponse, defaultsData] = await Promise.all([
          listFilterPapers({ per_page: 100 }),
          listMineralProfiles(),
          getDefaults(),
        ]);
        setFilterPapers(papersResponse.items || []);
        setMineralProfiles(profilesResponse.items || []);
        setDefaults(defaultsData);
      } catch {
        // Ignore errors
      }
    };
    loadData();
  }, []);

  // Load initial coffee from URL parameter or from brew (edit mode)
  useEffect(() => {
    const coffeeIdToLoad = brew?.coffee_id || (initialCoffeeId && !brew ? initialCoffeeId : null);
    if (!coffeeIdToLoad) return;

    const loadCoffee = async () => {
      try {
        const coffee = await getCoffee(coffeeIdToLoad);
        setSelectedCoffee(coffee);
      } catch {
        // Ignore errors - coffee might not exist
      }
    };
    loadCoffee();
  }, [initialCoffeeId, brew]);

  // Fetch reference data and goals when coffee changes
  useEffect(() => {
    if (!selectedCoffee) {
      setReference(null);
      setOverrideReference(null);
      setCoffeeGoals({});
      setGoalsDirty(false);
      return;
    }

    setOverrideReference(null);

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

    const fetchGoals = async () => {
      try {
        const goals = await getCoffeeGoal(selectedCoffee.id);
        if (goals) {
          const { id, coffee_id, created_at, updated_at, ...goalFields } = goals;
          setCoffeeGoals(goalFields);
        } else {
          setCoffeeGoals({});
        }
      } catch {
        setCoffeeGoals({});
      }
      setGoalsDirty(false);
    };

    fetchReference();
    fetchGoals();
  }, [selectedCoffee]);

  // Apply defaults when entering a step (for new brews)
  useEffect(() => {
    if (brew) return; // Don't apply defaults when editing

    const getValues = methods.getValues;

    if (currentStep === 2) {
      // Pre-brew defaults
      if (defaults.coffee_weight && !getValues('coffee_weight')) {
        setValue('coffee_weight', parseFloat(defaults.coffee_weight));
      }
      if (defaults.ratio && !getValues('ratio')) {
        setValue('ratio', parseFloat(defaults.ratio));
      }
      if (defaults.grind_size && !getValues('grind_size')) {
        setValue('grind_size', parseFloat(defaults.grind_size));
      }
      if (defaults.water_temperature && !getValues('water_temperature')) {
        setValue('water_temperature', parseFloat(defaults.water_temperature));
      }
      if (defaults.filter_paper_id && !getValues('filter_paper_id')) {
        setValue('filter_paper_id', defaults.filter_paper_id);
      }
    } else if (currentStep === 3) {
      // Brew defaults
      if (defaults.bloom_water && !getValues('bloom_water')) {
        setValue('bloom_water', parseFloat(defaults.bloom_water));
      }
      if (defaults.bloom_time && !getValues('bloom_time')) {
        setValue('bloom_time', parseInt(defaults.bloom_time));
      }
      // Pour defaults - only apply if pours array is empty
      const currentPours = getValues('pours');
      if (defaults.pour_defaults && (!currentPours || currentPours.length === 0)) {
        try {
          const pourTemplates = JSON.parse(defaults.pour_defaults) as PourDefault[];
          if (Array.isArray(pourTemplates) && pourTemplates.length > 0) {
            const pours = pourTemplates.map((p, i) => ({
              pour_number: i + 1,
              water_amount: p.water_amount ?? null,
              pour_style: p.pour_style ?? null,
              notes: p.notes ?? null,
            }));
            setValue('pours', pours);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [currentStep, defaults, brew, setValue, methods]);

  // Calculate water weight from coffee weight and ratio (only if not manually set)
  useEffect(() => {
    if (coffeeWeight && ratio && !waterWeightManuallySet) {
      const calculated = coffeeWeight * ratio;
      setValue('water_weight', Math.round(calculated * 10) / 10);
    }
  }, [coffeeWeight, ratio, waterWeightManuallySet, setValue]);

  // Calculate extraction yield from TDS, coffee_ml, and coffee weight
  useEffect(() => {
    if (tds && coffeeMl && coffeeWeight) {
      const ey = (coffeeMl * (tds / 100)) / coffeeWeight * 100;
      setValue('extraction_yield', Math.round(ey * 100) / 100);
    }
  }, [tds, coffeeMl, coffeeWeight, setValue]);

  const handleCoffeeChange = (coffeeId: string, coffee: Coffee) => {
    setValue('coffee_id', coffeeId);
    setSelectedCoffee(coffee);
    // Auto-populate roast_date from coffee's roast_date for new brews
    if (!brew && coffee.roast_date && !methods.getValues('roast_date')) {
      setValue('roast_date', coffee.roast_date);
    }
  };

  const handleCopyParameters = (exp: ReferenceBrew) => {
    // Copy input parameters from the reference brew
    if (exp.coffee_weight) setValue('coffee_weight', exp.coffee_weight);
    if (exp.ratio) setValue('ratio', exp.ratio);
    if (exp.water_weight) {
      setValue('water_weight', exp.water_weight);
      setWaterWeightManuallySet(true); // Mark as manually set when copying
    }
    if (exp.grind_size) setValue('grind_size', exp.grind_size);
    if (exp.water_temperature) setValue('water_temperature', exp.water_temperature);
    if (exp.filter_paper?.id) setValue('filter_paper_id', exp.filter_paper.id);
    if (exp.bloom_water) setValue('bloom_water', exp.bloom_water);
    if (exp.bloom_time) setValue('bloom_time', exp.bloom_time);
  };

  const handleGoalChange = (field: keyof CoffeeGoalInput, value: number | null) => {
    setCoffeeGoals((prev) => ({ ...prev, [field]: value }));
    setGoalsDirty(true);
  };

  const saveGoalsIfDirty = async () => {
    if (!goalsDirty || !selectedCoffee) return;
    try {
      await upsertCoffeeGoal(selectedCoffee.id, coffeeGoals);
      setGoalsDirty(false);
    } catch {
      // Silently fail - goals save is non-blocking
    }
  };

  const handleOpenPicker = async () => {
    if (!selectedCoffee) return;
    setPickerOpen(true);
    setIsLoadingBrews(true);
    try {
      const response = await listBrews({
        coffee_id: selectedCoffee.id,
        per_page: 50,
        sort: '-brew_date',
      });
      setCoffeeBrews(response.items);
    } catch {
      setCoffeeBrews([]);
    } finally {
      setIsLoadingBrews(false);
    }
  };

  const handleSelectReference = (exp: Brew) => {
    const refExp: ReferenceBrew = {
      id: exp.id,
      brew_date: exp.brew_date,
      coffee_weight: exp.coffee_weight,
      water_weight: exp.water_weight,
      ratio: exp.ratio,
      grind_size: exp.grind_size,
      water_temperature: exp.water_temperature,
      filter_paper: exp.filter_paper
        ? { id: exp.filter_paper.id, name: exp.filter_paper.name, brand: exp.filter_paper.brand }
        : undefined,
      bloom_water: exp.bloom_water,
      bloom_time: exp.bloom_time,
      total_brew_time: exp.total_brew_time,
      tds: exp.tds,
      extraction_yield: exp.extraction_yield,
      overall_score: exp.overall_score,
      is_best: selectedCoffee?.best_brew_id === exp.id,
    };
    setOverrideReference({
      brew: refExp,
      goals: reference?.goals || null,
    });
  };

  // Handle form submission — only coffee_id is required
  const handleFormSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitError(null);

    const rawData = methods.getValues();

    // Only coffee_id is truly required
    if (!rawData.coffee_id) {
      setSubmitError('Coffee is required');
      return;
    }

    // Run schema for preprocessing (nanToNull, range clamping)
    const parsed = brewSchema.safeParse(rawData);
    const data = parsed.success ? parsed.data : rawData;

    await onSubmit(data);
  };

  const onSubmit = async (data: BrewFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await saveGoalsIfDirty();

      const input = cleanData(data as unknown as Record<string, unknown>) as unknown as CreateBrewInput;
      // Final save: mark as non-draft
      input.is_draft = false;

      // If we have a draft ID (from auto-save or editing), update it; otherwise create
      const existingId = brew?.id || autoSaveDraftId;
      if (existingId) {
        await updateBrew(existingId, input);
      } else {
        await createBrew(input);
      }
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setSubmitError(error.response?.data?.error || 'Failed to save brew');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CoffeeSelectionStep
            onCoffeeChange={handleCoffeeChange}
            selectedCoffee={selectedCoffee}
          />
        );
      case 2:
        return <PreBrewStep filterPapers={filterPapers} />;
      case 3:
        return <BrewStep />;
      case 4:
        return <PostBrewStep mineralProfiles={mineralProfiles} />;
      case 5:
        return <QuantitativeStep goals={coffeeGoals} onGoalChange={handleGoalChange} />;
      case 6:
        return <SensoryStep goals={coffeeGoals} onGoalChange={handleGoalChange} />;
      case 7:
        return <ImprovementStep />;
      default:
        return null;
    }
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
            <div className="flex items-center justify-between">
              <CardTitle>{brew ? 'Edit Brew' : 'New Brew'}</CardTitle>
              {formatAutoSaveStatus(autoSaveStatus, autoSaveLastSavedAt) && (
                <span className={`text-xs ${autoSaveStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {formatAutoSaveStatus(autoSaveStatus, autoSaveLastSavedAt)}
                </span>
              )}
            </div>
            {selectedCoffee && (
              <p className="text-sm text-muted-foreground">
                {selectedCoffee.name} · {selectedCoffee.roaster}
                {selectedCoffee.days_off_roast !== undefined && ` · ${selectedCoffee.days_off_roast} days off roast`}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <FormProvider {...methods}>
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {submitError && (
                  <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
                    {submitError}
                  </div>
                )}

                {/* Progress Indicator */}
                <WizardProgress />

                {/* Step Content */}
                <div className="min-h-[300px]">
                  {renderCurrentStep()}
                </div>

                {/* Navigation */}
                <WizardNavigation
                  onSubmitForm={handleFormSubmit}
                  isSubmitting={isSubmitting}
                  submitLabel={brew ? 'Save Changes' : 'Save Brew'}
                />
              </form>
            </FormProvider>
          </CardContent>
        </Card>

        {/* Reference Sidebar - desktop only */}
        {selectedCoffee && (
          <div className="hidden lg:block lg:w-80 lg:shrink-0">
            <ReferenceSidebar
              reference={effectiveReference}
              isLoading={isLoadingReference}
              onCopyParameters={handleCopyParameters}
              onChangeReference={handleOpenPicker}
            />
          </div>
        )}
      </div>

      {/* Mobile: floating Reference button + Sheet drawer */}
      {selectedCoffee && (
        <>
          <div className="fixed bottom-6 right-4 z-40 lg:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSheetOpen(true)}
              className="shadow-lg"
            >
              Reference
            </Button>
          </div>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="right" className="flex flex-col">
              <SheetHeader>
                <SheetTitle>Reference</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <ReferenceSidebar
                  reference={effectiveReference}
                  isLoading={isLoadingReference}
                  onCopyParameters={(exp) => {
                    handleCopyParameters(exp);
                    setSheetOpen(false);
                  }}
                  onChangeReference={handleOpenPicker}
                  embedded
                />
              </div>
            </SheetContent>
          </Sheet>

          <ReferencePickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            brews={coffeeBrews}
            currentReferenceId={effectiveReference?.brew?.id}
            isLoading={isLoadingBrews}
            onSelect={handleSelectReference}
          />
        </>
      )}
    </div>
  );
}

export default function BrewForm(props: BrewFormProps) {
  const isEditMode = !!props.brew;

  return (
    <WizardProvider isEditMode={isEditMode}>
      <BrewFormContent {...props} />
    </WizardProvider>
  );
}
