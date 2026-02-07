import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CoffeesPage from './CoffeesPage';
import * as coffeesApi from '@/api/coffees';

// Mock the API modules
vi.mock('@/api/coffees', () => ({
  listCoffees: vi.fn(),
  archiveCoffee: vi.fn(),
  unarchiveCoffee: vi.fn(),
  deleteCoffee: vi.fn(),
  getCoffeeSuggestions: vi.fn(),
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

const mockCoffee: coffeesApi.Coffee = {
  id: 'coffee-123',
  roaster: 'Cata Coffee',
  name: 'Kiamaina',
  country: 'Kenya',
  farm: 'Nyeri',
  process: 'Washed',
  roast_level: 'Light',
  tasting_notes: 'Apricot Nectar, Lemon Sorbet',
  roast_date: '2025-11-19',
  days_off_roast: 61,
  brew_count: 8,
  created_at: '2025-11-22T15:00:00Z',
  updated_at: '2025-11-22T15:00:00Z',
};

const mockListResponse: coffeesApi.ListCoffeesResponse = {
  items: [mockCoffee],
  pagination: {
    page: 1,
    per_page: 20,
    total: 1,
    total_pages: 1,
  },
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('CoffeesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(coffeesApi.listCoffees).mockResolvedValue(mockListResponse);
  });

  it('renders the page title', async () => {
    renderWithRouter(<CoffeesPage />);

    expect(screen.getByRole('heading', { name: 'Coffees' })).toBeInTheDocument();
  });

  it('fetches and displays coffees on load', async () => {
    renderWithRouter(<CoffeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    expect(screen.getByText('Cata Coffee')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    vi.mocked(coffeesApi.listCoffees).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter(<CoffeesPage />);

    // Check for the loading spinner (Loader2 icon has animate-spin class)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays empty state when no coffees exist', async () => {
    vi.mocked(coffeesApi.listCoffees).mockResolvedValue({
      items: [],
      pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
    });

    renderWithRouter(<CoffeesPage />);

    await waitFor(() => {
      expect(screen.getByText('No coffees in your library yet')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /add your first coffee/i })).toBeInTheDocument();
  });

  it('shows search empty state when search returns no results', async () => {
    const user = userEvent.setup();
    vi.mocked(coffeesApi.listCoffees).mockResolvedValue(mockListResponse);

    renderWithRouter(<CoffeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    // Update mock to return empty for search
    vi.mocked(coffeesApi.listCoffees).mockResolvedValue({
      items: [],
      pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
    });

    // Type in search
    const searchInput = screen.getByPlaceholderText('Search coffees...');
    await user.type(searchInput, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText('No coffees match your search')).toBeInTheDocument();
    });
  });

  it('navigates to coffee detail when clicking a card', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CoffeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    // Click on the card (coffee name)
    await user.click(screen.getByText('Kiamaina'));

    expect(mockNavigate).toHaveBeenCalledWith('/coffees/coffee-123');
  });

  it('opens add coffee form when clicking add button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CoffeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add coffee/i });
    await user.click(addButton);

    // Should show the form - verify form inputs are present
    await waitFor(() => {
      expect(screen.getByLabelText(/roaster/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
  });

  it('displays pagination when there are multiple pages', async () => {
    vi.mocked(coffeesApi.listCoffees).mockResolvedValue({
      items: [mockCoffee],
      pagination: { page: 1, per_page: 20, total: 50, total_pages: 3 },
    });

    renderWithRouter(<CoffeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 20 of 50 coffees')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('fetches coffees with correct default parameters (no sort)', async () => {
    renderWithRouter(<CoffeesPage />);

    await waitFor(() => {
      expect(coffeesApi.listCoffees).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          per_page: 20,
        })
      );
    });

    // Sort should not be sent (backend hardcodes -created_at)
    const callArgs = vi.mocked(coffeesApi.listCoffees).mock.calls[0][0];
    expect(callArgs).not.toHaveProperty('sort');
  });

  it('sends archived_only when clicking show archived button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CoffeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    // Click show archived
    const archivedButton = screen.getByRole('button', { name: /show archived/i });
    await user.click(archivedButton);

    await waitFor(() => {
      expect(coffeesApi.listCoffees).toHaveBeenCalledWith(
        expect.objectContaining({
          archived_only: true,
        })
      );
    });
  });

  it('displays coffee cards with name and roaster', async () => {
    renderWithRouter(<CoffeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });

    // Card shows coffee name and roaster
    expect(screen.getByText('Cata Coffee')).toBeInTheDocument();
    // Card shows "No brews yet" when no best_brew
    expect(screen.getByText('No brews yet')).toBeInTheDocument();
    // Card shows "New Brew" action button
    expect(screen.getByRole('button', { name: /new brew/i })).toBeInTheDocument();
  });

  it('displays error state when API fails', async () => {
    vi.mocked(coffeesApi.listCoffees).mockRejectedValue(new Error('API Error'));

    renderWithRouter(<CoffeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load coffees')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
