import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CoffeeDrillDown from './CoffeeDrillDown';
import * as coffeesApi from '@/api/coffees';
import * as brewsApi from '@/api/brews';
import * as sessionsApi from '@/api/sessions';

vi.mock('@/api/coffees', () => ({
  getCoffee: vi.fn(),
  getGoalTrends: vi.fn(),
  setBestBrew: vi.fn(),
}));

vi.mock('@/api/brews', () => ({
  listBrews: vi.fn(),
  analyzeBrewsWithFilters: vi.fn(),
  analyzeBrewsDetail: vi.fn(),
  getBrew: vi.fn(),
  deleteBrew: vi.fn(),
  copyBrew: vi.fn(),
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
  RadarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="radar-chart">{children}</div>,
  Radar: ({ name, dataKey }: { name: string; dataKey: string }) => <div data-testid={`radar-${dataKey}`} data-name={name} />,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  Legend: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  Cell: () => null,
}));

const mockCoffee: coffeesApi.Coffee = {
  id: 'coffee-1',
  roaster: 'Cata Coffee',
  name: 'Kiamaina',
  brew_count: 8,
  last_brewed: '2026-01-20T10:30:00Z',
  days_off_roast: 62,
  best_brew_id: 'exp-1',
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

const mockBrews: brewsApi.Brew[] = [
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
    brew_count: 3,
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-01-22T14:30:00Z',
  },
];

