import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ExperimentDetailModal from './ExperimentDetailModal';
import * as experimentsApi from '@/api/experiments';
import * as coffeesApi from '@/api/coffees';
import type { Experiment } from '@/api/experiments';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/api/experiments', () => ({
  getExperiment: vi.fn(),
  deleteExperiment: vi.fn(),
  copyExperiment: vi.fn(),
}));

vi.mock('@/api/coffees', () => ({
  setBestExperiment: vi.fn(),
}));

function createMockExperiment(overrides: Partial<Experiment> = {}): Experiment {
  return {
    id: 'exp-1',
    user_id: 'user-1',
    coffee_id: 'coffee-1',
    brew_date: '2026-01-20T10:30:00Z',
    overall_notes: 'Good balanced brew with nice sweetness',
    overall_score: 8,
    is_draft: false,
    created_at: '2026-01-20T10:35:00Z',
    updated_at: '2026-01-20T10:35:00Z',
    coffee: {
      id: 'coffee-1',
      roaster: 'Cata Coffee',
      name: 'Kiamaina',
      roast_date: '2025-11-19',
    },
    coffee_weight: 15.0,
    water_weight: 225.0,
    ratio: 15,
    grind_size: 3.0,
    water_temperature: 96,
    bloom_water: 40,
    bloom_time: 30,
    total_brew_time: 165,
    tds: 1.38,
    extraction_yield: 20.1,
    coffee_ml: 180,
    days_off_roast: 62,
    aroma_intensity: 7,
    sweetness_intensity: 8,
    body_intensity: 7,
    improvement_notes: 'Try pushing complexity with longer bloom',
    ...overrides,
  };
}

function renderModal(props: Partial<React.ComponentProps<typeof ExperimentDetailModal>> = {}) {
  const defaultProps = {
    experimentId: 'exp-1',
    open: true,
    onOpenChange: vi.fn(),
    onRefresh: vi.fn(),
    ...props,
  };
  return render(
    <MemoryRouter>
      <ExperimentDetailModal {...defaultProps} />
    </MemoryRouter>
  );
}

