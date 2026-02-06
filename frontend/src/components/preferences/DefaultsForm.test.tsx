import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DefaultsForm from './DefaultsForm';

// Radix UI polyfills for jsdom
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const mockDefaults: Record<string, string> = {
  coffee_weight: '15',
  ratio: '15',
  grind_size: '3.5',
  water_temperature: '93',
  bloom_water: '45',
  bloom_time: '45',
};

vi.mock('@/api/defaults', () => ({
  getDefaults: vi.fn(() => Promise.resolve(mockDefaults)),
  updateDefaults: vi.fn((data: Record<string, string>) =>
    Promise.resolve({ ...mockDefaults, ...data })
  ),
  deleteDefault: vi.fn(() => Promise.resolve()),
  SUPPORTED_FIELDS: [
    'coffee_weight',
    'water_weight',
    'ratio',
    'grind_size',
    'water_temperature',
    'filter_paper_id',
    'bloom_water',
    'bloom_time',
    'pour_defaults',
  ],
}));

vi.mock('@/api/filter-papers', () => ({
  listFilterPapers: vi.fn(() =>
    Promise.resolve({
      items: [
        { id: 'fp-1', name: 'Abaca', brand: 'Cafec', created_at: '', updated_at: '' },
        { id: 'fp-2', name: 'Tabbed', brand: 'Hario', created_at: '', updated_at: '' },
      ],
      pagination: { page: 1, per_page: 100, total: 2, total_pages: 1 },
    })
  ),
}));

describe('DefaultsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Pre-Brew Defaults" section header', async () => {
    render(<DefaultsForm />);

    await waitFor(() => {
      expect(screen.getByText('Pre-Brew Defaults')).toBeInTheDocument();
    });
  });

  it('renders "Brew Defaults" section header', async () => {
    render(<DefaultsForm />);

    await waitFor(() => {
      // "Brew Defaults" appears twice: CardTitle and section h4
      const matches = screen.getAllByText('Brew Defaults');
      expect(matches.length).toBe(2);
      // The section header is an h4
      const sectionHeader = matches.find((el) => el.tagName === 'H4');
      expect(sectionHeader).toBeDefined();
    });
  });

  it('groups pre-brew fields under Pre-Brew Defaults section', async () => {
    render(<DefaultsForm />);

    await waitFor(() => {
      expect(screen.getByText('Pre-Brew Defaults')).toBeInTheDocument();
    });

    // Pre-brew fields should be present
    expect(screen.getByLabelText('Coffee Weight')).toBeInTheDocument();
    expect(screen.getByLabelText('Water Weight')).toBeInTheDocument();
    expect(screen.getByLabelText('Ratio')).toBeInTheDocument();
    expect(screen.getByLabelText('Grind Size')).toBeInTheDocument();
    expect(screen.getByLabelText('Temperature')).toBeInTheDocument();
  });

  it('groups brew fields under Brew Defaults section', async () => {
    render(<DefaultsForm />);

    await waitFor(() => {
      expect(screen.getAllByText('Brew Defaults').length).toBe(2);
    });

    // Brew fields should be present
    expect(screen.getByLabelText('Bloom Water')).toBeInTheDocument();
    expect(screen.getByLabelText('Bloom Time')).toBeInTheDocument();
  });

  it('renders ratio input as numeric type', async () => {
    render(<DefaultsForm />);

    await waitFor(() => {
      expect(screen.getByLabelText('Ratio')).toBeInTheDocument();
    });

    const ratioInput = screen.getByLabelText('Ratio');
    expect(ratioInput).toHaveAttribute('type', 'number');
    expect(ratioInput).toHaveAttribute('step', 'any');
  });

  it('renders grind size input as numeric type', async () => {
    render(<DefaultsForm />);

    await waitFor(() => {
      expect(screen.getByLabelText('Grind Size')).toBeInTheDocument();
    });

    const grindInput = screen.getByLabelText('Grind Size');
    expect(grindInput).toHaveAttribute('type', 'number');
    expect(grindInput).toHaveAttribute('step', 'any');
  });

  it('pre-populates fields with saved defaults', async () => {
    render(<DefaultsForm />);

    await waitFor(() => {
      expect(screen.getByLabelText('Coffee Weight')).toHaveValue(15);
    });

    expect(screen.getByLabelText('Ratio')).toHaveValue(15);
    expect(screen.getByLabelText('Grind Size')).toHaveValue(3.5);
    expect(screen.getByLabelText('Temperature')).toHaveValue(93);
    expect(screen.getByLabelText('Bloom Water')).toHaveValue(45);
    expect(screen.getByLabelText('Bloom Time')).toHaveValue(45);
  });

  it('enables Save button only when changes are pending', async () => {
    const user = userEvent.setup();
    render(<DefaultsForm />);

    await waitFor(() => {
      expect(screen.getByLabelText('Coffee Weight')).toBeInTheDocument();
    });

    // Save should be disabled initially (no pending changes)
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();

    // Make a change
    await user.clear(screen.getByLabelText('Coffee Weight'));
    await user.type(screen.getByLabelText('Coffee Weight'), '16');

    // Save should now be enabled
    expect(saveButton).toBeEnabled();
  });

  it('calls updateDefaults when Save is clicked', async () => {
    const { updateDefaults } = await import('@/api/defaults');
    const user = userEvent.setup();
    render(<DefaultsForm />);

    await waitFor(() => {
      expect(screen.getByLabelText('Ratio')).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText('Ratio'));
    await user.type(screen.getByLabelText('Ratio'), '16');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(updateDefaults).toHaveBeenCalledWith(
        expect.objectContaining({ ratio: '16' })
      );
    });
  });

  it('renders Pour Defaults section with Add Pour button', async () => {
    render(<DefaultsForm />);

    await waitFor(() => {
      expect(screen.getByText('Pour Defaults')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /add pour/i })).toBeInTheDocument();
  });

  it('shows empty state when no pour defaults are set', async () => {
    render(<DefaultsForm />);

    await waitFor(() => {
      expect(
        screen.getByText(/no pour defaults set/i)
      ).toBeInTheDocument();
    });
  });
});
