import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SensoryRadarChart from './SensoryRadarChart';
import type { Brew } from '@/api/brews';
import type { CoffeeGoalSummary } from '@/api/coffees';

// Mock recharts to avoid jsdom rendering issues
vi.mock('recharts', () => ({
  RadarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="radar-chart" data-points={JSON.stringify(data)}>{children}</div>
  ),
  Radar: ({ name, dataKey }: { name: string; dataKey: string }) => (
    <div data-testid={`radar-${dataKey}`} data-name={name} />
  ),
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => null,
}));

const makeBrew = (overrides: Partial<Brew> = {}): Brew => ({
  id: 'exp-1',
  user_id: 'user-1',
  coffee_id: 'coffee-1',
  brew_date: '2026-01-20T10:30:00Z',
  overall_notes: 'Great brew',
  overall_score: 8,
  is_draft: false,
  created_at: '2026-01-20T10:35:00Z',
  updated_at: '2026-01-20T10:35:00Z',
  ...overrides,
});

const makeGoals = (overrides: Partial<CoffeeGoalSummary> = {}): CoffeeGoalSummary => ({
  id: 'goal-1',
  aroma_intensity: 7,
  sweetness_intensity: 8,
  body_intensity: 6,
  flavor_intensity: 8,
  brightness_intensity: 7,
  cleanliness_intensity: 7,
  complexity_intensity: 8,
  balance_intensity: 8,
  aftertaste_intensity: 7,
  ...overrides,
});

describe('SensoryRadarChart', () => {
  it('renders fallback when both props are null', () => {
    render(<SensoryRadarChart referenceBrew={null} goals={null} />);

    expect(screen.getByText(/No sensory data or goals set/)).toBeInTheDocument();
    expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
  });

  it('renders fallback when brew has no sensory data and goals is null', () => {
    const brew = makeBrew(); // no sensory fields
    render(<SensoryRadarChart referenceBrew={brew} goals={null} />);

    expect(screen.getByText(/No sensory data or goals set/)).toBeInTheDocument();
  });

  it('renders reference radar layer when brew has sensory data', () => {
    const brew = makeBrew({
      aroma_intensity: 7,
      sweetness_intensity: 8,
      body_intensity: 6,
    });
    render(<SensoryRadarChart referenceBrew={brew} goals={null} />);

    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('radar-reference')).toBeInTheDocument();
    expect(screen.queryByTestId('radar-target')).not.toBeInTheDocument();
  });

  it('renders target radar layer when goals have sensory values', () => {
    const goals = makeGoals();
    render(<SensoryRadarChart referenceBrew={null} goals={goals} />);

    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('radar-reference')).not.toBeInTheDocument();
    expect(screen.getByTestId('radar-target')).toBeInTheDocument();
  });

  it('renders both layers when both props provided', () => {
    const brew = makeBrew({
      aroma_intensity: 6,
      sweetness_intensity: 7,
      body_intensity: 5,
      flavor_intensity: 7,
      brightness_intensity: 6,
      cleanliness_intensity: 6,
      complexity_intensity: 7,
      balance_intensity: 7,
      aftertaste_intensity: 6,
    });
    const goals = makeGoals();
    render(<SensoryRadarChart referenceBrew={brew} goals={goals} />);

    expect(screen.getByTestId('radar-reference')).toBeInTheDocument();
    expect(screen.getByTestId('radar-target')).toBeInTheDocument();
  });

  it('shows "Set goals" prompt when only brew provided', () => {
    const brew = makeBrew({ aroma_intensity: 7 });
    render(<SensoryRadarChart referenceBrew={brew} goals={null} />);

    expect(screen.getByText(/Set goals to see target overlay/)).toBeInTheDocument();
  });

  it('shows "Brew a coffee" prompt when only goals provided', () => {
    const goals = makeGoals();
    render(<SensoryRadarChart referenceBrew={null} goals={goals} />);

    expect(screen.getByText(/Brew a coffee to see how it compares/)).toBeInTheDocument();
  });

  it('maps all 9 sensory dimensions correctly', () => {
    const brew = makeBrew({
      aroma_intensity: 6,
      sweetness_intensity: 7,
      body_intensity: 5,
      flavor_intensity: 7,
      brightness_intensity: 6,
      cleanliness_intensity: 6,
      complexity_intensity: 7,
      balance_intensity: 7,
      aftertaste_intensity: 6,
    });
    const goals = makeGoals();
    render(<SensoryRadarChart referenceBrew={brew} goals={goals} />);

    const chart = screen.getByTestId('radar-chart');
    const data = JSON.parse(chart.getAttribute('data-points')!);
    expect(data).toHaveLength(9);

    const labels = data.map((d: { label: string }) => d.label);
    expect(labels).toEqual([
      'Aroma', 'Sweetness', 'Body', 'Flavor', 'Brightness',
      'Cleanliness', 'Complexity', 'Balance', 'Aftertaste',
    ]);

    // Check reference values
    expect(data[0].reference).toBe(6); // aroma
    expect(data[1].reference).toBe(7); // sweetness
    // Check target values
    expect(data[0].target).toBe(7); // aroma goal
    expect(data[1].target).toBe(8); // sweetness goal
  });

  it('handles brew with partial sensory data', () => {
    const brew = makeBrew({
      aroma_intensity: 7,
      // only aroma set, rest undefined
    });
    const goals = makeGoals();
    render(<SensoryRadarChart referenceBrew={brew} goals={goals} />);

    const chart = screen.getByTestId('radar-chart');
    const data = JSON.parse(chart.getAttribute('data-points')!);
    expect(data[0].reference).toBe(7); // aroma set
    expect(data[1].reference).toBeUndefined(); // sweetness not set
    expect(data[0].target).toBe(7); // goals still present
  });
});
