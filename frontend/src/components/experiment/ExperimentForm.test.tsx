import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ExperimentForm from './ExperimentForm';

// Mock the API functions
vi.mock('@/api/experiments', () => ({
  createExperiment: vi.fn(),
  updateExperiment: vi.fn(),
}));

vi.mock('@/api/coffees', () => ({
  listCoffees: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'coffee-1',
        roaster: 'Test Roaster',
        name: 'Test Coffee',
        roast_date: '2025-11-01',
        days_off_roast: 90,
        experiment_count: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'coffee-2',
        roaster: 'Another Roaster',
        name: 'Another Coffee',
        experiment_count: 2,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ],
    pagination: { page: 1, per_page: 5, total: 2, total_pages: 1 },
  }),
  getCoffee: vi.fn().mockResolvedValue({
    id: 'coffee-1',
    roaster: 'Test Roaster',
    name: 'Test Coffee',
    roast_date: '2025-11-01',
    days_off_roast: 90,
    experiment_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }),
  getReference: vi.fn().mockResolvedValue({
    experiment: null,
    goals: null,
  }),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

vi.mock('@/api/defaults', () => ({
  getDefaults: vi.fn().mockResolvedValue({
    coffee_weight: '15',
    ratio: '15',
    grind_size: '3.5',
    water_temperature: '93',
  }),
}));

vi.mock('@/api/filter-papers', () => ({
  listFilterPapers: vi.fn().mockResolvedValue({
    items: [
      { id: 'filter-1', name: 'Abaca', brand: 'Cafec' },
      { id: 'filter-2', name: 'Origami', brand: 'Origami' },
    ],
    pagination: { page: 1, per_page: 100, total: 2, total_pages: 1 },
  }),
}));

vi.mock('@/api/mineral-profiles', () => ({
  listMineralProfiles: vi.fn().mockResolvedValue({
    items: [
      { id: 'mineral-1', name: 'Catalyst', brand: 'Nucleus' },
      { id: 'mineral-2', name: 'Hendon', brand: 'Barista Hustle' },
    ],
    pagination: { page: 1, per_page: 100, total: 2, total_pages: 1 },
  }),
}));

const mockOnSuccess = vi.fn();
const mockOnCancel = vi.fn();

const mockExperiment = {
  id: 'exp-1',
  user_id: 'user-1',
  coffee_id: 'coffee-1',
  brew_date: '2026-01-15T10:30:00Z',
  coffee_weight: 15,
  water_weight: 225,
  ratio: 15,
  grind_size: 3.5,
  water_temperature: 93,
  overall_notes: 'A great cup with bright acidity',
  overall_score: 8,
  created_at: '2026-01-15T10:35:00Z',
  updated_at: '2026-01-15T10:35:00Z',
  coffee: {
    id: 'coffee-1',
    roaster: 'Test Roaster',
    name: 'Test Coffee',
    roast_date: '2025-11-01',
  },
  pours: [],
};

describe('ExperimentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders new experiment form when no experiment is provided', async () => {
      renderWithRouter(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByText('New Experiment')).toBeInTheDocument();
      // Step 1 shows the coffee selector label
      expect(screen.getByText('Coffee *')).toBeInTheDocument();
    });

    it('renders edit form when experiment is provided', async () => {
      renderWithRouter(
        <ExperimentForm
          experiment={mockExperiment}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Edit Experiment')).toBeInTheDocument();
    });

    it('renders wizard progress indicator', () => {
      renderWithRouter(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Should show progress elements
      const stepTexts = screen.getAllByText(/Step 1 of 7/);
      expect(stepTexts.length).toBeGreaterThan(0);
    });
  });

  describe('coffee selector (step 1)', () => {
    it('shows recent coffees when coffee selector is opened', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Recent')).toBeInTheDocument();
        expect(screen.getByText('Test Coffee')).toBeInTheDocument();
      });
    });

    it('allows selecting a coffee', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Test Coffee')).toBeInTheDocument();
      });

      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // After selection, the selector should show the coffee name
      await waitFor(() => {
        expect(screen.queryByText('Select a coffee...')).not.toBeInTheDocument();
      });
    });

    it('shows validation error when trying to proceed without selecting coffee', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Try to click Next without selecting coffee
      const nextButton = screen.getByRole('button', { name: /^next$/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/coffee is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('cancel action', () => {
    it('calls onCancel when back button is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // The back button in header should call onCancel
      const backButton = screen.getByRole('button', { name: /^back$/i });
      await user.click(backButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});
