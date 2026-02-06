import { useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import IntensityInput from '../../IntensityInput';

const FLAVOR_CATEGORIES = [
  { name: 'Fruity', descriptors: ['Berry', 'Citrus', 'Stone Fruit', 'Tropical', 'Dried Fruit', 'Apple', 'Grape'] },
  { name: 'Sweet', descriptors: ['Chocolate', 'Caramel', 'Honey', 'Brown Sugar', 'Vanilla', 'Molasses', 'Maple'] },
  { name: 'Floral', descriptors: ['Jasmine', 'Rose', 'Lavender', 'Hibiscus', 'Chamomile', 'Orange Blossom'] },
  { name: 'Nutty / Cocoa', descriptors: ['Almond', 'Hazelnut', 'Walnut', 'Peanut', 'Cocoa', 'Dark Chocolate'] },
  { name: 'Spicy', descriptors: ['Cinnamon', 'Clove', 'Black Pepper', 'Cardamom', 'Ginger', 'Nutmeg'] },
  { name: 'Roasted', descriptors: ['Toasty', 'Smoky', 'Malty', 'Cereal', 'Pipe Tobacco'] },
  { name: 'Other', descriptors: ['Wine-like', 'Tea-like', 'Earthy', 'Woody', 'Herbal', 'Fermented'] },
];

export default function SensoryStep() {
  const { register, control, watch, setValue, formState: { errors } } = useFormContext();
  const [flavorRefOpen, setFlavorRefOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Sensory Outcomes</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Rate the taste characteristics of your brew. Slide to rate (0 = Not rated, 1-10 = intensity).
        </p>
      </div>

      {/* Flavor Reference */}
      <div className="border rounded-lg">
        <Button
          type="button"
          variant="ghost"
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
          onClick={() => setFlavorRefOpen(!flavorRefOpen)}
        >
          Flavor Reference
          {flavorRefOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        {flavorRefOpen && (
          <div className="px-4 pb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FLAVOR_CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{cat.name}</p>
                <p className="text-sm">{cat.descriptors.join(', ')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overall Notes (Required) */}
      <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
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
          <p className="text-sm text-destructive">{errors.overall_notes.message as string}</p>
        )}
      </div>

      {/* Overall Score */}
      <div className="p-4 bg-muted/30 rounded-lg">
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
      </div>

      {/* Sensory Attributes */}
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
          name="body_intensity"
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
          name="brightness_intensity"
          control={control}
          render={({ field }) => (
            <IntensityInput
              label="Brightness"
              value={field.value}
              onChange={field.onChange}
              notesValue={watch('brightness_notes')}
              onNotesChange={(v) => setValue('brightness_notes', v)}
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
          name="cleanliness_intensity"
          control={control}
          render={({ field }) => (
            <IntensityInput
              label="Cleanliness"
              value={field.value}
              onChange={field.onChange}
              notesValue={watch('cleanliness_notes')}
              onNotesChange={(v) => setValue('cleanliness_notes', v)}
            />
          )}
        />

        <Controller
          name="complexity_intensity"
          control={control}
          render={({ field }) => (
            <IntensityInput
              label="Complexity"
              value={field.value}
              onChange={field.onChange}
              notesValue={watch('complexity_notes')}
              onNotesChange={(v) => setValue('complexity_notes', v)}
            />
          )}
        />

        <Controller
          name="balance_intensity"
          control={control}
          render={({ field }) => (
            <IntensityInput
              label="Balance"
              value={field.value}
              onChange={field.onChange}
              notesValue={watch('balance_notes')}
              onNotesChange={(v) => setValue('balance_notes', v)}
            />
          )}
        />

        <Controller
          name="aftertaste_intensity"
          control={control}
          render={({ field }) => (
            <IntensityInput
              label="Aftertaste"
              value={field.value}
              onChange={field.onChange}
              notesValue={watch('aftertaste_notes')}
              onNotesChange={(v) => setValue('aftertaste_notes', v)}
            />
          )}
        />
      </div>
    </div>
  );
}
