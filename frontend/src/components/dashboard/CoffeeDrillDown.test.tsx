import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CoffeeDrillDown from './CoffeeDrillDown';
import * as coffeesApi from '@/api/coffees';
import * as experimentsApi from '@/api/experiments';
import * as sessionsApi from '@/api/sessions';

vi.mock('@/api/coffees', () => ({
  getCoffee: vi.fn(),
  getGoalTrends: vi.fn(),
  setBestExperiment: vi.fn(),
}));

vi.mock('@/api/experiments', () => ({
  listExperiments: vi.fn(),
  analyzeExperimentsWithFilters: vi.fn(),
  analyzeExperimentsDetail: vi.fn(),
  getExperiment: vi.fn(),
  deleteExperiment: vi.fn(),
  copyExperiment: vi.fn(),
}));

vi.mock('@/api/sessions', () => ({
  listSessions: vi.fn(),
  deleteSession: vi.fn(),
}));

// Mock recharts to avoid jsdom rendering issues
vi.mock('recharts', () => ({
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockCoffee: coffeesApi.Coffee = {
  id: 'coffee-1',
  roaster: 'Cata Coffee',
  name: 'Kiamaina',
  experiment_count: 8,
  last_brewed: '2026-01-20T10:30:00Z',
  days_off_roast: 62,
  best_experiment_id: 'exp-1',
  created_at: '2025-11-22T15:00:00Z',
  updated_at: '2025-11-22T15:00:00Z',
};

const mockTrends: coffeesApi.GoalTrendResponse = {
  coffee_id: 'coffee-1',
  metrics: {
    tds: {
      target: 1.38,
      values: [
        { brew_date: '2026-01-10', value: 1.30 },
        { brew_date: '2026-01-15', value: 1.35 },
        { brew_date: '2026-01-20', value: 1.38 },
      ],
      target_met: true,
    },
    overall_score: {
      target: 9,
      values: [
        { brew_date: '2026-01-10', value: 6 },
        { brew_date: '2026-01-15', value: 8 },
        { brew_date: '2026-01-20', value: 8 },
      ],
      target_met: false,
    },
  },
};

const mockExperiments: experimentsApi.Experiment[] = [
  {
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
  },
  {
    id: 'exp-2',
    user_id: 'user-1',
    coffee_id: 'coffee-1',
    brew_date: '2026-01-15T10:30:00Z',
    overall_notes: 'Decent',
    overall_score: 7,
    grind_size: 3.5,
    ratio: 15,
    water_temperature: 94,
    is_draft: false,
    created_at: '2026-01-15T10:35:00Z',
    updated_at: '2026-01-15T10:35:00Z',
  },
];

const mockSessions: sessionsApi.Session[] = [
  {
    id: 'session-1',
    user_id: 'user-1',
    coffee_id: 'coffee-1',
    name: 'Grind size sweep',
    variable_tested: 'grind size',
    hypothesis: 'Finer grind = more sweetness',
    conclusion: 'Confirmed',
    experiment_count: 3,
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-01-22T14:30:00Z',
  },
];

const mockAnalyzeResult: experimentsApi.AnalyzeResponse = {
  correlations: {
    water_temperature: {
      overall_score: { r: 0.42, n: 8, p: 0.01, interpretation: 'weak_positive' },
    },
  },
  inputs: ['water_temperature'],
  outcomes: ['overall_score'],
  experiment_count: 8,
  experiment_ids: ['exp-1', 'exp-2'],
  insights: [{ type: 'strong_correlation', input: 'water_temperature', outcome: 'overall_score', r: 0.42, message: 'Temperature affects score' }],
  warnings: [],
};

function renderDrillDown() {
  return render(
    <MemoryRouter initialEntries={['/dashboard?coffee=coffee-1']}>
      <CoffeeDrillDown coffeeId="coffee-1" />
    </MemoryRouter>
  );
}

describe('CoffeeDrillDown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(coffeesApi.getCoffee).mockResolvedValue(mockCoffee);
    vi.mocked(coffeesApi.getGoalTrends).mockResolvedValue(mockTrends);
    vi.mocked(experimentsApi.listExperiments).mockResolvedValue({
      items: mockExperiments,
      pagination: { page: 1, per_page: 50, total: 2, total_pages: 1 },
    });
    vi.mocked(sessionsApi.listSessions).mockResolvedValue({
      items: mockSessions,
      pagination: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });
    vi.mocked(experimentsApi.analyzeExperimentsWithFilters).mockResolvedValue(mockAnalyzeResult);
  });

  it('renders coffee name and roaster in header', async () => {
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
      expect(screen.getByText(/Cata Coffee/)).toBeInTheDocument();
    });
  });

  it('shows experiment count and days off roast', async () => {
    renderDrillDown();

    await waitFor(() => {
      // Header subtitle contains both experiment count and days off roast
      const subtitle = screen.getByText(/62 days off roast/);
      expect(subtitle).toBeInTheDocument();
      expect(subtitle.textContent).toContain('8 experiments');
    });
  });

  it('fetches data with correct coffee ID', async () => {
    renderDrillDown();

    await waitFor(() => {
      expect(coffeesApi.getCoffee).toHaveBeenCalledWith('coffee-1');
      expect(coffeesApi.getGoalTrends).toHaveBeenCalledWith('coffee-1');
      expect(experimentsApi.listExperiments).toHaveBeenCalledWith(
        expect.objectContaining({ coffee_id: 'coffee-1' })
      );
      expect(sessionsApi.listSessions).toHaveBeenCalledWith('coffee-1');
    });
  });

  it('fetches per-coffee correlations', async () => {
    renderDrillDown();

    await waitFor(() => {
      expect(experimentsApi.analyzeExperimentsWithFilters).toHaveBeenCalledWith({
        coffee_ids: ['coffee-1'],
      });
    });
  });

  it('renders goal trends section with metric values', async () => {
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText('Goal Trends')).toBeInTheDocument();
      expect(screen.getByText('TDS')).toBeInTheDocument();
      // Overall appears in multiple places (trends + correlations)
      expect(screen.getAllByText('Overall').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders correlations section', async () => {
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText('Correlations')).toBeInTheDocument();
      expect(screen.getByText(/Analyzing 8 experiments/)).toBeInTheDocument();
    });
  });

  it('renders insights section', async () => {
    renderDrillDown();

    await waitFor(() => {
      // "Insights" appears both as a section heading and inside AnalyzeView
      const insightHeadings = screen.getAllByText('Insights');
      expect(insightHeadings.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders sessions section with session data', async () => {
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText('Sessions')).toBeInTheDocument();
      expect(screen.getByText('Grind size sweep')).toBeInTheDocument();
    });
  });

  it('renders brew history table with experiments', async () => {
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText('Brew History')).toBeInTheDocument();
      expect(screen.getByText('8/10')).toBeInTheDocument();
      expect(screen.getByText('7/10')).toBeInTheDocument();
    });
  });

  it('shows back link to dashboard', async () => {
    renderDrillDown();

    await waitFor(() => {
      const backLink = screen.getByText('Dashboard');
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/dashboard');
    });
  });

  it('shows loading state initially', () => {
    vi.mocked(coffeesApi.getCoffee).mockImplementation(() => new Promise(() => {}));
    renderDrillDown();

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    vi.mocked(coffeesApi.getCoffee).mockRejectedValue(new Error('Not found'));
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText('Not found')).toBeInTheDocument();
    });
  });

  it('shows message when not enough experiments for correlations', async () => {
    vi.mocked(experimentsApi.analyzeExperimentsWithFilters).mockRejectedValue(
      new Error('minimum 5 experiments required')
    );
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText(/Need at least 5 experiments/)).toBeInTheDocument();
    });
  });

  it('shows no goals message when goal trends fail', async () => {
    vi.mocked(coffeesApi.getGoalTrends).mockRejectedValue(new Error('No goals'));
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText(/No goals set/)).toBeInTheDocument();
    });
  });
});
