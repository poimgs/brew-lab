import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import BrewsPage from './BrewsPage';
import * as brewsApi from '@/api/brews';
import * as coffeesApi from '@/api/coffees';

// Mock the API modules
vi.mock('@/api/brews', () => ({
  listBrews: vi.fn(),
  deleteBrew: vi.fn(),
  copyBrew: vi.fn(),
  compareBrews: vi.fn(),
  analyzeBrews: vi.fn(),
  exportBrews: vi.fn(),
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

const mockBrew: brewsApi.Brew = {
  id: 'exp-123',
  user_id: 'user-456',
  coffee_id: 'coffee-789',
  brew_date: '2026-01-15T10:30:00Z',
  coffee_weight: 15.0,
  water_weight: 225.0,
  ratio: 15.0,
  is_draft: false,
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

const mockListResponse: brewsApi.ListBrewsResponse = {
  items: [mockBrew],
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
      brew_count: 5,
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

describe('BrewsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(brewsApi.listBrews).mockResolvedValue(mockListResponse);
    vi.mocked(coffeesApi.listCoffees).mockResolvedValue(mockCoffeesResponse);
  });

  it('renders the page title and new brew button', async () => {
    renderWithRouter(<BrewsPage />);

    expect(screen.getByRole('heading', { name: 'Brews' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new brew/i })).toBeInTheDocument();
  });

  it('fetches and displays brews on load', async () => {
    renderWithRouter(<BrewsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    expect(screen.getByText('Cata Coffee')).toBeInTheDocument();
    expect(screen.getByText('7/10')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    vi.mocked(brewsApi.listBrews).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter(<BrewsPage />);

    // Check for the loading spinner (Loader2 icon has animate-spin class)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays empty state when no brews', async () => {
    vi.mocked(brewsApi.listBrews).mockResolvedValue({
      items: [],
      pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
    });

    renderWithRouter(<BrewsPage />);

    await waitFor(() => {
      expect(screen.getByText('No brews yet')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /log your first brew/i })).toBeInTheDocument();
  });

  it('navigates to new brew page when clicking new brew button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BrewsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    const newButton = screen.getByRole('button', { name: /new brew/i });
    await user.click(newButton);

    expect(mockNavigate).toHaveBeenCalledWith('/brews/new');
  });

  it('toggles compare mode when clicking the toggle', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BrewsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    const compareModeButton = screen.getByRole('button', { name: /compare mode: off/i });
    await user.click(compareModeButton);

    expect(screen.getByRole('button', { name: /compare mode: on/i })).toBeInTheDocument();
  });

  it('shows filter panel when filters button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BrewsPage />);

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
    renderWithRouter(<BrewsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    const thisWeekButton = screen.getByRole('button', { name: 'This week' });
    await user.click(thisWeekButton);

    await waitFor(() => {
      expect(brewsApi.listBrews).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: expect.any(String),
        })
      );
    });
  });

  it('displays pagination when there are multiple pages', async () => {
    vi.mocked(brewsApi.listBrews).mockResolvedValue({
      items: [mockBrew],
      pagination: { page: 1, per_page: 20, total: 50, total_pages: 3 },
    });

    renderWithRouter(<BrewsPage />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 20 of 50 brews')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('shows selection count when brews are selected in compare mode', async () => {
    const user = userEvent.setup();

    // Multiple brews for comparison
    vi.mocked(brewsApi.listBrews).mockResolvedValue({
      items: [
        mockBrew,
        {
          ...mockBrew,
          id: 'exp-456',
          brew_date: '2026-01-16T10:30:00Z',
          coffee: { ...mockBrew.coffee!, name: 'El Calagual' },
        },
      ],
      pagination: { page: 1, per_page: 20, total: 2, total_pages: 1 },
    });

    renderWithRouter(<BrewsPage />);

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
    vi.mocked(brewsApi.deleteBrew).mockResolvedValue();

    renderWithRouter(<BrewsPage />);

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
    expect(screen.getByText('Delete Brew?')).toBeInTheDocument();

    // Click confirm delete
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(brewsApi.deleteBrew).toHaveBeenCalledWith('exp-123');
    });
  });

  it('navigates to brew detail when row is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<BrewsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    // Click on the row (coffee name)
    await user.click(screen.getByText('Kiamaina'));

    expect(mockNavigate).toHaveBeenCalledWith('/brews/exp-123');
  });

  it('copies brew when copy as template is clicked', async () => {
    const user = userEvent.setup();
    const copiedBrew = { ...mockBrew, id: 'exp-new' };
    vi.mocked(brewsApi.copyBrew).mockResolvedValue(copiedBrew);

    renderWithRouter(<BrewsPage />);

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
      expect(brewsApi.copyBrew).toHaveBeenCalledWith('exp-123');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/brews/exp-new');
  });

  it('shows Draft badge for draft brews', async () => {
    const draftBrew = {
      ...mockBrew,
      id: 'exp-draft',
      is_draft: true,
      overall_notes: 'Work in progress',
    };

    vi.mocked(brewsApi.listBrews).mockResolvedValue({
      items: [draftBrew],
      pagination: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });

    renderWithRouter(<BrewsPage />);

    await waitFor(() => {
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  it('does not show Draft badge for non-draft brews', async () => {
    renderWithRouter(<BrewsPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });
});
