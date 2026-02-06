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

const mockGetCoffeeGoal = vi.fn().mockResolvedValue(null);
const mockUpsertCoffeeGoal = vi.fn().mockResolvedValue({});

vi.mock('@/api/coffee-goals', () => ({
  getCoffeeGoal: (...args: unknown[]) => mockGetCoffeeGoal(...args),
  upsertCoffeeGoal: (...args: unknown[]) => mockUpsertCoffeeGoal(...args),
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
          { id: 'p-1', experiment_id: 'exp-1', pour_number: 1, water_amount: 75, pour_style: 'pulse', notes: 'existing' },
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

  describe('step error indicators', () => {
    it('marks steps with validation errors after failed submit', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <ExperimentForm
          experiment={{ ...mockExperiment, overall_notes: '' }}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // In edit mode, submit button is on every step
      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.queryAllByText(/notes must be at least 10 characters/i).length).toBeGreaterThan(0);
      });

      // Step 6 circles should have error styling (overall_notes is on step 6)
      const circles = document.querySelectorAll('.rounded-full');
      const step6Circles = Array.from(circles).filter(
        (el) => el.textContent?.trim() === '6'
      );
      expect(step6Circles.length).toBeGreaterThan(0);
      step6Circles.forEach((circle) => {
        expect(circle.className).toContain('border-destructive');
      });

      // Step 1 should NOT have error styling (coffee_id is valid)
      const step1Circles = Array.from(circles).filter(
        (el) => el.textContent?.trim() === '1'
      );
      step1Circles.forEach((circle) => {
        expect(circle.className).not.toContain('border-destructive');
      });
    });

    it('navigates to the first step with an error on failed submit', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <ExperimentForm
          experiment={{ ...mockExperiment, overall_notes: '' }}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Click submit from step 1
      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      // Should navigate to step 6 (where overall_notes error is)
      await waitFor(() => {
        expect(screen.getByText('Sensory Outcomes')).toBeInTheDocument();
      });
    });

    it('clears error indicators when form is resubmitted successfully', async () => {
      const { updateExperiment } = await import('@/api/experiments');
      (updateExperiment as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const user = userEvent.setup();
      renderWithRouter(
        <ExperimentForm
          experiment={{ ...mockExperiment, overall_notes: '' }}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // First submit fails
      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryAllByText(/notes must be at least 10 characters/i).length).toBeGreaterThan(0);
      });

      // Now on step 6, fill overall_notes with valid content
      const notesTextarea = screen.getByPlaceholderText(/how did this brew taste/i);
      await user.type(notesTextarea, 'A wonderful cup with complex flavors and sweet finish');

      // Submit again - should succeed now
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // Step error indicators on progress circles should be cleared
      await waitFor(() => {
        const circles = document.querySelectorAll('.rounded-full');
        const errorCircles = Array.from(circles).filter(
          (el) => /^\d$/.test(el.textContent?.trim() || '') && el.className.includes('border-destructive')
        );
        expect(errorCircles.length).toBe(0);
      });
    });
  });

  describe('target goals', () => {
    it('fetches coffee goals when a coffee is selected', async () => {
      mockGetCoffeeGoal.mockResolvedValue({
        id: 'goal-1',
        coffee_id: 'coffee-1',
        tds: 1.38,
        extraction_yield: 20.5,
        aroma_intensity: 7,
        overall_score: 9,
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-15T10:00:00Z',
      });

      const user = userEvent.setup();
      renderWithRouter(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select a coffee
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);
      await waitFor(() => expect(screen.getByText('Test Coffee')).toBeInTheDocument());
      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // Goals should be fetched for the selected coffee
      await waitFor(() => {
        expect(mockGetCoffeeGoal).toHaveBeenCalledWith('coffee-1');
      });
    });

    it('shows target goals on quantitative step with fetched values', async () => {
      mockGetCoffeeGoal.mockResolvedValue({
        id: 'goal-1',
        coffee_id: 'coffee-1',
        coffee_ml: 180,
        tds: 1.38,
        extraction_yield: 20.5,
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-15T10:00:00Z',
      });

      const user = userEvent.setup();
      renderWithRouter(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select coffee
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);
      await waitFor(() => expect(screen.getByText('Test Coffee')).toBeInTheDocument());
      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // Navigate to step 5 (Quantitative): Next on step 1, then Skip on steps 2-4
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Pre-Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^skip$/i }));
      await waitFor(() => expect(screen.getByText('Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^skip$/i }));
      await waitFor(() => expect(screen.getByText('Post-Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^skip$/i }));

      await waitFor(() => expect(screen.getByText('Quantitative Outcomes')).toBeInTheDocument());

      // Target goals should show the fetched values
      await waitFor(() => {
        expect(document.getElementById('goal_coffee_ml')).toHaveValue(180);
        expect(document.getElementById('goal_tds')).toHaveValue(1.38);
        expect(document.getElementById('goal_extraction_yield')).toHaveValue(20.5);
      });
    });

    it('handles no goals gracefully (empty state)', async () => {
      mockGetCoffeeGoal.mockResolvedValue(null);

      const user = userEvent.setup();
      renderWithRouter(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select coffee
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);
      await waitFor(() => expect(screen.getByText('Test Coffee')).toBeInTheDocument());
      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // Navigate to step 5 (Quantitative): Next on step 1, then Skip on steps 2-4
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Pre-Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^skip$/i }));
      await waitFor(() => expect(screen.getByText('Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^skip$/i }));
      await waitFor(() => expect(screen.getByText('Post-Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^skip$/i }));

      await waitFor(() => expect(screen.getByText('Quantitative Outcomes')).toBeInTheDocument());

      // Goal fields should be empty
      expect(document.getElementById('goal_coffee_ml')).toHaveValue(null);
      expect(document.getElementById('goal_tds')).toHaveValue(null);
    });
  });
});
