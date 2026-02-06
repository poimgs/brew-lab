import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import SensoryStep from './SensoryStep';

function SensoryStepWrapper({ defaultValues = {} }: { defaultValues?: Record<string, unknown> }) {
  const methods = useForm({
    defaultValues: {
      aroma_intensity: null,
      aroma_notes: '',
      body_intensity: null,
      body_notes: '',
      flavor_intensity: null,
      flavor_notes: '',
      brightness_intensity: null,
      brightness_notes: '',
      sweetness_intensity: null,
      sweetness_notes: '',
      cleanliness_intensity: null,
      cleanliness_notes: '',
      complexity_intensity: null,
      complexity_notes: '',
      balance_intensity: null,
      balance_notes: '',
      aftertaste_intensity: null,
      aftertaste_notes: '',
      overall_score: null,
      overall_notes: '',
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...methods}>
      <form>
        <SensoryStep />
      </form>
    </FormProvider>
  );
}

describe('SensoryStep', () => {
  describe('rendering', () => {
    it('renders sensory outcomes heading and description', () => {
      render(<SensoryStepWrapper />);

      expect(screen.getByText('Sensory Outcomes')).toBeInTheDocument();
      expect(screen.getByText(/rate the taste characteristics/i)).toBeInTheDocument();
    });

    it('renders all 9 sensory attribute labels', () => {
      render(<SensoryStepWrapper />);

      expect(screen.getByText('Aroma')).toBeInTheDocument();
      expect(screen.getByText('Body')).toBeInTheDocument();
      expect(screen.getByText('Flavor')).toBeInTheDocument();
      expect(screen.getByText('Brightness')).toBeInTheDocument();
      expect(screen.getByText('Sweetness')).toBeInTheDocument();
      expect(screen.getByText('Cleanliness')).toBeInTheDocument();
      expect(screen.getByText('Complexity')).toBeInTheDocument();
      expect(screen.getByText('Balance')).toBeInTheDocument();
      expect(screen.getByText('Aftertaste')).toBeInTheDocument();
    });

    it('renders overall notes and overall score fields', () => {
      render(<SensoryStepWrapper />);

      expect(screen.getByLabelText(/overall notes/i)).toBeInTheDocument();
      expect(screen.getByText('Overall Score (1-10)')).toBeInTheDocument();
    });

    it('does not render removed sensory fields (acidity, bitterness)', () => {
      render(<SensoryStepWrapper />);

      expect(screen.queryByText('Acidity')).not.toBeInTheDocument();
      expect(screen.queryByText('Bitterness')).not.toBeInTheDocument();
    });
  });

  describe('flavor reference', () => {
    it('renders flavor reference button', () => {
      render(<SensoryStepWrapper />);

      expect(screen.getByRole('button', { name: /flavor reference/i })).toBeInTheDocument();
    });

    it('flavor reference is collapsed by default', () => {
      render(<SensoryStepWrapper />);

      // Category names should not be visible when collapsed
      expect(screen.queryByText('Fruity')).not.toBeInTheDocument();
      expect(screen.queryByText('Floral')).not.toBeInTheDocument();
    });

    it('expands flavor reference when clicked', async () => {
      const user = userEvent.setup();
      render(<SensoryStepWrapper />);

      await user.click(screen.getByRole('button', { name: /flavor reference/i }));

      // Categories should now be visible
      expect(screen.getByText('Fruity')).toBeInTheDocument();
      expect(screen.getByText('Sweet')).toBeInTheDocument();
      expect(screen.getByText('Floral')).toBeInTheDocument();
      expect(screen.getByText('Nutty / Cocoa')).toBeInTheDocument();
      expect(screen.getByText('Spicy')).toBeInTheDocument();
      expect(screen.getByText('Roasted')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });

    it('shows flavor descriptors when expanded', async () => {
      const user = userEvent.setup();
      render(<SensoryStepWrapper />);

      await user.click(screen.getByRole('button', { name: /flavor reference/i }));

      // Check some specific descriptors
      expect(screen.getByText(/Berry.*Citrus.*Stone Fruit/)).toBeInTheDocument();
      expect(screen.getByText(/Chocolate.*Caramel.*Honey/)).toBeInTheDocument();
      expect(screen.getByText(/Jasmine.*Rose/)).toBeInTheDocument();
    });

    it('collapses flavor reference when clicked again', async () => {
      const user = userEvent.setup();
      render(<SensoryStepWrapper />);

      const button = screen.getByRole('button', { name: /flavor reference/i });

      // Open
      await user.click(button);
      expect(screen.getByText('Fruity')).toBeInTheDocument();

      // Close
      await user.click(button);
      expect(screen.queryByText('Fruity')).not.toBeInTheDocument();
    });
  });
});
