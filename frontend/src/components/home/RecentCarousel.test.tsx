import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecentCarousel from './RecentCarousel';
import type { RecentExperiment } from '@/api/dashboard';

// Mock matchMedia for responsive testing
const mockMatchMedia = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });

  window.dispatchEvent(new Event('resize'));
};

describe('RecentCarousel', () => {
  const createMockExperiments = (count: number): RecentExperiment[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `exp-${i + 1}`,
      brew_date: `2026-01-${String(15 - i).padStart(2, '0')}T10:00:00Z`,
      coffee_name: `Coffee ${i + 1}`,
      overall_score: 7 + (i % 3),
      notes: `Notes for coffee ${i + 1}`,
      relative_date: i === 0 ? 'today' : i === 1 ? 'yesterday' : 'this_week',
    }));
  };

  beforeEach(() => {
    // Default to desktop width
    mockMatchMedia(1200);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when experiments array is empty', () => {
      const { container } = render(<RecentCarousel experiments={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders section title', () => {
      const experiments = createMockExperiments(3);
      render(<RecentCarousel experiments={experiments} />);

      expect(screen.getByText('Recent Experiments')).toBeInTheDocument();
    });

    it('renders all experiment cards', () => {
      const experiments = createMockExperiments(3);
      render(<RecentCarousel experiments={experiments} />);

      expect(screen.getByText('Coffee 1')).toBeInTheDocument();
      expect(screen.getByText('Coffee 2')).toBeInTheDocument();
      expect(screen.getByText('Coffee 3')).toBeInTheDocument();
    });
  });

  describe('navigation arrows', () => {
    it('does not show previous arrow at start', () => {
      const experiments = createMockExperiments(5);
      render(<RecentCarousel experiments={experiments} />);

      expect(screen.queryByLabelText('Previous experiments')).not.toBeInTheDocument();
    });

    it('shows next arrow when more items exist', () => {
      const experiments = createMockExperiments(5);
      render(<RecentCarousel experiments={experiments} />);

      expect(screen.getByLabelText('Next experiments')).toBeInTheDocument();
    });

    it('navigates forward when next arrow is clicked', async () => {
      const user = userEvent.setup();
      const experiments = createMockExperiments(5);
      render(<RecentCarousel experiments={experiments} />);

      const nextButton = screen.getByLabelText('Next experiments');
      await user.click(nextButton);

      // After clicking next, the previous button should appear
      expect(screen.getByLabelText('Previous experiments')).toBeInTheDocument();
    });

    it('navigates backward when previous arrow is clicked', async () => {
      const user = userEvent.setup();
      const experiments = createMockExperiments(5);
      render(<RecentCarousel experiments={experiments} />);

      // First go forward
      const nextButton = screen.getByLabelText('Next experiments');
      await user.click(nextButton);

      // Then go back
      const prevButton = screen.getByLabelText('Previous experiments');
      await user.click(prevButton);

      // Should be back at start, no previous button
      expect(screen.queryByLabelText('Previous experiments')).not.toBeInTheDocument();
    });

    it('hides next arrow when at the end', async () => {
      const user = userEvent.setup();
      // 4 experiments with 3 visible = maxIndex of 1
      const experiments = createMockExperiments(4);
      render(<RecentCarousel experiments={experiments} />);

      const nextButton = screen.getByLabelText('Next experiments');
      await user.click(nextButton);

      // At the end now, next should be hidden
      expect(screen.queryByLabelText('Next experiments')).not.toBeInTheDocument();
    });
  });

  describe('dot indicators', () => {
    it('does not show dots when only one page of items', () => {
      // 3 experiments with 3 visible = no navigation needed
      const experiments = createMockExperiments(3);
      render(<RecentCarousel experiments={experiments} />);

      expect(screen.queryByLabelText(/go to slide/i)).not.toBeInTheDocument();
    });

    it('shows dots when multiple pages exist', () => {
      const experiments = createMockExperiments(5);
      render(<RecentCarousel experiments={experiments} />);

      // 5 experiments with 3 visible = maxIndex 2, so 3 dots
      const dots = screen.getAllByLabelText(/go to slide/i);
      expect(dots.length).toBe(3);
    });

    it('limits dots to maximum of 5', () => {
      const experiments = createMockExperiments(10);
      render(<RecentCarousel experiments={experiments} />);

      const dots = screen.getAllByLabelText(/go to slide/i);
      expect(dots.length).toBeLessThanOrEqual(5);
    });

    it('navigates when dot is clicked', async () => {
      const user = userEvent.setup();
      const experiments = createMockExperiments(6);
      render(<RecentCarousel experiments={experiments} />);

      // Click on the last dot
      const dots = screen.getAllByLabelText(/go to slide/i);
      await user.click(dots[dots.length - 1]);

      // Previous button should now be visible
      expect(screen.getByLabelText('Previous experiments')).toBeInTheDocument();
    });

    it('highlights current dot', () => {
      const experiments = createMockExperiments(5);
      render(<RecentCarousel experiments={experiments} />);

      const dots = screen.getAllByLabelText(/go to slide/i);
      // First dot should be teal (active)
      expect(dots[0]).toHaveClass('bg-primary');
      // Other dots should be gray
      expect(dots[1]).toHaveClass('bg-muted');
    });
  });

  describe('touch/swipe handling', () => {
    it('navigates forward on left swipe', () => {
      const experiments = createMockExperiments(5);
      render(<RecentCarousel experiments={experiments} />);

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
      expect(screen.getByLabelText('Previous experiments')).toBeInTheDocument();
    });

    it('navigates backward on right swipe', async () => {
      const user = userEvent.setup();
      const experiments = createMockExperiments(5);
      render(<RecentCarousel experiments={experiments} />);

      // First move forward
      const nextButton = screen.getByLabelText('Next experiments');
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
      expect(screen.queryByLabelText('Previous experiments')).not.toBeInTheDocument();
    });

    it('ignores short swipes', async () => {
      const user = userEvent.setup();
      const experiments = createMockExperiments(5);
      render(<RecentCarousel experiments={experiments} />);

      // First move forward so we can test no navigation on short swipe
      const nextButton = screen.getByLabelText('Next experiments');
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
      expect(screen.getByLabelText('Previous experiments')).toBeInTheDocument();
    });

    it('handles incomplete touch events gracefully', () => {
      const experiments = createMockExperiments(5);
      render(<RecentCarousel experiments={experiments} />);

      const container = screen.getByText('Coffee 1').closest('.overflow-hidden');
      expect(container).not.toBeNull();

      // Touch start without move or end
      fireEvent.touchStart(container!, {
        targetTouches: [{ clientX: 200 }],
      });
      fireEvent.touchEnd(container!);

      // Should not crash, and no navigation should occur
      expect(screen.queryByLabelText('Previous experiments')).not.toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    it('shows 3 cards on desktop (>=1024px)', () => {
      mockMatchMedia(1200);
      const experiments = createMockExperiments(4);
      render(<RecentCarousel experiments={experiments} />);

      // With 4 experiments and 3 visible, maxIndex = 1, so 2 dots
      const dots = screen.getAllByLabelText(/go to slide/i);
      expect(dots.length).toBe(2);
    });

    it('shows 2 cards on tablet (640-1023px)', () => {
      mockMatchMedia(800);
      const experiments = createMockExperiments(4);
      render(<RecentCarousel experiments={experiments} />);

      // With 4 experiments and 2 visible, maxIndex = 2, so 3 dots
      const dots = screen.getAllByLabelText(/go to slide/i);
      expect(dots.length).toBe(3);
    });

    it('shows 1 card on mobile (<640px)', () => {
      mockMatchMedia(500);
      const experiments = createMockExperiments(4);
      render(<RecentCarousel experiments={experiments} />);

      // With 4 experiments and 1 visible, maxIndex = 3, so 4 dots
      const dots = screen.getAllByLabelText(/go to slide/i);
      expect(dots.length).toBe(4);
    });

    it('updates visible cards on window resize', async () => {
      mockMatchMedia(1200); // Start desktop
      const experiments = createMockExperiments(4);
      const { rerender } = render(<RecentCarousel experiments={experiments} />);

      // Desktop: 2 dots (3 visible, maxIndex 1)
      let dots = screen.getAllByLabelText(/go to slide/i);
      expect(dots.length).toBe(2);

      // Resize to mobile
      mockMatchMedia(500);
      rerender(<RecentCarousel experiments={experiments} />);

      // Mobile: 4 dots (1 visible, maxIndex 3)
      dots = screen.getAllByLabelText(/go to slide/i);
      expect(dots.length).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('handles single experiment without errors', () => {
      const experiments = createMockExperiments(1);
      render(<RecentCarousel experiments={experiments} />);

      expect(screen.getByText('Coffee 1')).toBeInTheDocument();
      // No navigation needed
      expect(screen.queryByLabelText(/go to slide/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Next experiments')).not.toBeInTheDocument();
    });

    it('handles exactly visible count experiments', () => {
      mockMatchMedia(1200); // 3 visible
      const experiments = createMockExperiments(3);
      render(<RecentCarousel experiments={experiments} />);

      // No navigation needed
      expect(screen.queryByLabelText(/go to slide/i)).not.toBeInTheDocument();
    });

    it('prevents navigation beyond bounds', async () => {
      const user = userEvent.setup();
      const experiments = createMockExperiments(4);
      render(<RecentCarousel experiments={experiments} />);

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
      expect(screen.queryByLabelText('Previous experiments')).not.toBeInTheDocument();

      // Go to end
      const nextButton = screen.getByLabelText('Next experiments');
      await user.click(nextButton);

      // Try to go beyond end (should do nothing)
      expect(screen.queryByLabelText('Next experiments')).not.toBeInTheDocument();
    });
  });
});
