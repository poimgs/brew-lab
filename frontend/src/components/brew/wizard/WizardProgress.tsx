import { cn } from '@/lib/utils';
import { useWizard, WIZARD_STEPS } from './WizardContext';

interface WizardProgressProps {
  className?: string;
}

export default function WizardProgress({ className }: WizardProgressProps) {
  const { currentStep, visitedSteps, goToStep } = useWizard();

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: Show full step names */}
      <div className="hidden md:flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = visitedSteps.has(step.id) && step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = !visitedSteps.has(step.id) && !isCurrent;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => goToStep(step.id)}
                className={cn(
                  'flex items-center gap-2 transition-colors cursor-pointer',
                  !isCurrent && 'hover:opacity-80'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'border-2 border-primary text-primary bg-background',
                    isUpcoming && 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.id}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium hidden lg:block',
                    isCurrent && 'text-primary',
                    isCompleted && 'text-foreground',
                    isUpcoming && 'text-muted-foreground'
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
            const isUpcoming = !visitedSteps.has(step.id) && !isCurrent;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(step.id)}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors cursor-pointer',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'border-2 border-primary text-primary bg-background',
                  isUpcoming && 'bg-muted text-muted-foreground',
                  !isCurrent && 'hover:opacity-80'
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
