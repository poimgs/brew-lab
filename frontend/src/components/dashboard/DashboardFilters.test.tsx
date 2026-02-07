import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardFilters, { getActiveFilterCount, EMPTY_FILTERS, type FilterValues } from './DashboardFilters';
import type { Coffee } from '@/api/coffees';

const mockCoffees: Coffee[] = [
  {
    id: 'c1',
    roaster: 'Cata',
    name: 'Kiamaina',
    brew_count: 8,
    created_at: '2025-11-22T00:00:00Z',
    updated_at: '2025-11-22T00:00:00Z',
  },
  {
    id: 'c2',
    roaster: 'Onyx',
    name: 'El Calagual',
    brew_count: 3,
    created_at: '2025-12-01T00:00:00Z',
    updated_at: '2025-12-01T00:00:00Z',
  },
  {
    id: 'c3',
    roaster: 'Sweet Bloom',
    name: 'Ethiopia',
    brew_count: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('DashboardFilters', () => {
  let onChange: (values: FilterValues) => void;
  let onClear: () => void;
  let onApply: () => void;

  beforeEach(() => {
    onChange = vi.fn();
    onClear = vi.fn();
    onApply = vi.fn();
  });

  function renderFilters(values: FilterValues = EMPTY_FILTERS) {
    return render(
      <DashboardFilters
        coffees={mockCoffees}
        values={values}
        onChange={onChange}
        onClear={onClear}
        onApply={onApply}
      />
    );
  }

  it('renders coffee checkboxes with names and roasters', () => {
    renderFilters();

    expect(screen.getByText(/Kiamaina · Cata/)).toBeInTheDocument();
    expect(screen.getByText(/El Calagual · Onyx/)).toBeInTheDocument();
    expect(screen.getByText(/Ethiopia · Sweet Bloom/)).toBeInTheDocument();
  });

  it('shows brew count badges per coffee', () => {
    renderFilters();

    expect(screen.getByText('8 brews')).toBeInTheDocument();
    expect(screen.getByText('3 brews')).toBeInTheDocument();
    expect(screen.getByText('1 brew')).toBeInTheDocument();
  });

  it('calls onChange when toggling a coffee checkbox', async () => {
    const user = userEvent.setup();
    renderFilters();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ selectedCoffeeIds: ['c1'] })
    );
  });

  it('calls onChange to deselect a checked coffee', async () => {
    const user = userEvent.setup();
    renderFilters({ ...EMPTY_FILTERS, selectedCoffeeIds: ['c1', 'c2'] });

    const checkboxes = screen.getAllByRole('checkbox');
    // Click the first checkbox which is checked — should deselect c1
    await user.click(checkboxes[0]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ selectedCoffeeIds: ['c2'] })
    );
  });

  it('Select All selects all coffees', async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.click(screen.getByText('Select All'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ selectedCoffeeIds: ['c1', 'c2', 'c3'] })
    );
  });

  it('Deselect All deselects all coffees when all are selected', async () => {
    const user = userEvent.setup();
    renderFilters({ ...EMPTY_FILTERS, selectedCoffeeIds: ['c1', 'c2', 'c3'] });

    await user.click(screen.getByText('Deselect All'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ selectedCoffeeIds: [] })
    );
  });

  it('date inputs update filter values', async () => {
    const user = userEvent.setup();
    renderFilters();

    const fromInput = screen.getByLabelText('From');
    await user.clear(fromInput);
    await user.type(fromInput, '2026-01-01');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: '2026-01-01' })
    );
  });

  it('score inputs update filter values', async () => {
    const user = userEvent.setup();
    renderFilters();

    const minInput = screen.getByLabelText('Min Score');
    await user.clear(minInput);
    await user.type(minInput, '5');

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ scoreMin: '5' })
    );
  });

  it('Clear All calls onClear', async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.click(screen.getByText('Clear All'));

    expect(onClear).toHaveBeenCalled();
  });

  it('Apply Filters calls onApply', async () => {
    const user = userEvent.setup();
    renderFilters();

    await user.click(screen.getByText('Apply Filters'));

    expect(onApply).toHaveBeenCalled();
  });
});

describe('getActiveFilterCount', () => {
  it('returns 0 for empty filters', () => {
    expect(getActiveFilterCount(EMPTY_FILTERS)).toBe(0);
  });

  it('counts selected coffees as 1', () => {
    expect(getActiveFilterCount({ ...EMPTY_FILTERS, selectedCoffeeIds: ['c1', 'c2'] })).toBe(1);
  });

  it('counts each active filter dimension', () => {
    expect(getActiveFilterCount({
      selectedCoffeeIds: ['c1'],
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
      scoreMin: '5',
      scoreMax: '10',
    })).toBe(5);
  });
});
