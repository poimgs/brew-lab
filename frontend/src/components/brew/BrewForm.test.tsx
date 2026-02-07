import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import BrewForm from './BrewForm';

// Mock the API functions
vi.mock('@/api/brews', () => ({
  createBrew: vi.fn(),
  updateBrew: vi.fn(),
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
        brew_count: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'coffee-2',
        roaster: 'Another Roaster',
        name: 'Another Coffee',
        brew_count: 2,
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
    brew_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }),
  getReference: vi.fn().mockResolvedValue({
    brew: null,
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

const mockBrew = {
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

describe('BrewForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders new brew form when no brew is provided', async () => {
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByText('New Brew')).toBeInTheDocument();
      // Step 1 shows the coffee selector label
      expect(screen.getByText('Coffee *')).toBeInTheDocument();
    });

    it('renders edit form when brew is provided', async () => {
      renderWithRouter(
        <BrewForm
          brew={mockBrew}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Edit Brew')).toBeInTheDocument();
    });

    it('renders wizard progress indicator', () => {
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Should show progress elements
      const stepTexts = screen.getAllByText(/Step 1 of 7/);
      expect(stepTexts.length).toBeGreaterThan(0);
    });
  });

  describe('coffee selector (step 1)', () => {
    it('shows recent coffees when coffee selector is opened', async () => {
      const user = userEvent.setup();
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Recent')).toBeInTheDocument();
        expect(screen.getByText('Test Coffee')).toBeInTheDocument();
      });
    });

    it('allows selecting a coffee', async () => {
      const user = userEvent.setup();
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

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
  });

  describe('cancel action', () => {
    it('calls onCancel when back button is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // The back button in header should call onCancel
      const backButton = screen.getByRole('button', { name: /^back$/i });
      await user.click(backButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('free navigation', () => {
    it('shows Save Brew button on step 1 (create mode)', () => {
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /save brew/i })).toBeInTheDocument();
    });

    it('shows Save Brew button alongside Next on non-last steps', () => {
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // On step 1, should have both Next and Save Brew
      expect(screen.getByRole('button', { name: /^next$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save brew/i })).toBeInTheDocument();
    });

    it('does not show Save Draft button', () => {
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
    });

    it('shows Save Changes button in edit mode', () => {
      renderWithRouter(
        <BrewForm
          brew={mockBrew}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('Next advances to next step without validation', async () => {
      const user = userEvent.setup();
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // On step 1, without selecting coffee, click Next
      const nextButton = screen.getByRole('button', { name: /^next$/i });
      await user.click(nextButton);

      // Should advance to step 2 without validation error
      await waitFor(() => {
        expect(screen.getByText('Pre-Brew Variables')).toBeInTheDocument();
      });
    });

    it('shows coffee_id validation error on Save Brew without selecting coffee', async () => {
      const user = userEvent.setup();
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const saveBrew = screen.getByRole('button', { name: /save brew/i });
      await user.click(saveBrew);

      await waitFor(() => {
        expect(screen.getByText(/coffee is required/i)).toBeInTheDocument();
      });
    });

    it('can submit with only coffee_id (no overall_notes required)', async () => {
      const { createBrew } = await import('@/api/brews');
      (createBrew as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-brew' });

      const user = userEvent.setup();
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select coffee
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);
      await waitFor(() => expect(screen.getByText('Test Coffee')).toBeInTheDocument());
      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // Click Save Brew without filling overall_notes
      const saveBrew = screen.getByRole('button', { name: /save brew/i });
      await user.click(saveBrew);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('pour defaults', () => {
    it('applies pour defaults when navigating to brew step in create mode', async () => {
      const user = userEvent.setup();
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

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
        <BrewForm
          brew={mockBrew}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // In edit mode, navigate to Brew step by clicking step 3 in the progress bar
      // All steps are clickable in edit mode
      await waitFor(() => expect(screen.getByText('Edit Brew')).toBeInTheDocument());

      // Click step 3 button (the button containing "3" text)
      const stepButtons = screen.getAllByRole('button');
      const step3Button = stepButtons.find((btn) => btn.textContent?.includes('3'));
      expect(step3Button).toBeTruthy();
      await user.click(step3Button!);

      await waitFor(() => expect(screen.getByText('Brew Variables')).toBeInTheDocument());

      // Pours should be empty (from the brew, not defaults)
      expect(screen.getByText(/no pours recorded yet/i)).toBeInTheDocument();
    });

    it('does not apply pour defaults when brew has existing pours', async () => {
      const brewWithPours = {
        ...mockBrew,
        pours: [
          { id: 'p-1', brew_id: 'exp-1', pour_number: 1, water_amount: 75, pour_style: 'pulse', notes: 'existing' },
        ],
      };

      const user = userEvent.setup();
      renderWithRouter(
        <BrewForm
          brew={brewWithPours}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Navigate to Brew step via step 3 button (edit mode)
      await waitFor(() => expect(screen.getByText('Edit Brew')).toBeInTheDocument());

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
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

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
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

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
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select coffee
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);
      await waitFor(() => expect(screen.getByText('Test Coffee')).toBeInTheDocument());
      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // Navigate to step 5 (Quantitative) via Next buttons
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Pre-Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Post-Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^next$/i }));

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
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select coffee
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);
      await waitFor(() => expect(screen.getByText('Test Coffee')).toBeInTheDocument());
      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // Navigate to step 5 (Quantitative) via Next buttons
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Pre-Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Post-Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^next$/i }));

      await waitFor(() => expect(screen.getByText('Quantitative Outcomes')).toBeInTheDocument());

      // Goal fields should be empty
      expect(document.getElementById('goal_coffee_ml')).toHaveValue(null);
      expect(document.getElementById('goal_tds')).toHaveValue(null);
    });
  });

  describe('roast date', () => {
    it('shows roast date input after selecting a coffee', async () => {
      const user = userEvent.setup();
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select coffee
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);
      await waitFor(() => expect(screen.getByText('Test Coffee')).toBeInTheDocument());
      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // Roast date input should appear
      await waitFor(() => {
        expect(screen.getByLabelText('Roast Date (this bag)')).toBeInTheDocument();
      });
    });

    it('auto-populates roast date from coffee roast_date for new brews', async () => {
      const user = userEvent.setup();
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select coffee (which has roast_date: '2025-11-01')
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);
      await waitFor(() => expect(screen.getByText('Test Coffee')).toBeInTheDocument());
      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // Roast date should be auto-populated from coffee
      await waitFor(() => {
        expect(screen.getByLabelText('Roast Date (this bag)')).toHaveValue('2025-11-01');
      });
    });

    it('preserves existing roast_date in edit mode', async () => {
      const brewWithRoastDate = {
        ...mockBrew,
        roast_date: '2025-12-15',
      };

      renderWithRouter(
        <BrewForm
          brew={brewWithRoastDate}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // In edit mode, roast date should show the brew's roast_date
      await waitFor(() => {
        expect(screen.getByLabelText('Roast Date (this bag)')).toHaveValue('2025-12-15');
      });
    });
  });

  describe('NaN handling for empty numeric fields', () => {
    it('allows submitting with empty optional numeric fields on pre-brew step', async () => {
      const { createBrew } = await import('@/api/brews');
      (createBrew as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-brew' });

      const user = userEvent.setup();
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select coffee
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);
      await waitFor(() => expect(screen.getByText('Test Coffee')).toBeInTheDocument());
      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // Navigate to step 2 (Pre-Brew)
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Pre-Brew Variables')).toBeInTheDocument());

      // Leave all numeric fields empty (they will be NaN with valueAsNumber)
      // Click Next — should succeed without validation errors on optional fields
      await user.click(screen.getByRole('button', { name: /^next$/i }));

      // Should advance to step 3 (Brew Variables) without error
      await waitFor(() => expect(screen.getByText('Brew Variables')).toBeInTheDocument());
    });

    it('allows submitting with empty water_bypass_ml on post-brew step', async () => {
      const user = userEvent.setup();
      renderWithRouter(<BrewForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select coffee
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);
      await waitFor(() => expect(screen.getByText('Test Coffee')).toBeInTheDocument());
      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // Navigate to step 4 (Post-Brew) via Next
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Pre-Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Brew Variables')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /^next$/i }));
      await waitFor(() => expect(screen.getByText('Post-Brew Variables')).toBeInTheDocument());

      // Leave water_bypass_ml empty, click Next
      await user.click(screen.getByRole('button', { name: /^next$/i }));

      // Should advance to step 5 (Quantitative) without error
      await waitFor(() => expect(screen.getByText('Quantitative Outcomes')).toBeInTheDocument());
    });
  });
});
