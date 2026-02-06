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

const mockGetDefaults = vi.fn().mockResolvedValue({
  coffee_weight: '15',
  ratio: '15',
  grind_size: '3.5',
  water_temperature: '93',
  pour_defaults: JSON.stringify([
    { water_amount: 90, pour_style: 'circular', notes: '' },
    { water_amount: 90, pour_style: 'center' },
  ]),
});

vi.mock('@/api/defaults', () => ({
  getDefaults: (...args: unknown[]) => mockGetDefaults(...args),
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
  is_draft: false,
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

  describe('save draft', () => {
    it('shows Save Draft button in create mode', () => {
      renderWithRouter(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    });

    it('does not show Save Draft button in edit mode', () => {
      renderWithRouter(
        <ExperimentForm
          experiment={mockExperiment}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
    });

    it('shows error when saving draft without selecting coffee', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
      await user.click(saveDraftButton);

      await waitFor(() => {
        expect(screen.getByText(/please select a coffee before saving a draft/i)).toBeInTheDocument();
      });
    });
  });

  describe('pour defaults', () => {
    it('applies pour defaults when navigating to brew step in create mode', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select coffee first (step 1)
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);
      await waitFor(() => expect(screen.getByText('Test Coffee')).toBeInTheDocument());
      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // Navigate to step 2 (Pre-Brew)
      const nextButton = screen.getByRole('button', { name: /^next$/i });
      await user.click(nextButton);
      await waitFor(() => expect(screen.getByText('Pre-Brew Variables')).toBeInTheDocument());

      // Navigate to step 3 (Brew)
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Brew Variables')).toBeInTheDocument());

      // Pour defaults should be applied - no "no pours recorded" message
      expect(screen.queryByText(/no pours recorded yet/i)).not.toBeInTheDocument();

      // Should see 2 pour rows (from defaults)
      const waterInputs = screen.getAllByPlaceholderText('Water (g)');
      expect(waterInputs).toHaveLength(2);
      expect(waterInputs[0]).toHaveValue(90);
      expect(waterInputs[1]).toHaveValue(90);
    });

    it('does not apply pour defaults in edit mode', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <ExperimentForm
          experiment={mockExperiment}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // In edit mode, navigate to Brew step by clicking step 3 in the progress bar
      // All steps are clickable in edit mode
      await waitFor(() => expect(screen.getByText('Edit Experiment')).toBeInTheDocument());

      // Click step 3 button (the button containing "3" text)
      const stepButtons = screen.getAllByRole('button');
      const step3Button = stepButtons.find((btn) => btn.textContent?.includes('3'));
      expect(step3Button).toBeTruthy();
      await user.click(step3Button!);

      await waitFor(() => expect(screen.getByText('Brew Variables')).toBeInTheDocument());

      // Pours should be empty (from the experiment, not defaults)
      expect(screen.getByText(/no pours recorded yet/i)).toBeInTheDocument();
    });

    it('does not apply pour defaults when experiment has existing pours', async () => {
      const experimentWithPours = {
        ...mockExperiment,
        pours: [
          { id: 'p-1', pour_number: 1, water_amount: 75, pour_style: 'pulse', notes: 'existing' },
        ],
      };

      const user = userEvent.setup();
      renderWithRouter(
        <ExperimentForm
          experiment={experimentWithPours}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Navigate to Brew step via step 3 button (edit mode)
      await waitFor(() => expect(screen.getByText('Edit Experiment')).toBeInTheDocument());

      const stepButtons = screen.getAllByRole('button');
      const step3Button = stepButtons.find((btn) => btn.textContent?.includes('3'));
      await user.click(step3Button!);

      await waitFor(() => expect(screen.getByText('Brew Variables')).toBeInTheDocument());

      // Should show the existing pour, not the defaults
      const waterInputs = screen.getAllByPlaceholderText('Water (g)');
      expect(waterInputs).toHaveLength(1);
      expect(waterInputs[0]).toHaveValue(75);
    });

    it('does not apply pour defaults when no pour_defaults in user settings', async () => {
      mockGetDefaults.mockResolvedValueOnce({
        coffee_weight: '15',
        ratio: '15',
      });

      const user = userEvent.setup();
      renderWithRouter(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select coffee
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);
      await waitFor(() => expect(screen.getByText('Test Coffee')).toBeInTheDocument());
      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // Navigate to brew step
      const nextButton = screen.getByRole('button', { name: /^next$/i });
      await user.click(nextButton);
      await waitFor(() => expect(screen.getByText('Pre-Brew Variables')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Brew Variables')).toBeInTheDocument());

      // No pour defaults - should show empty state
      expect(screen.getByText(/no pours recorded yet/i)).toBeInTheDocument();
    });
  });
});
