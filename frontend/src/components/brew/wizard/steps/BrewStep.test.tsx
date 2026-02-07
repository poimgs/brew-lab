import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import BrewStep from './BrewStep';

// Wrapper that provides FormProvider with configurable default values
function BrewStepWrapper({ defaultValues = {} }: { defaultValues?: Record<string, unknown> }) {
  const methods = useForm({
    defaultValues: {
      bloom_water: null,
      bloom_time: null,
      pours: [],
      total_brew_time: null,
      technique_notes: '',
      water_weight: null,
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...methods}>
      <form>
        <BrewStep />
      </form>
    </FormProvider>
  );
}

describe('BrewStep', () => {
  describe('rendering', () => {
    it('renders brew variables heading and fields', () => {
      render(<BrewStepWrapper />);

      expect(screen.getByText('Brew Variables')).toBeInTheDocument();
      expect(screen.getByLabelText('Bloom Water (g)')).toBeInTheDocument();
      expect(screen.getByLabelText('Bloom Time (seconds)')).toBeInTheDocument();
      expect(screen.getByText('Pours')).toBeInTheDocument();
      expect(screen.getByLabelText('Total Brew Time (seconds)')).toBeInTheDocument();
      expect(screen.getByLabelText('Technique Notes')).toBeInTheDocument();
    });

    it('shows empty pours message when no pours exist', () => {
      render(<BrewStepWrapper />);

      expect(screen.getByText(/no pours recorded yet/i)).toBeInTheDocument();
    });
  });

  describe('pours management', () => {
    it('adds a pour when Add Pour is clicked', async () => {
      const user = userEvent.setup();
      render(<BrewStepWrapper />);

      await user.click(screen.getByRole('button', { name: /add pour/i }));

      // Empty pours message should be gone, pour row should appear
      expect(screen.queryByText(/no pours recorded yet/i)).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('Water (g)')).toBeInTheDocument();
    });

    it('removes a pour when delete is clicked', async () => {
      const user = userEvent.setup();
      render(
        <BrewStepWrapper
          defaultValues={{
            pours: [{ pour_number: 1, water_amount: 90, pour_style: 'circular', notes: '' }],
          }}
        />
      );

      // Pour should exist
      expect(screen.queryByText(/no pours recorded yet/i)).not.toBeInTheDocument();

      // Click the delete button (Trash2 icon button)
      const deleteButtons = screen.getAllByRole('button').filter(
        (btn) => btn.querySelector('svg.lucide-trash-2') || btn.closest('.text-destructive')
      );
      // There should be at least one delete button for the pour
      expect(deleteButtons.length).toBeGreaterThan(0);
      await user.click(deleteButtons[0]);

      // Pour should be removed
      expect(screen.getByText(/no pours recorded yet/i)).toBeInTheDocument();
    });
  });

  describe('water weight mismatch warning', () => {
    it('shows warning when bloom + pours differs from water weight', () => {
      render(
        <BrewStepWrapper
          defaultValues={{
            water_weight: 225,
            bloom_water: 40,
            pours: [
              { pour_number: 1, water_amount: 90, pour_style: 'circular', notes: '' },
              { pour_number: 2, water_amount: 90, pour_style: 'circular', notes: '' },
            ],
          }}
        />
      );

      // bloom (40) + pours (90+90=180) = 220, but water_weight is 225
      const warning = screen.getByRole('alert');
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveTextContent('Bloom + pours (220g) differs from water weight (225g)');
    });

    it('does not show warning when bloom + pours matches water weight', () => {
      render(
        <BrewStepWrapper
          defaultValues={{
            water_weight: 225,
            bloom_water: 45,
            pours: [
              { pour_number: 1, water_amount: 90, pour_style: 'circular', notes: '' },
              { pour_number: 2, water_amount: 90, pour_style: 'circular', notes: '' },
            ],
          }}
        />
      );

      // bloom (45) + pours (90+90=180) = 225, matches water_weight
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not show warning when water weight is not set', () => {
      render(
        <BrewStepWrapper
          defaultValues={{
            water_weight: null,
            bloom_water: 40,
            pours: [
              { pour_number: 1, water_amount: 90, pour_style: 'circular', notes: '' },
            ],
          }}
        />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not show warning when no bloom or pours data exists', () => {
      render(
        <BrewStepWrapper
          defaultValues={{
            water_weight: 225,
            bloom_water: null,
            pours: [],
          }}
        />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows warning with only bloom water (no pours) when it differs', () => {
      render(
        <BrewStepWrapper
          defaultValues={{
            water_weight: 225,
            bloom_water: 40,
            pours: [],
          }}
        />
      );

      // bloom (40), no pours, water_weight is 225 => mismatch
      const warning = screen.getByRole('alert');
      expect(warning).toHaveTextContent('Bloom + pours (40g) differs from water weight (225g)');
    });

    it('shows warning with only pours (no bloom) when it differs', () => {
      render(
        <BrewStepWrapper
          defaultValues={{
            water_weight: 225,
            bloom_water: null,
            pours: [
              { pour_number: 1, water_amount: 100, pour_style: 'circular', notes: '' },
            ],
          }}
        />
      );

      // no bloom, pours (100), water_weight is 225 => mismatch
      const warning = screen.getByRole('alert');
      expect(warning).toHaveTextContent('Bloom + pours (100g) differs from water weight (225g)');
    });

    it('warning is non-blocking (no submit prevention)', () => {
      render(
        <BrewStepWrapper
          defaultValues={{
            water_weight: 225,
            bloom_water: 40,
            pours: [
              { pour_number: 1, water_amount: 90, pour_style: 'circular', notes: '' },
            ],
          }}
        />
      );

      // Warning exists but all form inputs remain interactive
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByLabelText('Bloom Water (g)')).not.toBeDisabled();
      expect(screen.getByLabelText('Total Brew Time (seconds)')).not.toBeDisabled();
    });

    it('shows warning when bloom + pours exceeds water weight', () => {
      render(
        <BrewStepWrapper
          defaultValues={{
            water_weight: 200,
            bloom_water: 45,
            pours: [
              { pour_number: 1, water_amount: 90, pour_style: 'circular', notes: '' },
              { pour_number: 2, water_amount: 90, pour_style: 'circular', notes: '' },
            ],
          }}
        />
      );

      // bloom (45) + pours (90+90=180) = 225, exceeds water_weight 200
      const warning = screen.getByRole('alert');
      expect(warning).toHaveTextContent('Bloom + pours (225g) differs from water weight (200g)');
    });
  });
});
