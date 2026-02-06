import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { WizardProvider, useWizard } from './WizardContext';
import WizardProgress from './WizardProgress';

// Helper component to set step errors from within the context
function StepErrorSetter({ errors }: { errors: number[] }) {
  const { setStepErrors } = useWizard();
  useEffect(() => {
    setStepErrors(new Set(errors));
  }, [errors, setStepErrors]);
  return null;
}

// Helper component to read the current step for assertions
function StepReader({ onStep }: { onStep: (step: number) => void }) {
  const { currentStep } = useWizard();
  useEffect(() => {
    onStep(currentStep);
  }, [currentStep, onStep]);
  return null;
}

function getStepCircles(): { stepNumber: string; element: Element }[] {
  const circles = document.querySelectorAll('.rounded-full');
  return Array.from(circles)
    .filter((el) => /^\d$/.test(el.textContent?.trim() || ''))
    .map((el) => ({ stepNumber: el.textContent!.trim(), element: el }));
}

function renderProgress(opts: { stepErrors?: number[]; initialStep?: number } = {}) {
  const { stepErrors = [], initialStep = 1 } = opts;
  return render(
    <WizardProvider isEditMode={true} initialStep={initialStep}>
      <StepErrorSetter errors={stepErrors} />
      <WizardProgress />
    </WizardProvider>
  );
}

describe('WizardProgress', () => {
  describe('error indicators', () => {
    it('applies error styling to steps with errors', () => {
      renderProgress({ stepErrors: [1, 6] });

      const circles = getStepCircles();

      const step1Circles = circles.filter((c) => c.stepNumber === '1');
      expect(step1Circles.length).toBeGreaterThan(0);
      step1Circles.forEach(({ element }) => {
        expect(element.className).toContain('border-destructive');
      });

      const step6Circles = circles.filter((c) => c.stepNumber === '6');
      expect(step6Circles.length).toBeGreaterThan(0);
      step6Circles.forEach(({ element }) => {
        expect(element.className).toContain('border-destructive');
      });
    });

    it('does not apply error styling to steps without errors', () => {
      renderProgress({ stepErrors: [1, 6] });

      const circles = getStepCircles();

      // Steps 2-5 and 7 should NOT have error styling
      for (const stepNum of ['2', '3', '4', '5', '7']) {
        const stepCircles = circles.filter((c) => c.stepNumber === stepNum);
        stepCircles.forEach(({ element }) => {
          expect(element.className).not.toContain('border-destructive');
        });
      }
    });

    it('does not show any error styling when there are no errors', () => {
      renderProgress({ stepErrors: [] });

      const errorElements = document.querySelectorAll('[class*="border-destructive"]');
      expect(errorElements.length).toBe(0);
    });

    it('allows navigating to error step by clicking', async () => {
      const user = userEvent.setup();
      let currentStep = 1;

      render(
        <WizardProvider isEditMode={true} initialStep={1}>
          <StepErrorSetter errors={[6]} />
          <StepReader onStep={(s) => { currentStep = s; }} />
          <WizardProgress />
        </WizardProvider>
      );

      // Find step 6 buttons (desktop and mobile) and click one
      const buttons = screen.getAllByRole('button');
      const step6Button = buttons.find(
        (btn) => btn.textContent?.includes('6') && btn.textContent?.includes('Sensory')
      ) || buttons.find((btn) => btn.textContent?.trim() === '6');

      expect(step6Button).toBeTruthy();
      await user.click(step6Button!);

      expect(currentStep).toBe(6);
    });

    it('overrides completed styling with error styling', () => {
      // Step 1 is completed (initialStep=3, step 1 is visited and before current)
      // But also has an error — error styling should win
      renderProgress({ stepErrors: [1], initialStep: 3 });

      const circles = getStepCircles();
      const step1Circles = circles.filter((c) => c.stepNumber === '1');

      step1Circles.forEach(({ element }) => {
        expect(element.className).toContain('border-destructive');
        expect(element.className).not.toContain('bg-primary text-primary-foreground');
      });
    });
  });
});
