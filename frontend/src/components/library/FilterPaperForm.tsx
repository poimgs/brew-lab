import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  type FilterPaper,
  type FilterPaperInput,
  createFilterPaper,
  updateFilterPaper,
} from '@/api/filter-papers';

const filterPaperSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  brand: z.string().optional(),
  notes: z.string().optional(),
});

type FilterPaperFormData = z.infer<typeof filterPaperSchema>;

interface FilterPaperFormProps {
  open: boolean;
  filterPaper?: FilterPaper;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FilterPaperForm({
  open,
  filterPaper,
  onSuccess,
  onCancel,
}: FilterPaperFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FilterPaperFormData>({
    resolver: zodResolver(filterPaperSchema),
    defaultValues: {
      name: '',
      brand: '',
      notes: '',
    },
  });

  // Reset form when dialog opens/closes or filterPaper changes
  useEffect(() => {
    if (open) {
      reset({
        name: filterPaper?.name || '',
        brand: filterPaper?.brand || '',
        notes: filterPaper?.notes || '',
      });
      setSubmitError(null);
    }
  }, [open, filterPaper, reset]);

  const onSubmit = async (data: FilterPaperFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const input: FilterPaperInput = {
        name: data.name,
        brand: data.brand || undefined,
        notes: data.notes || undefined,
      };

      if (filterPaper) {
        await updateFilterPaper(filterPaper.id, input);
      } else {
        await createFilterPaper(input);
      }
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setSubmitError(error.response?.data?.error || 'Failed to save filter paper');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {filterPaper ? 'Edit Filter Paper' : 'Add Filter Paper'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
              {submitError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Abaca"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              {...register('brand')}
              placeholder="e.g., Cafec"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Notes about this filter paper"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {filterPaper ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
