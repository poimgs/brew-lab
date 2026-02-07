import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ImprovementStep() {
  const { register } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Ideas for Next Time</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Capture what you'd try differently on your next brew. These notes help you iterate and improve.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="improvement_notes">Improvement Notes</Label>
        <Textarea
          id="improvement_notes"
          {...register('improvement_notes')}
          placeholder="What would you try differently? Ideas for improving this brew..."
          rows={6}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Examples: "Try coarser grind", "Increase bloom time", "Lower water temp by 2C"
        </p>
      </div>
    </div>
  );
}
