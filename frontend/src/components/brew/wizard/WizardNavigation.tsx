import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWizard, TOTAL_STEPS } from './WizardContext';

interface WizardNavigationProps {
  onSubmitForm?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export default function WizardNavigation({
  onSubmitForm,
  isSubmitting = false,
  submitLabel = 'Save Brew',
}: WizardNavigationProps) {
  const { currentStep, prevStep, nextStep, isFirstStep, isLastStep } = useWizard();

  return (
    <div className="flex items-center justify-between pt-6 border-t">
      <div className="flex gap-2">
        {!isFirstStep && (
          <Button type="button" variant="outline" onClick={prevStep}>
            Back
          </Button>
        )}
      </div>

      <span className="text-sm text-muted-foreground hidden sm:block">
        Step {currentStep} of {TOTAL_STEPS}
      </span>

      <div className="flex gap-2">
        {!isLastStep && (
          <Button type="button" variant="outline" onClick={nextStep}>
            Next
          </Button>
        )}

        <Button
          type={onSubmitForm ? 'button' : 'submit'}
          onClick={onSubmitForm}
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