describe('ExperimentDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(experimentsApi.getExperiment).mockResolvedValue(createMockExperiment());
    vi.mocked(coffeesApi.setBestExperiment).mockResolvedValue({} as any);
  });

  it('renders loading state initially', () => {
    vi.mocked(experimentsApi.getExperiment).mockReturnValue(new Promise(() => {}));
    renderModal();
    expect(document.querySelector('.animate-spin')).not.toBeNull();
  });

  it('renders experiment details after loading', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });
    expect(screen.getByText('8/10')).toBeInTheDocument();
    expect(screen.getByText('Good balanced brew with nice sweetness')).toBeInTheDocument();
  });

  it('renders coffee name and roaster in header', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
    });
    expect(screen.getByText(/Cata Coffee/)).toBeInTheDocument();
  });

  it('shows draft badge when experiment is a draft', async () => {
    vi.mocked(experimentsApi.getExperiment).mockResolvedValue(
      createMockExperiment({ is_draft: true })
    );
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  it('renders pre-brew variables', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Pre-Brew')).toBeInTheDocument();
    });
    expect(screen.getByText('15')).toBeInTheDocument(); // dose
    expect(screen.getByText('3')).toBeInTheDocument(); // grind
  });

  it('renders brew variables', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Brew')).toBeInTheDocument();
    });
    expect(screen.getByText('2m 45s')).toBeInTheDocument(); // total brew time
  });

  it('renders quantitative outcomes', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Outcomes')).toBeInTheDocument();
    });
    expect(screen.getByText('1.38')).toBeInTheDocument(); // TDS
    expect(screen.getByText('20.1')).toBeInTheDocument(); // extraction
  });

  it('renders sensory outcomes', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Sensory')).toBeInTheDocument();
    });
    expect(screen.getByText('Aroma')).toBeInTheDocument();
    expect(screen.getByText('Sweetness')).toBeInTheDocument();
  });

  it('renders improvement notes', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Ideas for Next Time')).toBeInTheDocument();
    });
    expect(screen.getByText('Try pushing complexity with longer bloom')).toBeInTheDocument();
  });

  it('renders action buttons', async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Reference')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows "Continue Editing" for drafts instead of "Edit"', async () => {
    vi.mocked(experimentsApi.getExperiment).mockResolvedValue(
      createMockExperiment({ is_draft: true })
    );
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Continue Editing')).toBeInTheDocument();
    });
  });

  it('shows error state when experiment fails to load', async () => {
    vi.mocked(experimentsApi.getExperiment).mockRejectedValue(new Error('Not found'));
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('Failed to load experiment')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('navigates to edit form when Edit is clicked', async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      renderModal({ onOpenChange });

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Edit'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(mockNavigate).toHaveBeenCalledWith('/experiments/new?edit=exp-1');
    });

    it('calls setBestExperiment when Reference is clicked', async () => {
      const onRefresh = vi.fn();
      const user = userEvent.setup();
      renderModal({ onRefresh });

      await waitFor(() => {
        expect(screen.getByText('Reference')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Reference'));

      await waitFor(() => {
        expect(coffeesApi.setBestExperiment).toHaveBeenCalledWith('coffee-1', 'exp-1');
      });
      expect(onRefresh).toHaveBeenCalled();
    });

    it('shows delete confirmation dialog and deletes on confirm', async () => {
      const onOpenChange = vi.fn();
      const onRefresh = vi.fn();
      vi.mocked(experimentsApi.deleteExperiment).mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderModal({ onOpenChange, onRefresh });

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Delete'));

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText('Delete Experiment')).toBeInTheDocument();
      });
      expect(screen.getByText(/Are you sure you want to delete this experiment/)).toBeInTheDocument();

      // Click confirm delete
      const confirmBtn = screen.getAllByRole('button', { name: /Delete/i }).find(
        (btn) => btn.classList.contains('bg-destructive') || btn.closest('[class*="destructive"]') !== null
      ) || screen.getAllByText('Delete').pop()!;
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(experimentsApi.deleteExperiment).toHaveBeenCalledWith('exp-1');
      });
      expect(onRefresh).toHaveBeenCalled();
    });

    it('copies experiment and navigates when Copy is clicked', async () => {
      const onOpenChange = vi.fn();
      vi.mocked(experimentsApi.copyExperiment).mockResolvedValue(
        createMockExperiment({ id: 'exp-copy' })
      );
      const user = userEvent.setup();
      renderModal({ onOpenChange });

      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Copy'));

      await waitFor(() => {
        expect(experimentsApi.copyExperiment).toHaveBeenCalledWith('exp-1');
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(mockNavigate).toHaveBeenCalledWith('/experiments/new?edit=exp-copy');
    });
  });

  describe('prev/next navigation', () => {
    it('renders prev/next buttons when experimentIds are provided', async () => {
      renderModal({
        experimentIds: ['exp-0', 'exp-1', 'exp-2'],
        onNavigate: vi.fn(),
      });
      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('disables Previous when on first experiment', async () => {
      renderModal({
        experimentId: 'exp-0',
        experimentIds: ['exp-0', 'exp-1', 'exp-2'],
        onNavigate: vi.fn(),
      });
      await waitFor(() => {
        expect(screen.getByText('Previous').closest('button')).toBeDisabled();
      });
      expect(screen.getByText('Next').closest('button')).not.toBeDisabled();
    });

    it('disables Next when on last experiment', async () => {
      vi.mocked(experimentsApi.getExperiment).mockResolvedValue(
        createMockExperiment({ id: 'exp-2' })
      );
      renderModal({
        experimentId: 'exp-2',
        experimentIds: ['exp-0', 'exp-1', 'exp-2'],
        onNavigate: vi.fn(),
      });
      await waitFor(() => {
        expect(screen.getByText('Next').closest('button')).toBeDisabled();
      });
      expect(screen.getByText('Previous').closest('button')).not.toBeDisabled();
    });

    it('calls onNavigate with next experiment ID when Next is clicked', async () => {
      const onNavigate = vi.fn();
      const user = userEvent.setup();
      renderModal({
        experimentIds: ['exp-0', 'exp-1', 'exp-2'],
        onNavigate,
      });
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Next'));
      expect(onNavigate).toHaveBeenCalledWith('exp-2');
    });

    it('calls onNavigate with previous experiment ID when Previous is clicked', async () => {
      const onNavigate = vi.fn();
      const user = userEvent.setup();
      renderModal({
        experimentIds: ['exp-0', 'exp-1', 'exp-2'],
        onNavigate,
      });
      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Previous'));
      expect(onNavigate).toHaveBeenCalledWith('exp-0');
    });

    it('does not render prev/next when only one experiment in list', async () => {
      renderModal({
        experimentIds: ['exp-1'],
        onNavigate: vi.fn(),
      });
      await waitFor(() => {
        expect(screen.getByText('Kiamaina')).toBeInTheDocument();
      });
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });

    it('does not render prev/next when experimentIds not provided', async () => {
      renderModal();
      await waitFor(() => {
        expect(screen.getByText('Kiamaina')).toBeInTheDocument();
      });
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });
  });

  it('does not fetch experiment when modal is closed', () => {
    renderModal({ open: false });
    expect(experimentsApi.getExperiment).not.toHaveBeenCalled();
  });

  it('fetches experiment when modal opens', async () => {
    renderModal({ open: true, experimentId: 'exp-1' });
    await waitFor(() => {
      expect(experimentsApi.getExperiment).toHaveBeenCalledWith('exp-1');
    });
  });
});
