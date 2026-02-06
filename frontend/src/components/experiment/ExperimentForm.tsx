import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
import { type Experiment, type CreateExperimentInput, createExperiment, updateExperiment } from '@/api/experiments';
import { getDefaults, type Defaults, type PourDefault } from '@/api/defaults';
import { listFilterPapers, type FilterPaper } from '@/api/filter-papers';
import { listMineralProfiles, type MineralProfile } from '@/api/mineral-profiles';
import { type Coffee, type CoffeeReference, type ReferenceExperiment, getReference, getCoffee } from '@/api/coffees';

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
  technique_notes: z.string().optional().nullable(),

  // Post-brew variables
  water_bypass_ml: z.number().positive().optional().nullable(),
  mineral_profile_id: z.string().optional().nullable(),

  // Quantitative outcomes
  coffee_ml: z.number().positive().optional().nullable(),
  tds: z.number().min(0).max(30).optional().nullable(),
  extraction_yield: z.number().min(0).max(30).optional().nullable(),
  drawdown_time: z.number().int().positive().optional().nullable(),

  // Sensory outcomes (1-10 scale)
  aroma_intensity: z.number().int().min(1).max(10).optional().nullable(),
  aroma_notes: z.string().optional().nullable(),
  body_intensity: z.number().int().min(1).max(10).optional().nullable(),
  body_notes: z.string().optional().nullable(),
  flavor_intensity: z.number().int().min(1).max(10).optional().nullable(),
  flavor_notes: z.string().optional().nullable(),
  brightness_intensity: z.number().int().min(1).max(10).optional().nullable(),
  brightness_notes: z.string().optional().nullable(),
  sweetness_intensity: z.number().int().min(1).max(10).optional().nullable(),
  sweetness_notes: z.string().optional().nullable(),
  cleanliness_intensity: z.number().int().min(1).max(10).optional().nullable(),
  cleanliness_notes: z.string().optional().nullable(),
  complexity_intensity: z.number().int().min(1).max(10).optional().nullable(),
  complexity_notes: z.string().optional().nullable(),
  balance_intensity: z.number().int().min(1).max(10).optional().nullable(),
  balance_notes: z.string().optional().nullable(),
  aftertaste_intensity: z.number().int().min(1).max(10).optional().nullable(),
  aftertaste_notes: z.string().optional().nullable(),

  // Overall assessment (moved to Sensory step)
  overall_score: z.number().int().min(1).max(10).optional().nullable(),
  overall_notes: z.string().min(10, 'Notes must be at least 10 characters'),
  improvement_notes: z.string().optional().nullable(),
});

type ExperimentFormData = z.infer<typeof experimentSchema>;

// Step field mappings for validation
const STEP_FIELDS: Record<number, (keyof ExperimentFormData)[]> = {
  1: ['coffee_id'],
  2: ['coffee_weight', 'ratio', 'water_weight', 'grind_size', 'water_temperature', 'filter_paper_id'],
  3: ['bloom_water', 'bloom_time', 'pours', 'total_brew_time', 'technique_notes'],
  4: ['water_bypass_ml', 'mineral_profile_id'],
  5: ['coffee_ml', 'tds', 'extraction_yield', 'drawdown_time'],
  6: ['aroma_intensity', 'aroma_notes', 'body_intensity', 'body_notes', 'flavor_intensity', 'flavor_notes', 'brightness_intensity', 'brightness_notes', 'sweetness_intensity', 'sweetness_notes', 'cleanliness_intensity', 'cleanliness_notes', 'complexity_intensity', 'complexity_notes', 'balance_intensity', 'balance_notes', 'aftertaste_intensity', 'aftertaste_notes', 'overall_score', 'overall_notes'],
  7: ['improvement_notes'],
};

interface ExperimentFormProps {
  experiment?: Experiment;
  onSuccess: () => void;
  onCancel: () => void;
}

