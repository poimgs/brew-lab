import { cn } from '@/lib/utils';
import { useWizard, WIZARD_STEPS } from './WizardContext';

interface WizardProgressProps {
  className?: string;
}

export default function WizardProgress({ className }: WizardProgressProps) {
  const { currentStep, visitedSteps, stepErrors, goToStep, canNavigateToStep } = useWizard();

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: Show full step names */}
      <div className="hidden md:flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = visitedSteps.has(step.id) && step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const hasError = stepErrors.has(step.id);
          const isClickable = canNavigateToStep(step.id) || hasError;
          const isUpcoming = !visitedSteps.has(step.id);

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => isClickable && goToStep(step.id)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center gap-2 transition-colors',
                  isClickable && !isCurrent && 'hover:opacity-80 cursor-pointer',
                  !isClickable && 'cursor-not-allowed opacity-50'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    hasError && 'border-2 border-destructive bg-destructive/10 text-destructive',
                    !hasError && isCompleted && 'bg-primary text-primary-foreground',
                    !hasError && isCurrent && 'border-2 border-primary text-primary bg-background',
                    !hasError && isUpcoming && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.id}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium hidden lg:block',
                    hasError && 'text-destructive',
                    !hasError && isCurrent && 'text-primary',
                    !hasError && isCompleted && 'text-foreground',
                    !hasError && isUpcoming && !isCurrent && 'text-muted-foreground'
                  )}
                >
                  {step.shortName}
                </span>
              </button>
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    isCompleted || (visitedSteps.has(step.id) && visitedSteps.has(WIZARD_STEPS[index + 1].id))
                      ? 'bg-primary'
                      : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Compact view */}
      <div className="md:hidden">
        <div className="flex items-center justify-center gap-1.5">
          {WIZARD_STEPS.map((step) => {
            const isCompleted = visitedSteps.has(step.id) && step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const hasError = stepErrors.has(step.id);
            const isUpcoming = !visitedSteps.has(step.id);
            const isClickable = canNavigateToStep(step.id) || hasError;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => isClickable && goToStep(step.id)}
                disabled={!isClickable}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                  hasError && 'border-2 border-destructive bg-destructive/10 text-destructive',
                  !hasError && isCompleted && 'bg-primary text-primary-foreground',
                  !hasError && isCurrent && 'border-2 border-primary text-primary bg-background',
                  !hasError && isUpcoming && !isCurrent && 'bg-muted text-muted-foreground',
                  isClickable && !isCurrent && 'hover:opacity-80',
                  !isClickable && 'cursor-not-allowed opacity-50'
                )}
              >
                {step.id}
              </button>
            );
          })}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-2">
          Step {currentStep} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep - 1].name}
        </p>
      </div>
    </div>
  );
}
