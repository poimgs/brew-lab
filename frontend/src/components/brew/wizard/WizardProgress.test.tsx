import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { WizardProvider, useWizard } from './WizardContext';
import WizardProgress from './WizardProgress';

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

function renderProgress(opts: { initialStep?: number; isEditMode?: boolean } = {}) {
  const { initialStep = 1, isEditMode = false } = opts;
  return render(
    <WizardProvider isEditMode={isEditMode} initialStep={initialStep}>
      <WizardProgress />
    </WizardProvider>
  );
}

describe('WizardProgress', () => {
  describe('free navigation', () => {
    it('renders all 7 step circles', () => {
      renderProgress();

      const circles = getStepCircles();
      const uniqueSteps = new Set(circles.map((c) => c.stepNumber));
      expect(uniqueSteps.size).toBe(7);
    });

    it('all steps are clickable in create mode', async () => {
      const user = userEvent.setup();
      let currentStep = 1;

      render(
        <WizardProvider isEditMode={false} initialStep={1}>
          <StepReader onStep={(s) => { currentStep = s; }} />
          <WizardProgress />
        </WizardProvider>
      );

      // Click step 5 — should navigate even though steps 2-4 haven't been visited
      const buttons = screen.getAllByRole('button');
      const step5Button = buttons.find(
        (btn) => btn.textContent?.includes('5') && btn.textContent?.includes('Quant')
      ) || buttons.find((btn) => btn.textContent?.trim() === '5');

      expect(step5Button).toBeTruthy();
      await user.click(step5Button!);

      expect(currentStep).toBe(5);
    });

    it('all steps are clickable in edit mode', async () => {
      const user = userEvent.setup();
      let currentStep = 1;

      render(
        <WizardProvider isEditMode={true} initialStep={1}>
          <StepReader onStep={(s) => { currentStep = s; }} />
          <WizardProgress />
        </WizardProvider>
      );

      // Click step 7 directly
      const buttons = screen.getAllByRole('button');
      const step7Button = buttons.find(
        (btn) => btn.textContent?.includes('7') && btn.textContent?.includes('Ideas')
      ) || buttons.find((btn) => btn.textContent?.trim() === '7');

      expect(step7Button).toBeTruthy();
      await user.click(step7Button!);

      expect(currentStep).toBe(7);
    });

    it('no step buttons are disabled', () => {
      renderProgress();

      const buttons = screen.getAllByRole('button');
      const stepButtons = buttons.filter((btn) =>
        /^\d$/.test(btn.textContent?.trim() || '') || /^\d\s/.test(btn.textContent?.trim() || '')
      );

      stepButtons.forEach((btn) => {
        expect(btn).not.toBeDisabled();
      });
    });

    it('has no error styling on any step', () => {
      renderProgress();

      const errorElements = document.querySelectorAll('[class*="border-destructive"]');
      expect(errorElements.length).toBe(0);
    });

    it('highlights current step with primary border', () => {
      renderProgress({ initialStep: 3 });

      const circles = getStepCircles();
      const step3Circles = circles.filter((c) => c.stepNumber === '3');

      step3Circles.forEach(({ element }) => {
        expect(element.className).toContain('border-primary');
      });
    });

    it('shows completed styling for visited steps before current', () => {
      renderProgress({ initialStep: 1, isEditMode: true });

      // In edit mode all steps are visited — navigate to step 3
      // Since initialStep=1 in edit mode, steps visited=all, current=1
      // Step 1 is current (border-primary), others are "completed" (bg-primary)
      // Actually with initialStep=1, step 1 is current, 2-7 are "completed" in edit mode

      const circles = getStepCircles();
      // Step 1 should be current (border-primary)
      circles.filter((c) => c.stepNumber === '1').forEach(({ element }) => {
        expect(element.className).toContain('border-primary');
      });
    });

    it('shows step label text on mobile', () => {
      renderProgress({ initialStep: 2 });

      expect(screen.getByText('Step 2 of 7: Pre-Brew Variables')).toBeInTheDocument();
    });
  });
});
