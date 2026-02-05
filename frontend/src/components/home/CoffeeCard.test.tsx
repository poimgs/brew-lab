import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CoffeeCard from './CoffeeCard';
import type { RecentCoffee } from '@/api/home';

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('CoffeeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockCoffee = (overrides: Partial<RecentCoffee> = {}): RecentCoffee => ({
    id: 'coffee-123',
    name: 'Kiamaina',
    roaster: 'Cata Coffee',
    last_brewed_at: '2026-01-15T10:30:00Z',
    best_experiment: {
      id: 'exp-456',
      brew_date: '2026-01-15T10:30:00Z',
      overall_score: 8,
      ratio: 15,
      water_temperature: 96,
      filter_paper_name: 'Abaca',
      mineral_profile_name: 'Catalyst',
      bloom_time: 30,
      pour_count: 3,
      pour_styles: ['circular', 'circular', 'center'],
    },
    improvement_note: 'Try finer grind to boost sweetness',
    ...overrides,
  });

  describe('rendering', () => {
    it('renders coffee name and roaster', () => {
      const coffee = createMockCoffee();
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
      expect(screen.getByText('Cata Coffee')).toBeInTheDocument();
    });

    it('renders best experiment score when provided', () => {
      const coffee = createMockCoffee();
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      expect(screen.getByText('8/10')).toBeInTheDocument();
    });

    it('renders dash when overall score is null', () => {
      const coffee = createMockCoffee({
        best_experiment: {
          id: 'exp-456',
          brew_date: '2026-01-15T10:30:00Z',
          overall_score: null,
          pour_count: 0,
          pour_styles: [],
        },
      });
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      expect(screen.getByText('\u2014')).toBeInTheDocument();
    });

    it('renders best brew date', () => {
      const coffee = createMockCoffee();
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      expect(screen.getByText(/Best Brew.*Jan 15/)).toBeInTheDocument();
    });

    it('renders brew parameters line', () => {
      const coffee = createMockCoffee();
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      expect(screen.getByText(/1:15.*96.*C.*Abaca.*Catalyst/)).toBeInTheDocument();
    });

    it('renders pour info', () => {
      const coffee = createMockCoffee();
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      expect(screen.getByText(/Bloom 30s.*3 pours.*circular.*center/)).toBeInTheDocument();
    });

    it('renders improvement note when provided', () => {
      const coffee = createMockCoffee();
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      expect(screen.getByText(/"Try finer grind to boost sweetness"/)).toBeInTheDocument();
    });

    it('renders New Brew button', () => {
      const coffee = createMockCoffee();
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      expect(screen.getByRole('button', { name: /new brew/i })).toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('shows "No experiments yet" when best_experiment is null', () => {
      const coffee = createMockCoffee({
        best_experiment: null,
        improvement_note: null,
      });
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      expect(screen.getByText('No experiments yet')).toBeInTheDocument();
    });

    it('does not render improvement note when null', () => {
      const coffee = createMockCoffee({
        improvement_note: null,
      });
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      expect(screen.queryByText(/Try finer grind/)).not.toBeInTheDocument();
    });

    it('handles missing optional params gracefully', () => {
      const coffee = createMockCoffee({
        best_experiment: {
          id: 'exp-456',
          brew_date: '2026-01-15T10:30:00Z',
          overall_score: 7,
          ratio: null,
          water_temperature: null,
          filter_paper_name: null,
          mineral_profile_name: null,
          bloom_time: null,
          pour_count: 0,
          pour_styles: [],
        },
      });
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      expect(screen.getByText('Kiamaina')).toBeInTheDocument();
      expect(screen.getByText('7/10')).toBeInTheDocument();
      // Should not show empty params line
      expect(screen.queryByText(/1:/)).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('navigates to coffee detail when card is clicked', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee();
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      const card = screen.getByText('Kiamaina').closest('.cursor-pointer');
      await user.click(card!);

      expect(mockNavigate).toHaveBeenCalledWith('/coffees/coffee-123');
    });

    it('navigates to new experiment with coffee_id when New Brew is clicked', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee();
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      const newBrewButton = screen.getByRole('button', { name: /new brew/i });
      await user.click(newBrewButton);

      expect(mockNavigate).toHaveBeenCalledWith('/experiments/new?coffee_id=coffee-123');
    });

    it('New Brew button click does not trigger card navigation', async () => {
      const user = userEvent.setup();
      const coffee = createMockCoffee();
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      const newBrewButton = screen.getByRole('button', { name: /new brew/i });
      await user.click(newBrewButton);

      // Should only have one navigation call
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/experiments/new?coffee_id=coffee-123');
    });
  });

  describe('pour info formatting', () => {
    it('deduplicates pour styles', () => {
      const coffee = createMockCoffee({
        best_experiment: {
          id: 'exp-456',
          brew_date: '2026-01-15T10:30:00Z',
          overall_score: 8,
          bloom_time: 30,
          pour_count: 4,
          pour_styles: ['circular', 'circular', 'circular', 'center'],
        },
      });
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      // Should show "circular, center" not "circular, circular, circular, center"
      expect(screen.getByText(/4 pours \(circular, center\)/)).toBeInTheDocument();
    });

    it('handles empty pour styles', () => {
      const coffee = createMockCoffee({
        best_experiment: {
          id: 'exp-456',
          brew_date: '2026-01-15T10:30:00Z',
          overall_score: 8,
          bloom_time: 30,
          pour_count: 3,
          pour_styles: [],
        },
      });
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      expect(screen.getByText(/3 pours$/)).toBeInTheDocument();
    });

    it('renders only bloom time when pour_count is 0', () => {
      const coffee = createMockCoffee({
        best_experiment: {
          id: 'exp-456',
          brew_date: '2026-01-15T10:30:00Z',
          overall_score: 8,
          bloom_time: 45,
          pour_count: 0,
          pour_styles: [],
        },
      });
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      expect(screen.getByText('Bloom 45s')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies hover styles on the card', () => {
      const coffee = createMockCoffee();
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      const card = screen.getByText('Kiamaina').closest('.cursor-pointer');
      expect(card).toHaveClass('hover:shadow-md');
    });

    it('truncates long coffee names', () => {
      const coffee = createMockCoffee({
        name: 'Very Long Coffee Name From A Faraway Place That Should Be Truncated',
      });
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      const nameElement = screen.getByText(
        'Very Long Coffee Name From A Faraway Place That Should Be Truncated'
      );
      expect(nameElement).toHaveClass('truncate');
    });

    it('truncates long roaster names', () => {
      const coffee = createMockCoffee({
        roaster: 'Very Long Roaster Name That Goes On And On And Should Be Truncated',
      });
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      const roasterElement = screen.getByText(
        'Very Long Roaster Name That Goes On And On And Should Be Truncated'
      );
      expect(roasterElement).toHaveClass('truncate');
    });

    it('limits improvement note to 2 lines', () => {
      const coffee = createMockCoffee({
        improvement_note:
          'This is a very long improvement note that goes on and on and should be clamped to two lines for better visual presentation.',
      });
      renderWithRouter(<CoffeeCard coffee={coffee} />);

      const noteElement = screen.getByText(
        /"This is a very long improvement note that goes on and on and should be clamped to two lines for better visual presentation."/
      );
      expect(noteElement).toHaveClass('line-clamp-2');
    });
  });
});
