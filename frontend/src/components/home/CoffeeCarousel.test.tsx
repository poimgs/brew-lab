import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CoffeeCarousel from './CoffeeCarousel';
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

// Mock matchMedia for responsive testing
const mockMatchMedia = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });

  window.dispatchEvent(new Event('resize'));
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('CoffeeCarousel', () => {
  const createMockCoffees = (count: number): RecentCoffee[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `coffee-${i + 1}`,
      name: `Coffee ${i + 1}`,
      roaster: `Roaster ${i + 1}`,
      last_brewed_at: `2026-01-${String(15 - i).padStart(2, '0')}T10:00:00Z`,
      best_experiment: {
        id: `exp-${i + 1}`,
        brew_date: `2026-01-${String(15 - i).padStart(2, '0')}T10:00:00Z`,
        overall_score: 7 + (i % 3),
        ratio: 15,
        water_temperature: 96,
        bloom_time: 30,
        pour_count: 3,
        pour_styles: ['circular'],
      },
      improvement_note: i % 2 === 0 ? `Try something new for coffee ${i + 1}` : null,
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to desktop width
    mockMatchMedia(1200);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when coffees array is empty', () => {
      const { container } = renderWithRouter(<CoffeeCarousel coffees={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders section title', () => {
      const coffees = createMockCoffees(3);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      expect(screen.getByText('Recently Brewed Coffees')).toBeInTheDocument();
    });

    it('renders all coffee cards', () => {
      const coffees = createMockCoffees(3);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      expect(screen.getByText('Coffee 1')).toBeInTheDocument();
      expect(screen.getByText('Coffee 2')).toBeInTheDocument();
      expect(screen.getByText('Coffee 3')).toBeInTheDocument();
    });

    it('renders roaster for each coffee', () => {
      const coffees = createMockCoffees(3);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      expect(screen.getByText('Roaster 1')).toBeInTheDocument();
      expect(screen.getByText('Roaster 2')).toBeInTheDocument();
      expect(screen.getByText('Roaster 3')).toBeInTheDocument();
    });
  });

  describe('navigation arrows', () => {
    it('does not show previous arrow at start', () => {
      const coffees = createMockCoffees(5);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      expect(screen.queryByLabelText('Previous coffees')).not.toBeInTheDocument();
    });

    it('shows next arrow when more items exist', () => {
      const coffees = createMockCoffees(5);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      expect(screen.getByLabelText('Next coffees')).toBeInTheDocument();
    });

    it('navigates forward when next arrow is clicked', async () => {
      const user = userEvent.setup();
      const coffees = createMockCoffees(5);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      const nextButton = screen.getByLabelText('Next coffees');
      await user.click(nextButton);

      // After clicking next, the previous button should appear
      expect(screen.getByLabelText('Previous coffees')).toBeInTheDocument();
    });

    it('navigates backward when previous arrow is clicked', async () => {
      const user = userEvent.setup();
      const coffees = createMockCoffees(5);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      // First go forward
      const nextButton = screen.getByLabelText('Next coffees');
      await user.click(nextButton);

      // Then go back
      const prevButton = screen.getByLabelText('Previous coffees');
      await user.click(prevButton);

      // Should be back at start, no previous button
      expect(screen.queryByLabelText('Previous coffees')).not.toBeInTheDocument();
    });

    it('hides next arrow when at the end', async () => {
      const user = userEvent.setup();
      // 4 coffees with 3 visible = maxIndex of 1
      const coffees = createMockCoffees(4);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      const nextButton = screen.getByLabelText('Next coffees');
      await user.click(nextButton);

      // At the end now, next should be hidden
      expect(screen.queryByLabelText('Next coffees')).not.toBeInTheDocument();
    });
  });

  describe('dot indicators', () => {
    it('does not show dots when only one page of items', () => {
      // 3 coffees with 3 visible = no navigation needed
      const coffees = createMockCoffees(3);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      expect(screen.queryByLabelText(/go to slide/i)).not.toBeInTheDocument();
    });

    it('shows dots when multiple pages exist', () => {
      const coffees = createMockCoffees(5);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      // 5 coffees with 3 visible = maxIndex 2, so 3 dots
      const dots = screen.getAllByLabelText(/go to slide/i);
      expect(dots.length).toBe(3);
    });

    it('limits dots to maximum of 5', () => {
      const coffees = createMockCoffees(10);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      const dots = screen.getAllByLabelText(/go to slide/i);
      expect(dots.length).toBeLessThanOrEqual(5);
    });

    it('navigates when dot is clicked', async () => {
      const user = userEvent.setup();
      const coffees = createMockCoffees(6);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      // Click on the last dot
      const dots = screen.getAllByLabelText(/go to slide/i);
      await user.click(dots[dots.length - 1]);

      // Previous button should now be visible
      expect(screen.getByLabelText('Previous coffees')).toBeInTheDocument();
    });

    it('highlights current dot', () => {
      const coffees = createMockCoffees(5);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      const dots = screen.getAllByLabelText(/go to slide/i);
      // First dot should be teal (active)
      expect(dots[0]).toHaveClass('bg-teal-600');
      // Other dots should be gray
      expect(dots[1]).toHaveClass('bg-gray-300');
    });
  });

  describe('touch/swipe handling', () => {
    it('navigates forward on left swipe', () => {
      const coffees = createMockCoffees(5);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      const container = screen.getByText('Coffee 1').closest('.overflow-hidden');
      expect(container).not.toBeNull();

      // Simulate swipe left (touch start -> move -> end)
      fireEvent.touchStart(container!, {
        targetTouches: [{ clientX: 200 }],
      });
      fireEvent.touchMove(container!, {
        targetTouches: [{ clientX: 100 }],
      });
      fireEvent.touchEnd(container!);

      // After swipe left, previous button should appear
      expect(screen.getByLabelText('Previous coffees')).toBeInTheDocument();
    });

    it('navigates backward on right swipe', async () => {
      const user = userEvent.setup();
      const coffees = createMockCoffees(5);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      // First move forward
      const nextButton = screen.getByLabelText('Next coffees');
      await user.click(nextButton);

      const container = screen.getByText('Coffee 1').closest('.overflow-hidden');
      expect(container).not.toBeNull();

      // Simulate swipe right (touch start -> move -> end)
      fireEvent.touchStart(container!, {
        targetTouches: [{ clientX: 100 }],
      });
      fireEvent.touchMove(container!, {
        targetTouches: [{ clientX: 200 }],
      });
      fireEvent.touchEnd(container!);

      // After swipe right, should be back at start
      expect(screen.queryByLabelText('Previous coffees')).not.toBeInTheDocument();
    });

    it('ignores short swipes', async () => {
      const user = userEvent.setup();
      const coffees = createMockCoffees(5);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      // First move forward so we can test no navigation on short swipe
      const nextButton = screen.getByLabelText('Next coffees');
      await user.click(nextButton);

      const container = screen.getByText('Coffee 1').closest('.overflow-hidden');
      expect(container).not.toBeNull();

      // Simulate very short swipe (less than 50px)
      fireEvent.touchStart(container!, {
        targetTouches: [{ clientX: 100 }],
      });
      fireEvent.touchMove(container!, {
        targetTouches: [{ clientX: 120 }], // Only 20px movement
      });
      fireEvent.touchEnd(container!);

      // Should still have previous button (didn't navigate back)
      expect(screen.getByLabelText('Previous coffees')).toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    it('shows 3 cards on desktop (>=1024px)', () => {
      mockMatchMedia(1200);
      const coffees = createMockCoffees(4);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      // With 4 coffees and 3 visible, maxIndex = 1, so 2 dots
      const dots = screen.getAllByLabelText(/go to slide/i);
      expect(dots.length).toBe(2);
    });

    it('shows 2 cards on tablet (640-1023px)', () => {
      mockMatchMedia(800);
      const coffees = createMockCoffees(4);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      // With 4 coffees and 2 visible, maxIndex = 2, so 3 dots
      const dots = screen.getAllByLabelText(/go to slide/i);
      expect(dots.length).toBe(3);
    });

    it('shows 1 card on mobile (<640px)', () => {
      mockMatchMedia(500);
      const coffees = createMockCoffees(4);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      // With 4 coffees and 1 visible, maxIndex = 3, so 4 dots
      const dots = screen.getAllByLabelText(/go to slide/i);
      expect(dots.length).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('handles single coffee without errors', () => {
      const coffees = createMockCoffees(1);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      expect(screen.getByText('Coffee 1')).toBeInTheDocument();
      // No navigation needed
      expect(screen.queryByLabelText(/go to slide/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Next coffees')).not.toBeInTheDocument();
    });

    it('handles exactly visible count coffees', () => {
      mockMatchMedia(1200); // 3 visible
      const coffees = createMockCoffees(3);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      // No navigation needed
      expect(screen.queryByLabelText(/go to slide/i)).not.toBeInTheDocument();
    });

    it('prevents navigation beyond bounds', async () => {
      const user = userEvent.setup();
      const coffees = createMockCoffees(4);
      renderWithRouter(<CoffeeCarousel coffees={coffees} />);

      // Try to go back from start (should do nothing)
      const container = screen.getByText('Coffee 1').closest('.overflow-hidden');
      fireEvent.touchStart(container!, {
        targetTouches: [{ clientX: 100 }],
      });
      fireEvent.touchMove(container!, {
        targetTouches: [{ clientX: 200 }],
      });
      fireEvent.touchEnd(container!);

      // Should still be at start
      expect(screen.queryByLabelText('Previous coffees')).not.toBeInTheDocument();

      // Go to end
      const nextButton = screen.getByLabelText('Next coffees');
      await user.click(nextButton);

      // Try to go beyond end (should do nothing)
      expect(screen.queryByLabelText('Next coffees')).not.toBeInTheDocument();
    });
  });
});
