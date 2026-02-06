import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SessionList from './SessionList';
import type { Session } from '@/api/sessions';
import type { Experiment } from '@/api/experiments';
import * as sessionsApi from '@/api/sessions';

vi.mock('@/api/sessions', async () => {
  const actual = await vi.importActual('@/api/sessions');
  return {
    ...actual,
    deleteSession: vi.fn(),
    getSession: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    linkExperiments: vi.fn(),
    unlinkExperiment: vi.fn(),
  };
});

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('SessionList', () => {
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sessionsApi.deleteSession).mockResolvedValue(undefined);
  });

  const createMockSession = (overrides: Partial<Session> = {}): Session => ({
    id: 'session-1',
    user_id: 'user-1',
    coffee_id: 'coffee-1',
    name: 'Grind size sweep',
    variable_tested: 'grind size',
    hypothesis: 'Finer grind will increase sweetness',
    conclusion: 'Confirmed — 3.0 was noticeably sweeter than 4.0',
    experiment_count: 3,
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-01-22T14:30:00Z',
    ...overrides,
  });

  const createMockExperiment = (overrides: Partial<Experiment> = {}): Experiment => ({
    id: 'exp-1',
    user_id: 'user-1',
    coffee_id: 'coffee-1',
    brew_date: '2026-01-20T10:30:00Z',
    overall_notes: 'Great brew',
    overall_score: 8,
    grind_size: 3.0,
    is_draft: false,
    created_at: '2026-01-20T10:35:00Z',
    updated_at: '2026-01-20T10:35:00Z',
    ...overrides,
  });

  describe('empty state', () => {
    it('renders empty state when no sessions exist', () => {
      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={[]}
          experiments={[]}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Sessions')).toBeInTheDocument();
      expect(screen.getByText(/No sessions yet/)).toBeInTheDocument();
    });

    it('shows New Session button in empty state', () => {
      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={[]}
          experiments={[]}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByRole('button', { name: /New Session/i })).toBeInTheDocument();
    });
  });

  describe('session cards', () => {
    it('renders session cards with name, variable, and experiment count', () => {
      const sessions = [
        createMockSession(),
        createMockSession({
          id: 'session-2',
          name: 'Temperature range test',
          variable_tested: 'water temperature',
          experiment_count: 2,
          hypothesis: 'Higher temp = more brightness',
          conclusion: undefined,
        }),
      ];

      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={sessions}
          experiments={[]}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('Grind size sweep')).toBeInTheDocument();
      expect(screen.getByText('Variable: grind size')).toBeInTheDocument();
      expect(screen.getByText('3 experiments')).toBeInTheDocument();

      expect(screen.getByText('Temperature range test')).toBeInTheDocument();
      expect(screen.getByText('Variable: water temperature')).toBeInTheDocument();
      expect(screen.getByText('2 experiments')).toBeInTheDocument();
    });

    it('renders hypothesis when present', () => {
      const sessions = [createMockSession()];

      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={sessions}
          experiments={[]}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText(/Finer grind will increase sweetness/)).toBeInTheDocument();
    });

    it('renders conclusion when present', () => {
      const sessions = [createMockSession()];

      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={sessions}
          experiments={[]}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText(/Confirmed — 3.0 was noticeably sweeter/)).toBeInTheDocument();
    });

    it('uses singular "experiment" for count of 1', () => {
      const sessions = [createMockSession({ experiment_count: 1 })];

      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={sessions}
          experiments={[]}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByText('1 experiment')).toBeInTheDocument();
    });
  });

  describe('delete session', () => {
    it('opens delete confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      const sessions = [createMockSession()];

      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={sessions}
          experiments={[]}
          onRefresh={mockOnRefresh}
        />
      );

      await user.click(screen.getByTitle('Delete session'));
      expect(screen.getByText('Delete Session')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete "Grind size sweep"/)).toBeInTheDocument();
    });

    it('calls deleteSession and onRefresh when confirmed', async () => {
      const user = userEvent.setup();
      const sessions = [createMockSession()];

      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={sessions}
          experiments={[]}
          onRefresh={mockOnRefresh}
        />
      );

      await user.click(screen.getByTitle('Delete session'));
      await user.click(screen.getByRole('button', { name: /^Delete$/i }));

      await waitFor(() => {
        expect(sessionsApi.deleteSession).toHaveBeenCalledWith('session-1');
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });

    it('does not delete when cancel is clicked', async () => {
      const user = userEvent.setup();
      const sessions = [createMockSession()];

      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={sessions}
          experiments={[]}
          onRefresh={mockOnRefresh}
        />
      );

      await user.click(screen.getByTitle('Delete session'));
      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(sessionsApi.deleteSession).not.toHaveBeenCalled();
    });
  });

  describe('create session dialog', () => {
    it('opens create dialog when New Session button is clicked', async () => {
      const user = userEvent.setup();

      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={[]}
          experiments={[createMockExperiment()]}
          onRefresh={mockOnRefresh}
        />
      );

      await user.click(screen.getByRole('button', { name: /New Session/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Variable Tested/)).toBeInTheDocument();
    });

    it('shows experiment checkboxes in create dialog', async () => {
      const user = userEvent.setup();
      const experiments = [
        createMockExperiment({ id: 'exp-1', grind_size: 3.0, overall_score: 8 }),
        createMockExperiment({ id: 'exp-2', grind_size: 3.5, overall_score: 7, brew_date: '2026-01-19T10:00:00Z' }),
      ];

      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={[]}
          experiments={experiments}
          onRefresh={mockOnRefresh}
        />
      );

      await user.click(screen.getByRole('button', { name: /New Session/i }));
      expect(screen.getByText('Link Experiments')).toBeInTheDocument();
      expect(screen.getByText(/Jan 20.*3 grind.*Score 8/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 19.*3.5 grind.*Score 7/)).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      vi.mocked(sessionsApi.createSession).mockResolvedValue(createMockSession());

      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={[]}
          experiments={[]}
          onRefresh={mockOnRefresh}
        />
      );

      await user.click(screen.getByRole('button', { name: /New Session/i }));
      await user.click(screen.getByRole('button', { name: /Create Session/i }));

      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(sessionsApi.createSession).not.toHaveBeenCalled();
    });

    it('creates session with form data', async () => {
      const user = userEvent.setup();
      vi.mocked(sessionsApi.createSession).mockResolvedValue(createMockSession());

      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={[]}
          experiments={[]}
          onRefresh={mockOnRefresh}
        />
      );

      await user.click(screen.getByRole('button', { name: /New Session/i }));
      await user.type(screen.getByLabelText(/Name/), 'Grind sweep');
      await user.type(screen.getByLabelText(/Variable Tested/), 'grind size');
      await user.type(screen.getByLabelText(/Hypothesis/), 'Finer = sweeter');
      await user.click(screen.getByRole('button', { name: /Create Session/i }));

      await waitFor(() => {
        expect(sessionsApi.createSession).toHaveBeenCalledWith({
          coffee_id: 'coffee-1',
          name: 'Grind sweep',
          variable_tested: 'grind size',
          hypothesis: 'Finer = sweeter',
          experiment_ids: undefined,
        });
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('view session detail', () => {
    it('opens detail modal when view button is clicked', async () => {
      const user = userEvent.setup();
      const sessions = [createMockSession()];

      vi.mocked(sessionsApi.getSession).mockResolvedValue({
        ...createMockSession(),
        experiments: [
          { id: 'exp-1', brew_date: '2026-01-20T10:00:00Z', grind_size: 3.0, overall_score: 8, overall_notes: 'Best balance' },
        ],
      });

      renderWithRouter(
        <SessionList
          coffeeId="coffee-1"
          sessions={sessions}
          experiments={[]}
          onRefresh={mockOnRefresh}
        />
      );

      await user.click(screen.getByTitle('View session'));

      await waitFor(() => {
        expect(sessionsApi.getSession).toHaveBeenCalledWith('session-1');
      });
    });
  });
});
