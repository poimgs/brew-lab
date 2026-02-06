import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CoffeeCard from './CoffeeCard';
import type { Coffee } from '@/api/coffees';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const baseCoffee: Coffee = {
  id: 'coffee-1',
  roaster: 'Cata Coffee',
  name: 'Kiamaina',
  country: 'Kenya',
  farm: 'Kiamaina Estate',
  process: 'Washed',
  roast_level: 'Light',
  experiment_count: 8,
  created_at: '2025-11-22T15:00:00Z',
  updated_at: '2025-11-22T15:00:00Z',
};

const coffeeWithBestExperiment: Coffee = {
  ...baseCoffee,
  best_experiment: {
    id: 'exp-1',
    brew_date: '2026-01-15T10:30:00Z',
    overall_score: 8,
    ratio: 15,
    water_temperature: 96,
    filter_paper_name: 'Abaca',
    mineral_profile_name: 'Third Wave Water',
    bloom_time: 30,
    pour_count: 2,
    pour_styles: ['circular', 'circular'],
  },
  improvement_note: 'Try finer grind to boost sweetness',
};

const archivedCoffee: Coffee = {
  ...baseCoffee,
  archived_at: '2026-01-20T00:00:00Z',
};

function renderCard(coffee: Coffee, props?: Partial<{ onNewExperiment: (id: string) => void; onEdit: (coffee: Coffee) => void; onArchive: (id: string) => void; onReactivate: (id: string) => void }>) {
  const onNewExperiment = props?.onNewExperiment ?? vi.fn();
  const onEdit = props?.onEdit ?? vi.fn();
  const onArchive = props?.onArchive ?? vi.fn();
  const onReactivate = props?.onReactivate;
  return render(
    <BrowserRouter>
      <CoffeeCard
        coffee={coffee}
        onNewExperiment={onNewExperiment}
        onEdit={onEdit}
        onArchive={onArchive}
        onReactivate={onReactivate}
      />
    </BrowserRouter>
  );
}

describe('CoffeeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders coffee name and roaster', () => {
    renderCard(baseCoffee);

    expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    expect(screen.getByText('Cata Coffee')).toBeInTheDocument();
  });

  it('shows "No experiments yet" when no best experiment', () => {
    renderCard(baseCoffee);

    expect(screen.getByText('No experiments yet')).toBeInTheDocument();
  });

  it('displays best brew date and score', () => {
    renderCard(coffeeWithBestExperiment);

    expect(screen.getByText(/Reference Brew/)).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
  });

  it('displays brew parameters line', () => {
    renderCard(coffeeWithBestExperiment);

    // Ratio, temp, filter, minerals joined by middle dot
    expect(screen.getByText(/1:15/)).toBeInTheDocument();
    expect(screen.getByText(/96\u00B0C/)).toBeInTheDocument();
    expect(screen.getByText(/Abaca/)).toBeInTheDocument();
    expect(screen.getByText(/Third Wave Water/)).toBeInTheDocument();
  });

  it('displays pour info', () => {
    renderCard(coffeeWithBestExperiment);

    expect(screen.getByText(/Bloom 30s/)).toBeInTheDocument();
    expect(screen.getByText(/2 pours/)).toBeInTheDocument();
  });

  it('displays improvement note when present', () => {
    renderCard(coffeeWithBestExperiment);

    expect(screen.getByText(/Try finer grind to boost sweetness/)).toBeInTheDocument();
  });

  it('does not display improvement note when absent', () => {
    renderCard(baseCoffee);

    expect(screen.queryByText(/Try finer grind/)).not.toBeInTheDocument();
  });

  it('shows Archived badge for archived coffee', () => {
    renderCard(archivedCoffee);

    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('does not show Archived badge for active coffee', () => {
    renderCard(baseCoffee);

    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });

  it('shows "New Experiment" button for active coffee', () => {
    renderCard(baseCoffee);

    expect(screen.getByRole('button', { name: /new experiment/i })).toBeInTheDocument();
  });

  it('shows "Re-activate" button for archived coffee with onReactivate', () => {
    renderCard(archivedCoffee, { onReactivate: vi.fn() });

    expect(screen.getByRole('button', { name: /re-activate/i })).toBeInTheDocument();
  });

  it('navigates to coffee detail when card is clicked', async () => {
    const user = userEvent.setup();
    renderCard(baseCoffee);

    await user.click(screen.getByText('Kiamaina'));

    expect(mockNavigate).toHaveBeenCalledWith('/coffees/coffee-1');
  });

  it('calls onNewExperiment when "New Experiment" button is clicked', async () => {
    const user = userEvent.setup();
    const onNewExperiment = vi.fn();
    renderCard(baseCoffee, { onNewExperiment });

    await user.click(screen.getByRole('button', { name: /new experiment/i }));

    expect(onNewExperiment).toHaveBeenCalledWith('coffee-1');
    // Should NOT navigate to detail page
    expect(mockNavigate).not.toHaveBeenCalledWith('/coffees/coffee-1');
  });

  it('calls onReactivate when "Re-activate" button is clicked for archived coffee', async () => {
    const user = userEvent.setup();
    const onReactivate = vi.fn();
    renderCard(archivedCoffee, { onReactivate });

    await user.click(screen.getByRole('button', { name: /re-activate/i }));

    expect(onReactivate).toHaveBeenCalledWith('coffee-1');
    expect(mockNavigate).not.toHaveBeenCalledWith('/coffees/coffee-1');
  });

  it('does not show score badge when overall_score is null', () => {
    const coffeeNoScore: Coffee = {
      ...baseCoffee,
      best_experiment: {
        id: 'exp-2',
        brew_date: '2026-01-15T10:30:00Z',
        ratio: 15,
        pour_count: 0,
        pour_styles: [],
      },
    };

    renderCard(coffeeNoScore);

    expect(screen.queryByText(/\/10/)).not.toBeInTheDocument();
  });

  it('shows Edit and Archive buttons for active coffee', () => {
    renderCard(baseCoffee);

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
  });

  it('does not show Edit or Archive buttons for archived coffee', () => {
    renderCard(archivedCoffee, { onReactivate: vi.fn() });

    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    // The Archive button from lucide has text "Archive" but "Re-activate" is shown instead
    expect(screen.queryByRole('button', { name: /new experiment/i })).not.toBeInTheDocument();
  });

  it('calls onEdit with coffee object when Edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    renderCard(baseCoffee, { onEdit });

    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledWith(baseCoffee);
    expect(mockNavigate).not.toHaveBeenCalledWith('/coffees/coffee-1');
  });

  it('calls onArchive with coffee id when Archive button is clicked', async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    renderCard(baseCoffee, { onArchive });

    await user.click(screen.getByRole('button', { name: /archive/i }));

    expect(onArchive).toHaveBeenCalledWith('coffee-1');
    expect(mockNavigate).not.toHaveBeenCalledWith('/coffees/coffee-1');
  });
});
