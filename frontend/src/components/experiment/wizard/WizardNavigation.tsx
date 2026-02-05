import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWizard, TOTAL_STEPS } from './WizardContext';

interface WizardNavigationProps {
  onNext?: () => Promise<boolean> | boolean;
  isSubmitting?: boolean;
  isEditMode?: boolean;
  showSkip?: boolean;
  submitLabel?: string;
}

export default function WizardNavigation({
  onNext,
  isSubmitting = false,
  isEditMode = false,
  showSkip = false,
  submitLabel = 'Save Experiment',
}: WizardNavigationProps) {
  const { currentStep, prevStep, nextStep, isFirstStep, isLastStep } = useWizard();

  const handleNext = async () => {
    if (onNext) {
      const canProceed = await onNext();
      if (canProceed) {
        nextStep();
      }
    } else {
      nextStep();
    }
  };

  const handleSkip = () => {
    nextStep();
  };

  return (
    <div className="flex items-center justify-between pt-6 border-t">
      <div>
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
        {showSkip && !isLastStep && (
          <Button type="button" variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
        )}

        {isLastStep || isEditMode ? (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitLabel}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
