import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CoffeeDetail from './CoffeeDetail';
import type { Coffee, CoffeeReference, ReferenceExperiment } from '@/api/coffees';
import type { Experiment } from '@/api/experiments';
import * as coffeesApi from '@/api/coffees';
import * as coffeeGoalsApi from '@/api/coffee-goals';

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock API functions
vi.mock('@/api/coffees', async () => {
  const actual = await vi.importActual('@/api/coffees');
  return {
    ...actual,
    setBestExperiment: vi.fn(),
    archiveCoffee: vi.fn(),
    unarchiveCoffee: vi.fn(),
  };
});

vi.mock('@/api/coffee-goals', async () => {
  const actual = await vi.importActual('@/api/coffee-goals');
  return {
    ...actual,
    upsertCoffeeGoal: vi.fn(),
  };
});

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('CoffeeDetail', () => {
  const mockOnBack = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnRefresh = vi.fn();
  const mockOnArchive = vi.fn().mockResolvedValue(undefined);
  const mockOnUnarchive = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(coffeesApi.setBestExperiment).mockResolvedValue({} as Coffee);
    vi.mocked(coffeeGoalsApi.upsertCoffeeGoal).mockResolvedValue({
      id: 'goal-1',
      coffee_id: 'coffee-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
  });

  const createMockCoffee = (overrides: Partial<Coffee> = {}): Coffee => ({
    id: 'coffee-1',
    roaster: 'Cata Coffee',
    name: 'Kiamaina',
    country: 'Kenya',
    farm: 'Nyeri',
    process: 'Washed',
    roast_level: 'Light',
    roast_date: '2025-11-19',
    tasting_notes: 'Apricot Nectar, Lemon Sorbet',
    notes: 'Best around 3-4 weeks',
    experiment_count: 8,
    days_off_roast: 61,
    last_brewed: '2026-01-15T10:30:00Z',
    created_at: '2025-11-22T15:00:00Z',
    updated_at: '2025-11-22T15:00:00Z',
    ...overrides,
  });

  const createMockReferenceExperiment = (
    overrides: Partial<ReferenceExperiment> = {}
  ): ReferenceExperiment => ({
    id: 'exp-1',
    brew_date: '2026-01-15T10:30:00Z',
    coffee_weight: 15,
    water_weight: 225,
    ratio: 15,
    grind_size: 3.5,
    water_temperature: 96,
    filter_paper: { id: 'fp-1', name: 'Abaca', brand: 'Cafec' },
    bloom_water: 40,
    bloom_time: 30,
    total_brew_time: 165,
    tds: 1.38,
    extraction_yield: 20.1,
    overall_score: 8,
    is_best: true,
    ...overrides,
  });

  const createMockReference = (
    overrides: Partial<CoffeeReference> = {}
  ): CoffeeReference => ({
    experiment: createMockReferenceExperiment(),
    goals: {
      id: 'goal-1',
      coffee_ml: 180,
      tds: 1.38,
      extraction_yield: 20.5,
      brightness_intensity: 7,
      sweetness_intensity: 8,
      overall_score: 9,
    },
    ...overrides,
  });

  const createMockExperiment = (overrides: Partial<Experiment> = {}): Experiment => ({
    id: 'exp-1',
    user_id: 'user-1',
    coffee_id: 'coffee-1',
    brew_date: '2026-01-15T10:30:00Z',
    overall_notes: 'Great brew',
    overall_score: 8,
    grind_size: 3.5,
    ratio: 15,
    water_temperature: 96,
    created_at: '2026-01-15T10:35:00Z',
    updated_at: '2026-01-15T10:35:00Z',
    ...overrides,
  });

  describe('header section', () => {
    it('renders coffee name and details', () => {
      const coffee = createMockCoffee();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
      expect(screen.getByText(/Cata Coffee.*Kenya.*Washed/)).toBeInTheDocument();
    });

    it('renders archived badge when coffee is archived', () => {
      const coffee = createMockCoffee({ archived_at: '2026-01-20T00:00:00Z' });
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      await user.click(screen.getByText('Back to Coffees'));
      expect(mockOnBack).toHaveBeenCalledOnce();
    });

    it('calls onEdit when edit button in header is clicked', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      // Find the Edit button next to New Experiment (in the header)
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      // The first Edit button is in the header (with "Edit" text)
      // We need to find the one that's an outline variant (header edit)
      const headerEditButton = editButtons.find(btn =>
        btn.getAttribute('data-variant') === 'outline' && btn.textContent?.trim() === 'Edit'
      );
      expect(headerEditButton).toBeInTheDocument();
      await user.click(headerEditButton!);
      expect(mockOnEdit).toHaveBeenCalledOnce();
    });

    it('navigates to new experiment page when New Experiment is clicked', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      await user.click(screen.getByRole('button', { name: /New Experiment/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/experiments/new?coffee_id=coffee-1');
    });
  });

  describe('stats section', () => {
    it('renders coffee stats', () => {
      const coffee = createMockCoffee();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      expect(screen.getByText('61')).toBeInTheDocument(); // Days off roast
      expect(screen.getByText('8')).toBeInTheDocument(); // Experiment count
    });
  });

  describe('reference brew section', () => {
    it('renders reference brew information', () => {
      const coffee = createMockCoffee();
      const reference = createMockReference();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={reference}
          experiments={[createMockExperiment()]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      expect(screen.getByText('Reference Brew')).toBeInTheDocument();
      expect(screen.getByText(/Reference Brew.*Jan 15/)).toBeInTheDocument();
      expect(screen.getByText(/Grind: 3.5.*1:15.*96°C.*Abaca/)).toBeInTheDocument();
      expect(screen.getByText(/TDS: 1.38%.*EY: 20.1%/)).toBeInTheDocument();
    });

    it('renders empty state when no experiments exist', () => {
      const coffee = createMockCoffee({ experiment_count: 0 });
      const reference = createMockReference({ experiment: null, goals: null });
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={reference}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      // In best brew section
      expect(screen.getByText(/No experiments yet.*Log your first brew/)).toBeInTheDocument();
    });

    it('shows Change button when experiments exist', () => {
      const coffee = createMockCoffee();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[createMockExperiment()]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
    });
  });

  describe('target goals section', () => {
    it('renders target goals information with quantitative and sensory subsections', () => {
      const coffee = createMockCoffee();
      const reference = createMockReference();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={reference}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      expect(screen.getByText('Target Goals')).toBeInTheDocument();
      expect(screen.getByText('Quantitative')).toBeInTheDocument();
      expect(screen.getByText('Sensory')).toBeInTheDocument();
      // Quantitative goals (coffee_ml is unique to goals section)
      expect(screen.getByText(/Coffee: 180ml/)).toBeInTheDocument();
      // TDS/EY may appear in both reference brew and goals sections
      expect(screen.getAllByText(/TDS: 1.38%/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/EY: 20/).length).toBeGreaterThanOrEqual(1);
      // Sensory goals
      expect(screen.getByText(/Brightness: 7\/10/)).toBeInTheDocument();
      expect(screen.getByText(/Sweetness: 8\/10/)).toBeInTheDocument();
      expect(screen.getByText(/Overall: 9\/10/)).toBeInTheDocument();
    });

    it('renders empty state when no goals exist', () => {
      const coffee = createMockCoffee();
      const reference = createMockReference({ goals: null });
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={reference}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      expect(screen.getByText(/No goals set yet/)).toBeInTheDocument();
    });

    it('opens goals dialog when Edit button is clicked', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      // Find the Edit button in the Target Goals section
      const targetGoalsSection = screen.getByText('Target Goals').closest('div')?.parentElement;
      const editButton = targetGoalsSection?.querySelector('button');

      if (editButton) {
        await user.click(editButton);
        expect(screen.getByText('Edit Target Goals')).toBeInTheDocument();
      }
    });

    it('saves goals when Save Goals button is clicked', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      // Open goals dialog
      const targetGoalsSection = screen.getByText('Target Goals').closest('div')?.parentElement;
      const editButton = targetGoalsSection?.querySelector('button');

      if (editButton) {
        await user.click(editButton);

        // Click Save Goals
        await user.click(screen.getByRole('button', { name: /Save Goals/i }));

        await waitFor(() => {
          expect(coffeeGoalsApi.upsertCoffeeGoal).toHaveBeenCalled();
          expect(mockOnRefresh).toHaveBeenCalled();
        });
      }
    });
  });

  describe('brew history section', () => {
    it('renders experiment list', () => {
      const coffee = createMockCoffee();
      const experiments = [
        createMockExperiment({ id: 'exp-1', brew_date: '2026-01-15T10:30:00Z', overall_score: 8 }),
        createMockExperiment({ id: 'exp-2', brew_date: '2026-01-12T10:30:00Z', overall_score: 7 }),
      ];
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={experiments}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      expect(screen.getByText('Brew History')).toBeInTheDocument();
      expect(screen.getByText('Jan 15')).toBeInTheDocument();
      expect(screen.getByText('Jan 12')).toBeInTheDocument();
    });

    it('shows loading state when experiments are loading', () => {
      const coffee = createMockCoffee();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={true}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      // Look for the loader by class
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });

    it('shows empty state when no experiments exist', () => {
      const coffee = createMockCoffee({ experiment_count: 0 });
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference({ experiment: null, goals: null })}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      // In brew history section
      expect(screen.getByText(/Click "New Experiment" to log your first brew/)).toBeInTheDocument();
    });

    it('marks best experiment with star icon', () => {
      const coffee = createMockCoffee({ best_experiment_id: 'exp-1' });
      const experiments = [
        createMockExperiment({ id: 'exp-1', brew_date: '2026-01-15T10:30:00Z' }),
        createMockExperiment({ id: 'exp-2', brew_date: '2026-01-12T10:30:00Z' }),
      ];
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={experiments}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      // The best experiment should have a filled star (yellow-500 class)
      const stars = document.querySelectorAll('.fill-yellow-500');
      expect(stars.length).toBeGreaterThanOrEqual(1);
    });

    it('shows Mark as Reference button for non-reference experiments', () => {
      const coffee = createMockCoffee({ best_experiment_id: 'exp-1' });
      const experiments = [
        createMockExperiment({ id: 'exp-1', brew_date: '2026-01-15T10:30:00Z' }),
        createMockExperiment({ id: 'exp-2', brew_date: '2026-01-12T10:30:00Z' }),
      ];
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={experiments}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      expect(screen.getByRole('button', { name: /Mark as Reference/i })).toBeInTheDocument();
    });

    it('sets reference experiment when Mark as Reference is clicked', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee({ best_experiment_id: 'exp-1' });
      const experiments = [
        createMockExperiment({ id: 'exp-1', brew_date: '2026-01-15T10:30:00Z' }),
        createMockExperiment({ id: 'exp-2', brew_date: '2026-01-12T10:30:00Z' }),
      ];
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={experiments}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      await user.click(screen.getByRole('button', { name: /Mark as Reference/i }));

      await waitFor(() => {
        expect(coffeesApi.setBestExperiment).toHaveBeenCalledWith('coffee-1', 'exp-2');
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });

    it('navigates to experiment detail when row is clicked', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee();
      const experiments = [createMockExperiment({ id: 'exp-1' })];
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={experiments}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      // Click on the table row
      const row = screen.getByText('Jan 15').closest('tr');
      if (row) {
        await user.click(row);
        expect(mockNavigate).toHaveBeenCalledWith('/experiments/exp-1');
      }
    });

    it('shows View All Experiments link when more than 10 experiments', () => {
      const coffee = createMockCoffee();
      const experiments = Array.from({ length: 11 }, (_, i) =>
        createMockExperiment({
          id: `exp-${i}`,
          brew_date: `2026-01-${String(15 - i).padStart(2, '0')}T10:30:00Z`,
        })
      );
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={experiments}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      expect(screen.getByRole('button', { name: /View All Experiments/i })).toBeInTheDocument();
    });
  });

  describe('change reference experiment dialog', () => {
    it('opens dialog when Change button is clicked', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee();
      const experiments = [createMockExperiment()];
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={experiments}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Change' }));
      expect(screen.getByText('Select Reference Brew')).toBeInTheDocument();
    });

    it('shows Clear Selection button when best experiment is set', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee({ best_experiment_id: 'exp-1' });
      const experiments = [createMockExperiment()];
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={experiments}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Change' }));
      expect(screen.getByRole('button', { name: 'Clear Selection' })).toBeInTheDocument();
    });

    it('clears best experiment when Clear Selection is clicked', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee({ best_experiment_id: 'exp-1' });
      const experiments = [createMockExperiment()];
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={experiments}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Change' }));
      await user.click(screen.getByRole('button', { name: 'Clear Selection' }));

      await waitFor(() => {
        expect(coffeesApi.setBestExperiment).toHaveBeenCalledWith('coffee-1', null);
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('archive/unarchive actions', () => {
    it('shows Archive button when coffee is not archived', () => {
      const coffee = createMockCoffee();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      expect(screen.getByRole('button', { name: /Archive/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Unarchive/i })).not.toBeInTheDocument();
    });

    it('shows Unarchive button when coffee is archived', () => {
      const coffee = createMockCoffee({ archived_at: '2026-01-20T00:00:00Z' });
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      expect(screen.getByRole('button', { name: /Unarchive/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Archive$/i })).not.toBeInTheDocument();
    });

    it('opens confirmation dialog when Archive button is clicked', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      await user.click(screen.getByRole('button', { name: /Archive/i }));
      expect(screen.getByText('Archive Coffee')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to archive/)).toBeInTheDocument();
    });

    it('calls onArchive when confirmed in dialog', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      // Open the archive dialog
      await user.click(screen.getByRole('button', { name: /Archive/i }));

      // Confirm archive in the dialog
      const dialogArchiveButton = screen.getAllByRole('button', { name: /Archive/i }).find(
        btn => btn.closest('[role="dialog"]')
      );
      expect(dialogArchiveButton).toBeInTheDocument();
      await user.click(dialogArchiveButton!);

      await waitFor(() => {
        expect(mockOnArchive).toHaveBeenCalledOnce();
      });
    });

    it('does not call onArchive when dialog is cancelled', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee();
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      // Open the archive dialog
      await user.click(screen.getByRole('button', { name: /Archive/i }));
      expect(screen.getByText('Archive Coffee')).toBeInTheDocument();

      // Click Cancel
      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(mockOnArchive).not.toHaveBeenCalled();
    });

    it('calls onUnarchive directly without confirmation dialog', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee({ archived_at: '2026-01-20T00:00:00Z' });
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      await user.click(screen.getByRole('button', { name: /Unarchive/i }));

      await waitFor(() => {
        expect(mockOnUnarchive).toHaveBeenCalledOnce();
      });
      // No dialog should appear
      expect(screen.queryByText('Archive Coffee')).not.toBeInTheDocument();
    });

    it('shows coffee name in archive confirmation dialog', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee({ name: 'El Calagual', roaster: 'Cata Coffee' });
      renderWithRouter(
        <CoffeeDetail
          coffee={coffee}
          reference={createMockReference()}
          experiments={[]}
          experimentsLoading={false}
          onBack={mockOnBack}
          onEdit={mockOnEdit}
          onRefresh={mockOnRefresh}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
        />
      );

      await user.click(screen.getByRole('button', { name: /Archive/i }));
      expect(screen.getByText(/El Calagual.*Cata Coffee/)).toBeInTheDocument();
    });
  });
});
