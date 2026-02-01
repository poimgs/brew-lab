import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
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
import {
  type Coffee,
  type CoffeeInput,
  createCoffee,
  updateCoffee,
  getCoffeeSuggestions,
} from '@/api/coffees';

const ROAST_LEVELS = ['Light', 'Medium', 'Medium-Dark', 'Dark'] as const;

const coffeeSchema = z.object({
  roaster: z.string().min(1, 'Roaster is required'),
  name: z.string().min(1, 'Name is required'),
  country: z.string().optional(),
  region: z.string().optional(),
  process: z.string().optional(),
  roast_level: z.string().optional(),
  tasting_notes: z.string().optional(),
  roast_date: z.string().optional(),
  purchase_date: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.roast_date && data.purchase_date) {
    return new Date(data.purchase_date) >= new Date(data.roast_date);
  }
  return true;
}, {
  message: 'Purchase date cannot be before roast date',
  path: ['purchase_date'],
}).refine((data) => {
  if (data.roast_date) {
    return new Date(data.roast_date) <= new Date();
  }
  return true;
}, {
  message: 'Roast date cannot be in the future',
  path: ['roast_date'],
});

type CoffeeFormData = z.infer<typeof coffeeSchema>;

interface CoffeeFormProps {
  coffee?: Coffee;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CoffeeForm({ coffee, onSuccess, onCancel }: CoffeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Autocomplete suggestions
  const [roasterSuggestions, setRoasterSuggestions] = useState<string[]>([]);
  const [countrySuggestions, setCountrySuggestions] = useState<string[]>([]);
  const [processSuggestions, setProcessSuggestions] = useState<string[]>([]);
  const [showRoasterSuggestions, setShowRoasterSuggestions] = useState(false);
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [showProcessSuggestions, setShowProcessSuggestions] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CoffeeFormData>({
    resolver: zodResolver(coffeeSchema),
    defaultValues: {
      roaster: coffee?.roaster || '',
      name: coffee?.name || '',
      country: coffee?.country || '',
      region: coffee?.region || '',
      process: coffee?.process || '',
      roast_level: coffee?.roast_level || '',
      tasting_notes: coffee?.tasting_notes || '',
      roast_date: coffee?.roast_date || '',
      purchase_date: coffee?.purchase_date || '',
      notes: coffee?.notes || '',
    },
  });

  const roasterValue = watch('roaster');
  const countryValue = watch('country');
  const processValue = watch('process');

  // Fetch suggestions for roaster
  useEffect(() => {
    if (roasterValue && roasterValue.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const suggestions = await getCoffeeSuggestions('roaster', roasterValue);
          setRoasterSuggestions(suggestions);
        } catch {
          setRoasterSuggestions([]);
        }
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setRoasterSuggestions([]);
    }
  }, [roasterValue]);

  // Fetch suggestions for country
  useEffect(() => {
    if (countryValue && countryValue.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const suggestions = await getCoffeeSuggestions('country', countryValue);
          setCountrySuggestions(suggestions);
        } catch {
          setCountrySuggestions([]);
        }
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setCountrySuggestions([]);
    }
  }, [countryValue]);

  // Fetch suggestions for process
  useEffect(() => {
    if (processValue && processValue.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const suggestions = await getCoffeeSuggestions('process', processValue);
          setProcessSuggestions(suggestions);
        } catch {
          setProcessSuggestions([]);
        }
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setProcessSuggestions([]);
    }
  }, [processValue]);

  const onSubmit = async (data: CoffeeFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const input: CoffeeInput = {
        roaster: data.roaster,
        name: data.name,
        country: data.country || undefined,
        region: data.region || undefined,
        process: data.process || undefined,
        roast_level: data.roast_level || undefined,
        tasting_notes: data.tasting_notes || undefined,
        roast_date: data.roast_date || undefined,
        purchase_date: data.purchase_date || undefined,
        notes: data.notes || undefined,
      };

      if (coffee) {
        await updateCoffee(coffee.id, input);
      } else {
        await createCoffee(input);
      }
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setSubmitError(error.response?.data?.error || 'Failed to save coffee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const SuggestionList = ({
    suggestions,
    show,
    onSelect,
    onClose,
  }: {
    suggestions: string[];
    show: boolean;
    onSelect: (value: string) => void;
    onClose: () => void;
  }) => {
    if (!show || suggestions.length === 0) return null;

    return (
      <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
            onClick={() => {
              onSelect(suggestion);
              onClose();
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onCancel} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{coffee ? 'Edit Coffee' : 'Add Coffee'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {submitError && (
              <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
                {submitError}
              </div>
            )}

            {/* Required fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 relative">
                <Label htmlFor="roaster">Roaster *</Label>
                <Input
                  id="roaster"
                  {...register('roaster')}
                  onFocus={() => setShowRoasterSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowRoasterSuggestions(false), 200)}
                  className={errors.roaster ? 'border-destructive' : ''}
                />
                <SuggestionList
                  suggestions={roasterSuggestions}
                  show={showRoasterSuggestions}
                  onSelect={(v) => setValue('roaster', v)}
                  onClose={() => setShowRoasterSuggestions(false)}
                />
                {errors.roaster && (
                  <p className="text-sm text-destructive">{errors.roaster.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
            </div>

            {/* Origin section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
                Origin
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 relative">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    {...register('country')}
                    onFocus={() => setShowCountrySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 200)}
                  />
                  <SuggestionList
                    suggestions={countrySuggestions}
                    show={showCountrySuggestions}
                    onSelect={(v) => setValue('country', v)}
                    onClose={() => setShowCountrySuggestions(false)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Input id="region" {...register('region')} />
                </div>
              </div>
            </div>

            {/* Details section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
                Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 relative">
                  <Label htmlFor="process">Process</Label>
                  <Input
                    id="process"
                    {...register('process')}
                    onFocus={() => setShowProcessSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowProcessSuggestions(false), 200)}
                  />
                  <SuggestionList
                    suggestions={processSuggestions}
                    show={showProcessSuggestions}
                    onSelect={(v) => setValue('process', v)}
                    onClose={() => setShowProcessSuggestions(false)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roast_level">Roast Level</Label>
                  <Select
                    value={watch('roast_level') || ''}
                    onValueChange={(v) => setValue('roast_level', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select roast level" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROAST_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tasting_notes">Tasting Notes</Label>
                <Textarea
                  id="tasting_notes"
                  {...register('tasting_notes')}
                  placeholder="Roaster's described flavor notes"
                  rows={2}
                />
              </div>
            </div>

            {/* Dates section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
                Dates
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="roast_date">Roast Date</Label>
                  <Input
                    id="roast_date"
                    type="date"
                    {...register('roast_date')}
                    className={errors.roast_date ? 'border-destructive' : ''}
                  />
                  {errors.roast_date && (
                    <p className="text-sm text-destructive">{errors.roast_date.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    {...register('purchase_date')}
                    className={errors.purchase_date ? 'border-destructive' : ''}
                  />
                  {errors.purchase_date && (
                    <p className="text-sm text-destructive">{errors.purchase_date.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
                Notes
              </h3>
              <div className="space-y-2">
                <Label htmlFor="notes">Personal Notes</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Your personal notes about this coffee"
                  rows={3}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {coffee ? 'Save Changes' : 'Add Coffee'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
