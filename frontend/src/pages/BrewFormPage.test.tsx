import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock BrewForm so we can verify it receives the right props
const mockBrewForm = vi.fn((_props?: unknown) => <div data-testid="brew-form">BrewForm</div>);
vi.mock('@/components/brew/BrewForm', () => ({
  default: (props: unknown) => mockBrewForm(props),
}));

const mockGetBrew = vi.fn();
vi.mock('@/api/brews', () => ({
  getBrew: (...args: unknown[]) => mockGetBrew(...args),
}));

// Import after mocks are set up
import BrewFormPage from './BrewFormPage';

function renderAtRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/brews/new" element={<BrewFormPage />} />
        <Route path="/brews/:id/edit" element={<BrewFormPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const mockBrew = {
  id: 'brew-1',
  user_id: 'user-1',
  coffee_id: 'coffee-1',
  brew_date: '2026-01-15T10:30:00Z',
  is_draft: false,
  overall_notes: 'Good brew',
  created_at: '2026-01-15T10:35:00Z',
  updated_at: '2026-01-15T10:35:00Z',
};

describe('BrewFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBrew.mockResolvedValue(mockBrew);
  });

  it('renders BrewForm without brew prop in create mode', async () => {
    renderAtRoute('/brews/new');

    await waitFor(() => {
      expect(screen.getByTestId('brew-form')).toBeInTheDocument();
    });
    // Should NOT have fetched any brew
    expect(mockGetBrew).not.toHaveBeenCalled();
    // BrewForm should be called without a brew prop
    expect(mockBrewForm).toHaveBeenCalledWith(
      expect.objectContaining({ brew: undefined })
    );
  });

  it('fetches brew and passes it to BrewForm in edit mode', async () => {
    renderAtRoute('/brews/brew-1/edit');

    // Should show loading initially
    await waitFor(() => {
      expect(mockGetBrew).toHaveBeenCalledWith('brew-1');
    });

    // After loading, should render BrewForm with the brew
    await waitFor(() => {
      expect(mockBrewForm).toHaveBeenCalledWith(
        expect.objectContaining({ brew: mockBrew })
      );
    });
  });

  it('shows error when brew fails to load in edit mode', async () => {
    mockGetBrew.mockRejectedValue(new Error('Not found'));

    renderAtRoute('/brews/brew-1/edit');

    await waitFor(() => {
      expect(screen.getByText('Failed to load brew')).toBeInTheDocument();
    });
  });

  it('shows loading spinner while fetching brew in edit mode', async () => {
    // Make getBrew hang
    mockGetBrew.mockReturnValue(new Promise(() => {}));

    renderAtRoute('/brews/brew-1/edit');

    // Should show spinner
    expect(document.querySelector('.animate-spin')).not.toBeNull();
    // Should NOT show the form yet
    expect(screen.queryByTestId('brew-form')).not.toBeInTheDocument();
  });
});
