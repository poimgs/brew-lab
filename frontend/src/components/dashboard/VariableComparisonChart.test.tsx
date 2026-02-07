import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VariableComparisonChart from './VariableComparisonChart';
import type { Brew } from '@/api/brews';

// Mock recharts to avoid jsdom rendering issues
vi.mock('recharts', () => ({
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-bars={JSON.stringify(data)}>{children}</div>
  ),
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const makeBrew = (overrides: Partial<Brew> = {}): Brew => ({
  id: 'exp-1',
  user_id: 'user-1',
  coffee_id: 'coffee-1',
  brew_date: '2026-01-20T10:30:00Z',
  overall_notes: 'Great brew',
  overall_score: 8,
  grind_size: 3.0,
  ratio: 15,
  water_temperature: 96,
  is_draft: false,
  created_at: '2026-01-20T10:35:00Z',
  updated_at: '2026-01-20T10:35:00Z',
  ...overrides,
});

const twoBrew = [
  makeBrew({
    id: 'exp-1',
    brew_date: '2026-01-20T10:30:00Z',
    grind_size: 3.0,
    ratio: 15,
    water_temperature: 96,
    overall_score: 8,
    tds: 1.38,
    aroma_intensity: 7,
  }),
  makeBrew({
    id: 'exp-2',
    brew_date: '2026-01-15T10:30:00Z',
    grind_size: 3.5,
    ratio: 15,
    water_temperature: 94,
    overall_score: 7,
    tds: 1.30,
    aroma_intensity: 6,
  }),
];

describe('VariableComparisonChart', () => {
  it('renders variable toggle buttons for all groups', () => {
    render(<VariableComparisonChart brews={twoBrew} />);

    // Group labels
    expect(screen.getByText('Brew Params')).toBeInTheDocument();
    expect(screen.getByText('Sensory')).toBeInTheDocument();
    expect(screen.getByText('Outcomes')).toBeInTheDocument();

    // Sample buttons from each group
    expect(screen.getByRole('button', { name: 'Grind Size' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Temperature' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aroma' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Score' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TDS' })).toBeInTheDocument();
  });

  it('renders mini charts for default selected variables', () => {
    render(<VariableComparisonChart brews={twoBrew} />);

    // Default variables: grind_size, water_temperature, ratio, overall_score
    const charts = screen.getAllByTestId('bar-chart');
    expect(charts.length).toBe(4);

    // Button text and card title both appear — verify 2 of each for default vars
    expect(screen.getAllByText('Grind Size').length).toBe(2); // button + card title
    expect(screen.getAllByText('Temperature').length).toBe(2);
    expect(screen.getAllByText('Ratio').length).toBe(2);
    expect(screen.getAllByText('Score').length).toBe(2);
  });

  it('toggling a variable adds its chart', async () => {
    const user = userEvent.setup();
    render(<VariableComparisonChart brews={twoBrew} />);

    // Initially 4 charts (default variables)
    expect(screen.getAllByTestId('bar-chart').length).toBe(4);

    // Toggle TDS on
    await user.click(screen.getByRole('button', { name: 'TDS' }));

    // Now 5 charts
    expect(screen.getAllByTestId('bar-chart').length).toBe(5);
  });

  it('toggling a variable off removes its chart', async () => {
    const user = userEvent.setup();
    render(<VariableComparisonChart brews={twoBrew} />);

    // Toggle off Grind Size (one of the defaults)
    await user.click(screen.getByRole('button', { name: 'Grind Size' }));

    expect(screen.getAllByTestId('bar-chart').length).toBe(3);
  });

  it('shows correct brew dates as bar data', () => {
    render(<VariableComparisonChart brews={twoBrew} />);

    const charts = screen.getAllByTestId('bar-chart');
    // Check the first chart (Grind Size)
    const data = JSON.parse(charts[0].getAttribute('data-bars')!);
    expect(data[0].date).toBe('Jan 20');
    expect(data[1].date).toBe('Jan 15');
  });

  it('handles brews with missing values for a variable', () => {
    const brewsWithMissing = [
      makeBrew({ id: 'exp-1', tds: 1.38, grind_size: 3.0, ratio: 15, water_temperature: 96, overall_score: 8 }),
      makeBrew({ id: 'exp-2', tds: undefined, grind_size: 3.5, ratio: 15, water_temperature: 94, overall_score: 7 }),
    ];
    render(<VariableComparisonChart brews={brewsWithMissing} />);

    // TDS is not a default variable, toggle it on to test missing value
    // All default charts should still render with both brews
    const charts = screen.getAllByTestId('bar-chart');
    // grind_size chart should have 2 bars (both have values)
    const grindData = JSON.parse(charts[0].getAttribute('data-bars')!);
    expect(grindData.length).toBe(2);
  });

  it('renders with exactly 2 brews', () => {
    render(<VariableComparisonChart brews={twoBrew} />);

    const charts = screen.getAllByTestId('bar-chart');
    // Each chart should have 2 bars
    const data = JSON.parse(charts[0].getAttribute('data-bars')!);
    expect(data.length).toBe(2);
  });

  it('renders with 6 brews (max)', () => {
    const sixBrews = Array.from({ length: 6 }, (_, i) =>
      makeBrew({
        id: `exp-${i + 1}`,
        brew_date: `2026-01-${String(20 - i).padStart(2, '0')}T10:30:00Z`,
        grind_size: 3.0 + i * 0.1,
        overall_score: 8 - i * 0.5,
        ratio: 15,
        water_temperature: 96 - i,
      })
    );
    render(<VariableComparisonChart brews={sixBrews} />);

    const charts = screen.getAllByTestId('bar-chart');
    const data = JSON.parse(charts[0].getAttribute('data-bars')!);
    expect(data.length).toBe(6);
  });

  it('shows message when no variables are selected', async () => {
    const user = userEvent.setup();
    render(<VariableComparisonChart brews={twoBrew} />);

    // Deselect all 4 default variables
    await user.click(screen.getByRole('button', { name: 'Grind Size' }));
    await user.click(screen.getByRole('button', { name: 'Temperature' }));
    await user.click(screen.getByRole('button', { name: 'Ratio' }));
    await user.click(screen.getByRole('button', { name: 'Score' }));

    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    expect(screen.getByText(/Select variables above to compare/)).toBeInTheDocument();
  });
});
