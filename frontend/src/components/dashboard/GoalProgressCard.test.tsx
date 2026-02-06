import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GoalProgressCard from './GoalProgressCard';
import type { Coffee } from '@/api/coffees';

function makeCoffee(overrides: Partial<Coffee> = {}): Coffee {
  return {
    id: 'coffee-1',
    roaster: 'Cata Coffee',
    name: 'Kiamaina',
    experiment_count: 8,
    last_brewed: '2026-01-20T10:30:00Z',
    created_at: '2025-11-22T15:00:00Z',
    updated_at: '2025-11-22T15:00:00Z',
    ...overrides,
  };
}

function renderCard(coffee: Coffee) {
  return render(
    <MemoryRouter>
      <GoalProgressCard coffee={coffee} />
    </MemoryRouter>
  );
}

describe('GoalProgressCard', () => {
  it('renders coffee name and roaster', () => {
    renderCard(makeCoffee());

    expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    expect(screen.getByText(/Cata Coffee/)).toBeInTheDocument();
  });

  it('renders experiment count and last brewed date', () => {
    renderCard(makeCoffee());

    expect(screen.getByText(/8 experiments/)).toBeInTheDocument();
    expect(screen.getByText(/Last brewed/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 20/)).toBeInTheDocument();
  });

  it('renders singular "experiment" when count is 1', () => {
    renderCard(makeCoffee({ experiment_count: 1 }));

    expect(screen.getByText(/1 experiment(?!s)/)).toBeInTheDocument();
  });

  it('renders "View" link pointing to per-coffee drill-down', () => {
    renderCard(makeCoffee());

    const viewLink = screen.getByText('View').closest('a');
    expect(viewLink).toHaveAttribute('href', '/dashboard?coffee=coffee-1');
  });

  it('renders progress bars when goals and latest values are set', () => {
    const coffee = makeCoffee({
      goals: {
        id: 'goal-1',
        tds: 1.38,
        sweetness_intensity: 8,
        overall_score: 9,
      },
      latest_values: {
        tds: 1.35,
        sweetness_intensity: 8,
        overall_score: 8,
      },
    });
    renderCard(coffee);

    expect(screen.getByText('TDS')).toBeInTheDocument();
    expect(screen.getByText(/1\.35/)).toBeInTheDocument();
    expect(screen.getByText(/1\.38 target/)).toBeInTheDocument();

    expect(screen.getByText('Sweetness')).toBeInTheDocument();
    expect(screen.getByText('Overall')).toBeInTheDocument();
  });

  it('shows checkmark when a goal is met', () => {
    const coffee = makeCoffee({
      goals: {
        id: 'goal-1',
        sweetness_intensity: 8,
        overall_score: 9,
      },
      latest_values: {
        sweetness_intensity: 8,
        overall_score: 7,
      },
    });
    renderCard(coffee);

    // Sweetness is met (8 >= 8), overall is not (7 < 9)
    // The check icon shows as an SVG element inside the Sweetness row
    const sweetRow = screen.getByText('Sweetness').closest('.space-y-1')!;
    const overallRow = screen.getByText('Overall').closest('.space-y-1')!;

    expect(sweetRow.querySelectorAll('svg')).toHaveLength(1);
    expect(overallRow.querySelectorAll('svg')).toHaveLength(0);
  });

  it('shows "Set goals to track progress" when no goals', () => {
    renderCard(makeCoffee({ goals: undefined, latest_values: undefined }));

    expect(screen.getByText('Set goals to track progress')).toBeInTheDocument();
  });

  it('shows message when goals set but no latest values', () => {
    const coffee = makeCoffee({
      goals: {
        id: 'goal-1',
        tds: 1.38,
      },
      latest_values: undefined,
    });
    renderCard(coffee);

    expect(screen.getByText('No experiment data yet to compare against goals.')).toBeInTheDocument();
  });

  it('does not show last_brewed when not available', () => {
    renderCard(makeCoffee({ last_brewed: undefined }));

    expect(screen.queryByText(/Last brewed/)).not.toBeInTheDocument();
  });
});
