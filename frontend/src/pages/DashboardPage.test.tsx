import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import * as coffeesApi from '@/api/coffees';
import * as experimentsApi from '@/api/experiments';

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

vi.mock('@/api/coffees', () => ({
  listCoffees: vi.fn(),
  getGoalTrends: vi.fn(),
}));

vi.mock('@/api/experiments', () => ({
  analyzeExperimentsWithFilters: vi.fn(),
  analyzeExperimentsDetail: vi.fn(),
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

const mockCoffeeWithGoals: coffeesApi.Coffee = {
  id: 'coffee-1',
  roaster: 'Cata Coffee',
  name: 'Kiamaina',
  experiment_count: 8,
  last_brewed: '2026-01-20T10:30:00Z',
  created_at: '2025-11-22T15:00:00Z',
  updated_at: '2025-11-22T15:00:00Z',
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
};

const mockCoffeeNoGoals: coffeesApi.Coffee = {
  id: 'coffee-2',
  roaster: 'Onyx',
  name: 'El Calagual',
  experiment_count: 5,
  last_brewed: '2026-01-18T10:30:00Z',
  created_at: '2025-12-01T15:00:00Z',
  updated_at: '2025-12-01T15:00:00Z',
};

const mockCoffeeNoExperiments: coffeesApi.Coffee = {
  id: 'coffee-3',
  roaster: 'Sweet Bloom',
  name: 'Ethiopia Natural',
  experiment_count: 0,
  created_at: '2026-01-01T15:00:00Z',
  updated_at: '2026-01-01T15:00:00Z',
};

const mockAnalyzeResult: experimentsApi.AnalyzeResponse = {
  correlations: {
    water_temperature: {
      overall_score: { r: 0.42, n: 12, p: 0.004, interpretation: 'weak_positive' },
    },
  },
  inputs: ['water_temperature'],
  outcomes: ['overall_score'],
  experiment_count: 13,
  experiment_ids: ['exp-1', 'exp-2'],
  insights: [
    { type: 'strong_correlation', input: 'water_temperature', outcome: 'overall_score', r: 0.42, message: 'Temperature affects overall score' },
  ],
  warnings: [],
};

function renderDashboard(route = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(coffeesApi.listCoffees).mockResolvedValue({
      items: [mockCoffeeWithGoals, mockCoffeeNoGoals, mockCoffeeNoExperiments],
      pagination: { page: 1, per_page: 100, total: 3, total_pages: 1 },
    });
    vi.mocked(experimentsApi.analyzeExperimentsWithFilters).mockResolvedValue(mockAnalyzeResult);
  });

  it('renders the dashboard heading', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    vi.mocked(coffeesApi.listCoffees).mockImplementation(() => new Promise(() => {}));
    renderDashboard();

    // Should show a spinner (Loader2 renders as svg)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('fetches coffees with include_goals and include_trend', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(coffeesApi.listCoffees).toHaveBeenCalledWith(
        expect.objectContaining({
          include_goals: true,
          include_trend: true,
        })
      );
    });
  });

  it('fetches correlations with no filters for landing page', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(experimentsApi.analyzeExperimentsWithFilters).toHaveBeenCalledWith({});
    });
  });

  it('renders goal progress cards for coffees with experiments', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
      expect(screen.getByText('El Calagual')).toBeInTheDocument();
    });

    // Coffee with no experiments should NOT be shown
    expect(screen.queryByText('Ethiopia Natural')).not.toBeInTheDocument();
  });

  it('shows goal progress bars for coffee with goals', async () => {
    renderDashboard();

    await waitFor(() => {
      // TDS and Sweetness appear only in goal cards, "Overall" also in AnalyzeView header
      expect(screen.getByText('TDS')).toBeInTheDocument();
      expect(screen.getByText('Sweetness')).toBeInTheDocument();
      // Use getAllByText for 'Overall' since it appears in both goal card and correlation table
      expect(screen.getAllByText('Overall').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows "Set goals" prompt for coffee without goals', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Set goals to track progress')).toBeInTheDocument();
    });
  });

  it('renders correlation analysis section', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Correlations')).toBeInTheDocument();
      expect(screen.getByText(/Analyzing 13 experiments/)).toBeInTheDocument();
    });
  });

  it('shows message when not enough experiments for correlations', async () => {
    vi.mocked(experimentsApi.analyzeExperimentsWithFilters).mockRejectedValue(
      new Error('minimum 5 experiments required')
    );
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Need at least 5 experiments/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no coffees have experiments', async () => {
    vi.mocked(coffeesApi.listCoffees).mockResolvedValue({
      items: [mockCoffeeNoExperiments],
      pagination: { page: 1, per_page: 100, total: 1, total_pages: 1 },
    });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/No experiments yet/)).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    vi.mocked(coffeesApi.listCoffees).mockRejectedValue(new Error('Network error'));
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('sorts coffees with goals before coffees without goals', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
      expect(screen.getByText('El Calagual')).toBeInTheDocument();
    });

    // Kiamaina (has goals) should appear before El Calagual (no goals) in the DOM
    const kiamainaCard = screen.getByText('Kiamaina').closest('[class*="card"]');
    const calagualCard = screen.getByText('El Calagual').closest('[class*="card"]');

    // Both should exist
    expect(kiamainaCard).toBeInTheDocument();
    expect(calagualCard).toBeInTheDocument();

    // Check DOM order: Kiamaina (with goals) should come first
    const allCards = document.querySelectorAll('[class*="rounded-xl"]');
    const kiamainaIndex = Array.from(allCards).findIndex(el => el.textContent?.includes('Kiamaina'));
    const calagualIndex = Array.from(allCards).findIndex(el => el.textContent?.includes('El Calagual'));
    expect(kiamainaIndex).toBeLessThan(calagualIndex);
  });
});
