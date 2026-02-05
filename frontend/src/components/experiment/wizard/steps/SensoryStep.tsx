import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import IntensityInput from '../../IntensityInput';

export default function SensoryStep() {
  const { register, control, watch, setValue, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Sensory Outcomes</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Rate the taste characteristics of your brew. Slide to rate (0 = Not rated, 1-10 = intensity).
        </p>
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
    </div>
  );
}
