import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ExperimentsPage from './ExperimentsPage';
import * as experimentsApi from '@/api/experiments';
import * as coffeesApi from '@/api/coffees';

// Mock the API modules
vi.mock('@/api/experiments', () => ({
  listExperiments: vi.fn(),
  deleteExperiment: vi.fn(),
  copyExperiment: vi.fn(),
  compareExperiments: vi.fn(),
  analyzeExperiments: vi.fn(),
  exportExperiments: vi.fn(),
}));

vi.mock('@/api/coffees', () => ({
  listCoffees: vi.fn(),
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockExperiment: experimentsApi.Experiment = {
  id: 'exp-123',
  user_id: 'user-456',
  coffee_id: 'coffee-789',
  brew_date: '2026-01-15T10:30:00Z',
  coffee_weight: 15.0,
  water_weight: 225.0,
  ratio: 15.0,
  overall_notes: 'Bright acidity with lemon notes',
  overall_score: 7,
  days_off_roast: 57,
  created_at: '2026-01-15T10:35:00Z',
  updated_at: '2026-01-15T10:35:00Z',
  coffee: {
    id: 'coffee-789',
    roaster: 'Cata Coffee',
    name: 'Kiamaina',
    roast_date: '2025-11-19',
  },
};

const mockListResponse: experimentsApi.ListExperimentsResponse = {
  items: [mockExperiment],
  pagination: {
    page: 1,
    per_page: 20,
    total: 1,
    total_pages: 1,
  },
};

const mockCoffeesResponse: coffeesApi.ListCoffeesResponse = {
  items: [
    {
      id: 'coffee-789',
      roaster: 'Cata Coffee',
      name: 'Kiamaina',
      experiment_count: 5,
      created_at: '2025-11-01T00:00:00Z',
      updated_at: '2025-11-01T00:00:00Z',
    },
  ],
  pagination: {
    page: 1,
    per_page: 100,
    total: 1,
    total_pages: 1,
  },
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('ExperimentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(experimentsApi.listExperiments).mockResolvedValue(mockListResponse);
    vi.mocked(coffeesApi.listCoffees).mockResolvedValue(mockCoffeesResponse);
  });

  it('renders the page title and new experiment button', async () => {
    renderWithRouter(<ExperimentsPage />);

    expect(screen.getByRole('heading', { name: 'Experiments' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new experiment/i })).toBeInTheDocument();
  });

  it('fetches and displays experiments on load', async () => {
    renderWithRouter(<ExperimentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    expect(screen.getByText('Cata Coffee')).toBeInTheDocument();
    expect(screen.getByText('7/10')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    vi.mocked(experimentsApi.listExperiments).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter(<ExperimentsPage />);

    // Check for the loading spinner (Loader2 icon has animate-spin class)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays empty state when no experiments', async () => {
    vi.mocked(experimentsApi.listExperiments).mockResolvedValue({
      items: [],
      pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
    });

    renderWithRouter(<ExperimentsPage />);

    await waitFor(() => {
      expect(screen.getByText('No experiments yet')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /log your first experiment/i })).toBeInTheDocument();
  });

  it('navigates to new experiment page when clicking new experiment button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExperimentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    const newButton = screen.getByRole('button', { name: /new experiment/i });
    await user.click(newButton);

    expect(mockNavigate).toHaveBeenCalledWith('/experiments/new');
  });

  it('toggles compare mode when clicking the toggle', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExperimentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    const compareModeButton = screen.getByRole('button', { name: /compare mode: off/i });
    await user.click(compareModeButton);

    expect(screen.getByRole('button', { name: /compare mode: on/i })).toBeInTheDocument();
  });

  it('shows filter panel when filters button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExperimentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    const filtersButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filtersButton);

    // Check for filter labels (using getAllByText since "Coffee" may appear multiple times)
    expect(screen.getAllByText('Coffee').length).toBeGreaterThan(0);
    expect(screen.getByText('Score Range')).toBeInTheDocument();
    expect(screen.getByText('Date Range')).toBeInTheDocument();
  });

  it('applies quick filter for this week', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExperimentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    const thisWeekButton = screen.getByRole('button', { name: 'This week' });
    await user.click(thisWeekButton);

    await waitFor(() => {
      expect(experimentsApi.listExperiments).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: expect.any(String),
        })
      );
    });
  });

  it('displays pagination when there are multiple pages', async () => {
    vi.mocked(experimentsApi.listExperiments).mockResolvedValue({
      items: [mockExperiment],
      pagination: { page: 1, per_page: 20, total: 50, total_pages: 3 },
    });

    renderWithRouter(<ExperimentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 20 of 50 experiments')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('shows selection count when experiments are selected in compare mode', async () => {
    const user = userEvent.setup();

    // Multiple experiments for comparison
    vi.mocked(experimentsApi.listExperiments).mockResolvedValue({
      items: [
        mockExperiment,
        {
          ...mockExperiment,
          id: 'exp-456',
          brew_date: '2026-01-16T10:30:00Z',
          coffee: { ...mockExperiment.coffee!, name: 'El Calagual' },
        },
      ],
      pagination: { page: 1, per_page: 20, total: 2, total_pages: 1 },
    });

    renderWithRouter(<ExperimentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    // Enable compare mode
    const compareModeButton = screen.getByRole('button', { name: /compare mode: off/i });
    await user.click(compareModeButton);

    // Wait for compare mode to be enabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /compare mode: on/i })).toBeInTheDocument();
    });

    // Click on the first checkbox (there should be checkboxes now)
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    await user.click(checkboxes[1]); // Skip the "select all" checkbox at index 0

    await waitFor(() => {
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });
  });

  it('calls delete API when delete is confirmed', async () => {
    const user = userEvent.setup();
    vi.mocked(experimentsApi.deleteExperiment).mockResolvedValue();

    renderWithRouter(<ExperimentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    // Open the dropdown menu
    const menuButton = screen.getByRole('button', { name: /open menu/i });
    await user.click(menuButton);

    // Click delete
    const deleteButton = screen.getByRole('menuitem', { name: /delete/i });
    await user.click(deleteButton);

    // Confirm delete dialog should appear
    expect(screen.getByText('Delete Experiment?')).toBeInTheDocument();

    // Click confirm delete
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(experimentsApi.deleteExperiment).toHaveBeenCalledWith('exp-123');
    });
  });

  it('navigates to experiment detail when row is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExperimentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    // Click on the row (coffee name)
    await user.click(screen.getByText('Kiamaina'));

    expect(mockNavigate).toHaveBeenCalledWith('/experiments/exp-123');
  });

  it('copies experiment when copy as template is clicked', async () => {
    const user = userEvent.setup();
    const copiedExperiment = { ...mockExperiment, id: 'exp-new' };
    vi.mocked(experimentsApi.copyExperiment).mockResolvedValue(copiedExperiment);

    renderWithRouter(<ExperimentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    // Open the dropdown menu
    const menuButton = screen.getByRole('button', { name: /open menu/i });
    await user.click(menuButton);

    // Click copy as template
    const copyButton = screen.getByRole('menuitem', { name: /copy as template/i });
    await user.click(copyButton);

    await waitFor(() => {
      expect(experimentsApi.copyExperiment).toHaveBeenCalledWith('exp-123');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/experiments/exp-new');
  });
});
