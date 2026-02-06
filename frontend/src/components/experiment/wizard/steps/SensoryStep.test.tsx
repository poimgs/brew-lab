import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import SensoryStep from './SensoryStep';
import { type CoffeeGoalInput } from '@/api/coffee-goals';

function SensoryStepWrapper({
  defaultValues = {},
  goals = {},
  onGoalChange = vi.fn(),
}: {
  defaultValues?: Record<string, unknown>;
  goals?: CoffeeGoalInput;
  onGoalChange?: (field: keyof CoffeeGoalInput, value: number | null) => void;
}) {
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
        <SensoryStep goals={goals} onGoalChange={onGoalChange} />
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

      // Each label appears twice: once for the slider and once for the target goal
      const attributes = ['Aroma', 'Body', 'Flavor', 'Brightness', 'Sweetness', 'Cleanliness', 'Complexity', 'Balance', 'Aftertaste'];
      for (const attr of attributes) {
        expect(screen.getAllByText(attr).length).toBeGreaterThanOrEqual(1);
      }
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

  describe('target goals section', () => {
    it('renders target goals heading and description', () => {
      render(<SensoryStepWrapper />);
      expect(screen.getByText('Target Goals')).toBeInTheDocument();
      expect(screen.getByText(/set target sensory scores/i)).toBeInTheDocument();
    });

    it('renders all 10 goal input fields (9 sensory + overall)', () => {
      render(<SensoryStepWrapper />);
      const goalFields = [
        'goal_aroma_intensity', 'goal_sweetness_intensity', 'goal_body_intensity',
        'goal_flavor_intensity', 'goal_brightness_intensity', 'goal_cleanliness_intensity',
        'goal_complexity_intensity', 'goal_balance_intensity', 'goal_aftertaste_intensity',
        'goal_overall_score',
      ];
      for (const id of goalFields) {
        expect(document.getElementById(id)).toBeInTheDocument();
      }
    });

    it('displays pre-populated goal values', () => {
      render(
        <SensoryStepWrapper
          goals={{
            aroma_intensity: 7,
            sweetness_intensity: 8,
            body_intensity: 6,
            overall_score: 9,
          }}
        />
      );
      expect(document.getElementById('goal_aroma_intensity')).toHaveValue(7);
      expect(document.getElementById('goal_sweetness_intensity')).toHaveValue(8);
      expect(document.getElementById('goal_body_intensity')).toHaveValue(6);
      expect(document.getElementById('goal_overall_score')).toHaveValue(9);
    });

    it('shows empty fields when no goals are set', () => {
      render(<SensoryStepWrapper goals={{}} />);
      expect(document.getElementById('goal_aroma_intensity')).toHaveValue(null);
      expect(document.getElementById('goal_overall_score')).toHaveValue(null);
    });

    it('calls onGoalChange when a sensory goal is edited', async () => {
      const onGoalChange = vi.fn();
      const user = userEvent.setup();
      render(<SensoryStepWrapper goals={{}} onGoalChange={onGoalChange} />);

      const aromaGoal = document.getElementById('goal_aroma_intensity')!;
      await user.type(aromaGoal, '7');

      expect(onGoalChange).toHaveBeenCalledWith('aroma_intensity', 7);
    });

    it('calls onGoalChange with null when a goal field is cleared', async () => {
      const onGoalChange = vi.fn();
      const user = userEvent.setup();
      render(
        <SensoryStepWrapper
          goals={{ aroma_intensity: 7 }}
          onGoalChange={onGoalChange}
        />
      );

      const aromaGoal = document.getElementById('goal_aroma_intensity')!;
      await user.clear(aromaGoal);

      expect(onGoalChange).toHaveBeenCalledWith('aroma_intensity', null);
    });

    it('clamps goal values to 1-10 range', async () => {
      const onGoalChange = vi.fn();
      const user = userEvent.setup();
      render(<SensoryStepWrapper goals={{}} onGoalChange={onGoalChange} />);

      const aromaGoal = document.getElementById('goal_aroma_intensity')!;
      await user.type(aromaGoal, '15');

      // Should clamp to 10
      const lastCall = onGoalChange.mock.calls[onGoalChange.mock.calls.length - 1];
      expect(lastCall[0]).toBe('aroma_intensity');
      expect(lastCall[1]).toBeLessThanOrEqual(10);
    });
  });
});