function ExperimentFormContent({ experiment, onSuccess, onCancel }: ExperimentFormProps) {
  const [searchParams] = useSearchParams();
  const initialCoffeeId = searchParams.get('coffee_id');
  const isEditMode = !!experiment;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCoffee, setSelectedCoffee] = useState<Coffee | null>(null);
  const [filterPapers, setFilterPapers] = useState<FilterPaper[]>([]);
  const [mineralProfiles, setMineralProfiles] = useState<MineralProfile[]>([]);
  const [defaults, setDefaults] = useState<Defaults>({});
  const [reference, setReference] = useState<CoffeeReference | null>(null);
  const [isLoadingReference, setIsLoadingReference] = useState(false);
  const [waterWeightManuallySet, setWaterWeightManuallySet] = useState(false);

  const { currentStep, goToStep } = useWizard();

  const methods = useForm<ExperimentFormData>({
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
      technique_notes: experiment?.technique_notes || '',
      water_bypass_ml: experiment?.water_bypass_ml ?? null,
      mineral_profile_id: experiment?.mineral_profile_id || '',
      coffee_ml: experiment?.coffee_ml ?? null,
      tds: experiment?.tds ?? null,
      extraction_yield: experiment?.extraction_yield ?? null,
      drawdown_time: experiment?.drawdown_time ?? null,
      aroma_intensity: experiment?.aroma_intensity ?? null,
      aroma_notes: experiment?.aroma_notes || '',
      body_intensity: experiment?.body_intensity ?? null,
      body_notes: experiment?.body_notes || '',
      flavor_intensity: experiment?.flavor_intensity ?? null,
      flavor_notes: experiment?.flavor_notes || '',
      brightness_intensity: experiment?.brightness_intensity ?? null,
      brightness_notes: experiment?.brightness_notes || '',
      sweetness_intensity: experiment?.sweetness_intensity ?? null,
      sweetness_notes: experiment?.sweetness_notes || '',
      cleanliness_intensity: experiment?.cleanliness_intensity ?? null,
      cleanliness_notes: experiment?.cleanliness_notes || '',
      complexity_intensity: experiment?.complexity_intensity ?? null,
      complexity_notes: experiment?.complexity_notes || '',
      balance_intensity: experiment?.balance_intensity ?? null,
      balance_notes: experiment?.balance_notes || '',
      aftertaste_intensity: experiment?.aftertaste_intensity ?? null,
      aftertaste_notes: experiment?.aftertaste_notes || '',
      overall_score: experiment?.overall_score ?? null,
      overall_notes: experiment?.overall_notes || '',
      improvement_notes: experiment?.improvement_notes || '',
    },
  });

  const { setValue, watch, trigger } = methods;
  const coffeeWeight = watch('coffee_weight');
  const ratio = watch('ratio');
  const tds = watch('tds');
  const coffeeMl = watch('coffee_ml');

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

  // Apply defaults when entering a step (for new experiments)
  useEffect(() => {
    if (experiment) return; // Don't apply defaults when editing

    if (currentStep === 2) {
      // Pre-brew defaults
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
    } else if (currentStep === 3) {
      // Brew defaults
      if (defaults.bloom_water && !watch('bloom_water')) {
        setValue('bloom_water', parseFloat(defaults.bloom_water));
      }
      if (defaults.bloom_time && !watch('bloom_time')) {
        setValue('bloom_time', parseInt(defaults.bloom_time));
      }
      // Pour defaults - only apply if pours array is empty
      const currentPours = watch('pours');
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
  }, [currentStep, defaults, experiment, setValue, watch]);

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
  };

  const handleCopyParameters = (exp: ReferenceExperiment) => {
    // Copy input parameters from the reference experiment
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

  // Save as draft without full validation
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setSubmitError(null);

    try {
      // Only validate coffee_id is set
      const coffeeId = methods.getValues('coffee_id');
      if (!coffeeId) {
        setSubmitError('Please select a coffee before saving a draft');
        setIsSavingDraft(false);
        return;
      }

      const data = methods.getValues();

      // Convert null/empty values for the API
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
      input.is_draft = true;

      if (experiment) {
        await updateExperiment(experiment.id, input);
      } else {
        await createExperiment(input);
      }
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setSubmitError(error.response?.data?.error || 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Validate current step fields before proceeding
  const validateCurrentStep = async (): Promise<boolean> => {
    const fields = STEP_FIELDS[currentStep];
    if (!fields || fields.length === 0) return true;
    const result = await trigger(fields);
    return result;
  };

  // Find which step a field belongs to
  const findStepForField = (fieldName: string): number => {
    for (const [step, fields] of Object.entries(STEP_FIELDS)) {
      if (fields.includes(fieldName as keyof ExperimentFormData)) {
        return parseInt(step);
      }
    }
    return 1;
  };

  // Handle form submission with validation error navigation
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Trigger validation for all fields
    const isValid = await trigger();

    if (!isValid) {
      // Find the first step with an error and navigate there
      const errors = methods.formState.errors;
      const errorFields = Object.keys(errors);

      if (errorFields.length > 0) {
        const firstErrorField = errorFields[0];
        const stepWithError = findStepForField(firstErrorField);

        if (stepWithError !== currentStep) {
          goToStep(stepWithError);
        }

        // Set a generic error message
        const errorMessage = errors[firstErrorField as keyof typeof errors]?.message;
        if (typeof errorMessage === 'string') {
          setSubmitError(errorMessage);
        } else {
          setSubmitError('Please fill in all required fields');
        }
      }
      return;
    }

    // If validation passes, submit the form
    methods.handleSubmit(onSubmit)();
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
        return <QuantitativeStep />;
      case 6:
        return <SensoryStep />;
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
            <CardTitle>{experiment ? 'Edit Experiment' : 'New Experiment'}</CardTitle>
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
                  onNext={validateCurrentStep}
                  onSaveDraft={handleSaveDraft}
                  isSubmitting={isSubmitting}
                  isSavingDraft={isSavingDraft}
                  isEditMode={isEditMode}
                  showSkip={currentStep >= 2 && currentStep <= 5}
                  submitLabel={experiment ? 'Save Changes' : 'Save Experiment'}
                />
              </form>
            </FormProvider>
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

export default function ExperimentForm(props: ExperimentFormProps) {
  const isEditMode = !!props.experiment;

  return (
    <WizardProvider isEditMode={isEditMode}>
      <ExperimentFormContent {...props} />
    </WizardProvider>
  );
}
