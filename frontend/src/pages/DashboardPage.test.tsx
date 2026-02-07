import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import * as coffeesApi from '@/api/coffees';
import * as brewsApi from '@/api/brews';

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

vi.mock('@/api/brews', () => ({
  analyzeBrewsWithFilters: vi.fn(),
  analyzeBrewsDetail: vi.fn(),
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
  brew_count: 8,
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
  brew_count: 5,
  last_brewed: '2026-01-18T10:30:00Z',
  created_at: '2025-12-01T15:00:00Z',
  updated_at: '2025-12-01T15:00:00Z',
};

const mockCoffeeNoBrews: coffeesApi.Coffee = {
  id: 'coffee-3',
  roaster: 'Sweet Bloom',
  name: 'Ethiopia Natural',
  brew_count: 0,
  created_at: '2026-01-01T15:00:00Z',
  updated_at: '2026-01-01T15:00:00Z',
};

const mockAnalyzeResult: brewsApi.AnalyzeResponse = {
  correlations: {
    water_temperature: {
      overall_score: { r: 0.42, n: 12, p: 0.004, interpretation: 'weak_positive' },
    },
  },
  inputs: ['water_temperature'],
  outcomes: ['overall_score'],
  brew_count: 13,
  brew_ids: ['exp-1', 'exp-2'],
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
      items: [mockCoffeeWithGoals, mockCoffeeNoGoals, mockCoffeeNoBrews],
      pagination: { page: 1, per_page: 100, total: 3, total_pages: 1 },
    });
    vi.mocked(brewsApi.analyzeBrewsWithFilters).mockResolvedValue(mockAnalyzeResult);
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
      expect(brewsApi.analyzeBrewsWithFilters).toHaveBeenCalledWith({});
    });
  });

  it('renders goal progress cards for coffees with brews', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
      expect(screen.getByText('El Calagual')).toBeInTheDocument();
    });

    // Coffee with no brews should NOT be shown
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
      expect(screen.getByText(/Analyzing 13 brews/)).toBeInTheDocument();
    });
  });

  it('shows message when not enough brews for correlations', async () => {
    vi.mocked(brewsApi.analyzeBrewsWithFilters).mockRejectedValue({
      response: { data: { message: 'not enough valid brews found (minimum 5 required)' } },
    });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Need at least 5 brews/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no coffees have brews', async () => {
    vi.mocked(coffeesApi.listCoffees).mockResolvedValue({
      items: [mockCoffeeNoBrews],
      pagination: { page: 1, per_page: 100, total: 1, total_pages: 1 },
    });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/No brews yet/)).toBeInTheDocument();
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

  it('renders Filters button', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Both desktop and mobile filter buttons render with text "Filters"
    const filterButtons = screen.getAllByText('Filters');
    expect(filterButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows filter panel when desktop Filters button is clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Click the first "Filters" button (desktop)
    const filterButtons = screen.getAllByRole('button', { name: /Filters/ });
    await user.click(filterButtons[0]);

    // Filter panel should show coffee checkboxes, Clear All, and Apply Filters
    await waitFor(() => {
      expect(screen.getByText('Apply Filters')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
  });

  it('filters goal progress cards by selected coffee IDs (client-side)', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
      expect(screen.getByText('El Calagual')).toBeInTheDocument();
    });

    // Open filters
    const filterButtons = screen.getAllByRole('button', { name: /Filters/ });
    await user.click(filterButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Apply Filters')).toBeInTheDocument();
    });

    // Select only Kiamaina checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // Kiamaina

    // Apply filters
    await user.click(screen.getByText('Apply Filters'));

    // Kiamaina should still be visible, El Calagual should be filtered out
    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
      expect(screen.queryByText('El Calagual')).not.toBeInTheDocument();
    });
  });

  it('calls analyzeBrewsWithFilters with filter values on Apply', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Open filters
    const filterButtons = screen.getAllByRole('button', { name: /Filters/ });
    await user.click(filterButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Apply Filters')).toBeInTheDocument();
    });

    // Select a coffee
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // Kiamaina (coffee-1)

    // Clear the initial call count
    vi.mocked(brewsApi.analyzeBrewsWithFilters).mockClear();

    // Apply
    await user.click(screen.getByText('Apply Filters'));

    await waitFor(() => {
      expect(brewsApi.analyzeBrewsWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ coffee_ids: ['coffee-1'] })
      );
    });
  });

  it('clear filters resets and shows all coffees', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    // Open filters
    const filterButtons = screen.getAllByRole('button', { name: /Filters/ });
    await user.click(filterButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Apply Filters')).toBeInTheDocument();
    });

    // Select only Kiamaina
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(screen.getByText('Apply Filters'));

    // Confirm filter is active
    await waitFor(() => {
      expect(screen.queryByText('El Calagual')).not.toBeInTheDocument();
    });

    // Clear filters
    await user.click(screen.getByText('Clear All'));

    // Both coffees should reappear
    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
      expect(screen.getByText('El Calagual')).toBeInTheDocument();
    });
  });
});
