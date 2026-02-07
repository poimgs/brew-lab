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
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  markStepVisited: (step: number) => void;
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
    if (isEditMode) {
      return new Set(WIZARD_STEPS.map(s => s.id));
    }
    return new Set([1]);
  });

  const markStepVisited = useCallback((step: number) => {
    setVisitedSteps(prev => new Set([...prev, step]));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step);
      markStepVisited(step);
    }
  }, [markStepVisited]);

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
    goToStep,
    nextStep,
    prevStep,
    markStepVisited,
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
