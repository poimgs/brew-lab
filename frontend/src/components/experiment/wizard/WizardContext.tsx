import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export const WIZARD_STEPS = [
  { id: 1, name: 'Coffee Selection', shortName: 'Coffee' },
  { id: 2, name: 'Pre-Brew Variables', shortName: 'Pre-Brew' },
  { id: 3, name: 'Brew Variables', shortName: 'Brew' },
  { id: 4, name: 'Post-Brew Variables', shortName: 'Post-Brew' },
  { id: 5, name: 'Quantitative Outcomes', shortName: 'Quant' },
  { id: 6, name: 'Sensory Outcomes', shortName: 'Sensory' },
  { id: 7, name: 'Ideas for Next Time', shortName: 'Ideas' },
] as const;

export const TOTAL_STEPS = WIZARD_STEPS.length;

interface WizardContextType {
  currentStep: number;
  visitedSteps: Set<number>;
  stepErrors: Set<number>;
  isEditMode: boolean;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  markStepVisited: (step: number) => void;
  canNavigateToStep: (step: number) => boolean;
  setStepErrors: (errors: Set<number>) => void;
  clearStepError: (step: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const WizardContext = createContext<WizardContextType | null>(null);

interface WizardProviderProps {
  children: ReactNode;
  isEditMode?: boolean;
  initialStep?: number;
}

export function WizardProvider({ children, isEditMode = false, initialStep = 1 }: WizardProviderProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(() => {
    // In edit mode, all steps are visited by default
    if (isEditMode) {
      return new Set(WIZARD_STEPS.map(s => s.id));
    }
    // In create mode, only the first step is visited
    return new Set([1]);
  });
  const [stepErrors, setStepErrorsState] = useState<Set<number>>(new Set());

  const markStepVisited = useCallback((step: number) => {
    setVisitedSteps(prev => new Set([...prev, step]));
  }, []);

  const setStepErrors = useCallback((errors: Set<number>) => {
    setStepErrorsState(errors);
  }, []);

  const clearStepError = useCallback((step: number) => {
    setStepErrorsState(prev => {
      if (!prev.has(step)) return prev;
      const next = new Set(prev);
      next.delete(step);
      return next;
    });
  }, []);

  const canNavigateToStep = useCallback((step: number) => {
    // In edit mode, can navigate to any step
    if (isEditMode) return true;
    // In create mode, can only navigate to visited steps or the next unvisited step
    return visitedSteps.has(step) || step === Math.max(...visitedSteps) + 1;
  }, [isEditMode, visitedSteps]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS && (canNavigateToStep(step) || stepErrors.has(step))) {
      setCurrentStep(step);
      markStepVisited(step);
    }
  }, [canNavigateToStep, markStepVisited, stepErrors]);

  const nextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      const next = currentStep + 1;
      setCurrentStep(next);
      markStepVisited(next);
    }
  }, [currentStep, markStepVisited]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const value: WizardContextType = {
    currentStep,
    visitedSteps,
    stepErrors,
    isEditMode,
    goToStep,
    nextStep,
    prevStep,
    markStepVisited,
    canNavigateToStep,
    setStepErrors,
    clearStepError,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === TOTAL_STEPS,
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}