const mockAnalyzeResult: brewsApi.AnalyzeResponse = {
  correlations: {
    water_temperature: {
      overall_score: { r: 0.42, n: 8, p: 0.01, interpretation: 'weak_positive' },
    },
  },
  inputs: ['water_temperature'],
  outcomes: ['overall_score'],
  brew_count: 8,
  brew_ids: ['exp-1', 'exp-2'],
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
    Element.prototype.hasPointerCapture = vi.fn();
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(coffeesApi.getCoffee).mockResolvedValue(mockCoffee);
    vi.mocked(coffeesApi.getGoalTrends).mockResolvedValue(mockTrends);
    vi.mocked(brewsApi.listBrews).mockResolvedValue({
      items: mockBrews,
      pagination: { page: 1, per_page: 50, total: 2, total_pages: 1 },
    });
    vi.mocked(sessionsApi.listSessions).mockResolvedValue({
      items: mockSessions,
      pagination: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });
    vi.mocked(brewsApi.analyzeBrewsWithFilters).mockResolvedValue(mockAnalyzeResult);
  });

  it('renders coffee name and roaster in header', async () => {
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
      expect(screen.getByText(/Cata Coffee/)).toBeInTheDocument();
    });
  });

  it('shows brew count and days off roast', async () => {
    renderDrillDown();

    await waitFor(() => {
      // Header subtitle contains both brew count and days off roast
      const subtitle = screen.getByText(/62 days off roast/);
      expect(subtitle).toBeInTheDocument();
      expect(subtitle.textContent).toContain('8 brews');
    });
  });

  it('fetches data with correct coffee ID', async () => {
    renderDrillDown();

    await waitFor(() => {
      expect(coffeesApi.getCoffee).toHaveBeenCalledWith('coffee-1');
      expect(coffeesApi.getGoalTrends).toHaveBeenCalledWith('coffee-1');
      expect(brewsApi.listBrews).toHaveBeenCalledWith(
        expect.objectContaining({ coffee_id: 'coffee-1' })
      );
      expect(sessionsApi.listSessions).toHaveBeenCalledWith('coffee-1');
    });
  });

  it('fetches per-coffee correlations', async () => {
    renderDrillDown();

    await waitFor(() => {
      expect(brewsApi.analyzeBrewsWithFilters).toHaveBeenCalledWith({
        coffee_ids: ['coffee-1'],
      });
    });
  });

  it('renders sensory profile section heading', async () => {
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText('Sensory Profile')).toBeInTheDocument();
    });
  });

  it('renders correlations section', async () => {
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText('Correlations')).toBeInTheDocument();
      expect(screen.getByText(/Analyzing 8 brews/)).toBeInTheDocument();
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

  it('renders brew history table with brews', async () => {
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

  it('shows message when not enough brews for correlations', async () => {
    vi.mocked(brewsApi.analyzeBrewsWithFilters).mockRejectedValue(
      new Error('minimum 5 brews required')
    );
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText(/Need at least 5 brews/)).toBeInTheDocument();
    });
  });

  it('shows sensory fallback when no trends and no sensory data', async () => {
    vi.mocked(coffeesApi.getGoalTrends).mockRejectedValue(new Error('No goals'));
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText(/No sensory data or goals set/)).toBeInTheDocument();
    });
  });

  it('derives reference brew from best_brew_id', async () => {
    const brewsWithSensory = [
      { ...mockBrews[0], aroma_intensity: 7, sweetness_intensity: 8 },
      { ...mockBrews[1] },
    ];
    vi.mocked(brewsApi.listBrews).mockResolvedValue({
      items: brewsWithSensory,
      pagination: { page: 1, per_page: 50, total: 2, total_pages: 1 },
    });
    // mockCoffee has best_brew_id: 'exp-1', so the reference brew should be exp-1
    renderDrillDown();

    await waitFor(() => {
      // The radar chart should render with reference data from exp-1
      expect(screen.getByTestId('radar-reference')).toBeInTheDocument();
    });
  });

  it('shows radar target layer when trends have sensory goals', async () => {
    const trendsWithSensory: coffeesApi.GoalTrendResponse = {
      coffee_id: 'coffee-1',
      metrics: {
        aroma_intensity: { target: 8, values: [{ brew_date: '2026-01-20', value: 7 }], target_met: false },
        sweetness_intensity: { target: 7, values: [{ brew_date: '2026-01-20', value: 6 }], target_met: false },
      },
    };
    vi.mocked(coffeesApi.getGoalTrends).mockResolvedValue(trendsWithSensory);
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByTestId('radar-target')).toBeInTheDocument();
    });
  });

  it('renders checkbox column in brew history table', async () => {
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText('Brew History')).toBeInTheDocument();
    });

    // Each brew row should have a checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(mockBrews.length);
  });

  it('selecting 2 brews shows Compare Brews section with chart', async () => {
    const user = userEvent.setup();
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText('Brew History')).toBeInTheDocument();
    });

    // Initially shows fallback text
    expect(screen.getByText(/Select 2 or more brews from brew history to compare/)).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();

    // Select 2 brews
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    // Compare Brews section should now show charts
    await waitFor(() => {
      expect(screen.queryByText(/Select 2 or more brews from brew history to compare/)).not.toBeInTheDocument();
      expect(screen.getAllByTestId('bar-chart').length).toBeGreaterThan(0);
    });
  });

  it('shows fallback when fewer than 2 brews selected', async () => {
    const user = userEvent.setup();
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText('Brew History')).toBeInTheDocument();
    });

    // Select only 1 brew
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    expect(screen.getByText(/Select 2 or more brews from brew history to compare/)).toBeInTheDocument();
  });

  it('disables checkbox at 6 selections for unchecked brews', async () => {
    // Create 7 brews so we can test the 6-max limit
    const sevenBrews = Array.from({ length: 7 }, (_, i) => ({
      ...mockBrews[0],
      id: `exp-${i + 1}`,
      brew_date: `2026-01-${String(20 - i).padStart(2, '0')}T10:30:00Z`,
      overall_score: 8 - i,
    }));
    vi.mocked(brewsApi.listBrews).mockResolvedValue({
      items: sevenBrews,
      pagination: { page: 1, per_page: 50, total: 7, total_pages: 1 },
    });
    const user = userEvent.setup();
    renderDrillDown();

    await waitFor(() => {
      expect(screen.getByText('Brew History')).toBeInTheDocument();
    });

    // Select 6 brews
    const checkboxes = screen.getAllByRole('checkbox');
    for (let i = 0; i < 6; i++) {
      await user.click(checkboxes[i]);
    }

    // The 7th checkbox should be disabled
    await waitFor(() => {
      expect(checkboxes[6]).toBeDisabled();
    });
  });
});
