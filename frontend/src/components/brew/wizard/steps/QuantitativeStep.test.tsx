import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import QuantitativeStep from './QuantitativeStep';
import { type CoffeeGoalInput } from '@/api/coffee-goals';

function QuantitativeStepWrapper({
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
      coffee_ml: null,
      tds: null,
      extraction_yield: null,
      drawdown_time: null,
      coffee_weight: null,
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...methods}>
      <form>
        <QuantitativeStep goals={goals} onGoalChange={onGoalChange} />
      </form>
    </FormProvider>
  );
}

describe('QuantitativeStep', () => {
  describe('brew fields', () => {
    it('renders quantitative outcomes heading', () => {
      render(<QuantitativeStepWrapper />);
      expect(screen.getByText('Quantitative Outcomes')).toBeInTheDocument();
    });

    it('renders all brew input fields', () => {
      render(<QuantitativeStepWrapper />);
      expect(document.getElementById('coffee_ml')).toBeInTheDocument();
      expect(document.getElementById('tds')).toBeInTheDocument();
      expect(document.getElementById('extraction_yield')).toBeInTheDocument();
      expect(document.getElementById('drawdown_time')).toBeInTheDocument();
    });
  });

  describe('target goals section', () => {
    it('renders target goals heading and description', () => {
      render(<QuantitativeStepWrapper />);
      expect(screen.getByText('Target Goals')).toBeInTheDocument();
      expect(screen.getByText(/set target values/i)).toBeInTheDocument();
    });

    it('renders goal input fields with empty placeholders when no goals set', () => {
      render(<QuantitativeStepWrapper goals={{}} />);
      const goalCoffeeMl = screen.getByLabelText('Coffee (ml)', { selector: '#goal_coffee_ml' });
      const goalTds = screen.getByLabelText('TDS (%)', { selector: '#goal_tds' });
      const goalExtraction = screen.getByLabelText('Extraction (%)', { selector: '#goal_extraction_yield' });
      expect(goalCoffeeMl).toHaveValue(null);
      expect(goalTds).toHaveValue(null);
      expect(goalExtraction).toHaveValue(null);
    });

    it('displays pre-populated goal values', () => {
      render(
        <QuantitativeStepWrapper
          goals={{ coffee_ml: 180, tds: 1.38, extraction_yield: 20.5 }}
        />
      );
      const goalCoffeeMl = screen.getByLabelText('Coffee (ml)', { selector: '#goal_coffee_ml' });
      const goalTds = screen.getByLabelText('TDS (%)', { selector: '#goal_tds' });
      const goalExtraction = screen.getByLabelText('Extraction (%)', { selector: '#goal_extraction_yield' });
      expect(goalCoffeeMl).toHaveValue(180);
      expect(goalTds).toHaveValue(1.38);
      expect(goalExtraction).toHaveValue(20.5);
    });

    it('calls onGoalChange when a goal value is edited', async () => {
      const onGoalChange = vi.fn();
      const user = userEvent.setup();
      render(<QuantitativeStepWrapper goals={{}} onGoalChange={onGoalChange} />);

      const goalTds = screen.getByLabelText('TDS (%)', { selector: '#goal_tds' });
      await user.type(goalTds, '1.4');

      expect(onGoalChange).toHaveBeenCalled();
      // Last call should have the final parsed value
      const lastCall = onGoalChange.mock.calls[onGoalChange.mock.calls.length - 1];
      expect(lastCall[0]).toBe('tds');
    });

    it('calls onGoalChange with null when a goal field is cleared', async () => {
      const onGoalChange = vi.fn();
      const user = userEvent.setup();
      render(
        <QuantitativeStepWrapper
          goals={{ tds: 1.38 }}
          onGoalChange={onGoalChange}
        />
      );

      const goalTds = screen.getByLabelText('TDS (%)', { selector: '#goal_tds' });
      await user.clear(goalTds);

      expect(onGoalChange).toHaveBeenCalledWith('tds', null);
    });
  });
});
