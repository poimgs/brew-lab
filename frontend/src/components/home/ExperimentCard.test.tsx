import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExperimentCard from './ExperimentCard';
import type { RecentExperiment } from '@/api/dashboard';

describe('ExperimentCard', () => {
  let mockDate: Date;

  beforeEach(() => {
    // Set a fixed date for consistent testing
    mockDate = new Date('2026-01-15T14:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockExperiment = (
    overrides: Partial<RecentExperiment> = {}
  ): RecentExperiment => ({
    id: 'exp-123',
    brew_date: '2026-01-15T10:30:00Z',
    coffee_name: 'Ethiopia Yirgacheffe',
    overall_score: 8,
    notes: 'Bright and fruity with notes of blueberry and citrus.',
    relative_date: 'today',
    ...overrides,
  });

  describe('rendering', () => {
    it('renders coffee name', () => {
      const experiment = createMockExperiment();
      render(<ExperimentCard experiment={experiment} />);

      expect(screen.getByText('Ethiopia Yirgacheffe')).toBeInTheDocument();
    });

    it('renders overall score when provided', () => {
      const experiment = createMockExperiment({ overall_score: 8 });
      render(<ExperimentCard experiment={experiment} />);

      expect(screen.getByText('8/10')).toBeInTheDocument();
    });

    it('renders dash when overall score is null', () => {
      const experiment = createMockExperiment({ overall_score: null });
      render(<ExperimentCard experiment={experiment} />);

      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('renders notes in quotes when provided', () => {
      const experiment = createMockExperiment({
        notes: 'A lovely cup',
      });
      render(<ExperimentCard experiment={experiment} />);

      expect(screen.getByText('"A lovely cup"')).toBeInTheDocument();
    });

    it('renders dash when notes are empty', () => {
      const experiment = createMockExperiment({ notes: '' });
      render(<ExperimentCard experiment={experiment} />);

      // There will be two dashes - one for notes and potentially one for score
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it('renders dash when notes are undefined', () => {
      const experiment = createMockExperiment({ notes: undefined });
      render(<ExperimentCard experiment={experiment} />);

      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('relative date formatting', () => {
    it('formats "today" with time', () => {
      const experiment = createMockExperiment({
        brew_date: '2026-01-15T10:30:00Z',
        relative_date: 'today',
      });
      render(<ExperimentCard experiment={experiment} />);

      // The time format depends on locale, but it should contain "Today"
      expect(screen.getByText(/Today/)).toBeInTheDocument();
    });

    it('formats "yesterday" with time', () => {
      const experiment = createMockExperiment({
        brew_date: '2026-01-14T15:00:00Z',
        relative_date: 'yesterday',
      });
      render(<ExperimentCard experiment={experiment} />);

      expect(screen.getByText(/Yesterday/)).toBeInTheDocument();
    });

    it('formats "this_week" with day name and time', () => {
      const experiment = createMockExperiment({
        brew_date: '2026-01-12T09:00:00Z', // A Sunday
        relative_date: 'this_week',
      });
      render(<ExperimentCard experiment={experiment} />);

      // Should show a weekday name like "Sunday" or "Monday"
      const dateElement = screen.getByText(/day,/i);
      expect(dateElement).toBeInTheDocument();
    });

    it('formats "earlier" with short date', () => {
      const experiment = createMockExperiment({
        brew_date: '2026-01-05T09:00:00Z',
        relative_date: 'earlier',
      });
      render(<ExperimentCard experiment={experiment} />);

      // Should show short date like "Jan 5"
      expect(screen.getByText(/Jan/)).toBeInTheDocument();
    });

    it('handles unknown relative_date with default formatting', () => {
      const experiment = createMockExperiment({
        brew_date: '2026-01-10T09:00:00Z',
        // Type assertion to test fallback behavior
        relative_date: 'unknown' as RecentExperiment['relative_date'],
      });
      render(<ExperimentCard experiment={experiment} />);

      // Should fall through to default locale date string
      // This should render something (the fallback date format)
      const card = screen.getByText('Ethiopia Yirgacheffe').closest('.flex-shrink-0');
      expect(card).toBeInTheDocument();
    });
  });

  describe('truncation and styling', () => {
    it('truncates long coffee names with CSS', () => {
      const experiment = createMockExperiment({
        coffee_name: 'Very Long Coffee Name From A Faraway Place That Should Be Truncated',
      });
      render(<ExperimentCard experiment={experiment} />);

      const nameElement = screen.getByText(
        'Very Long Coffee Name From A Faraway Place That Should Be Truncated'
      );
      expect(nameElement).toHaveClass('truncate');
    });

    it('limits notes to 2 lines with line-clamp', () => {
      const experiment = createMockExperiment({
        notes: 'This is a very long note that goes on and on describing the coffee in great detail.',
      });
      render(<ExperimentCard experiment={experiment} />);

      const notesElement = screen.getByText(
        /"This is a very long note that goes on and on describing the coffee in great detail."/
      );
      expect(notesElement).toHaveClass('line-clamp-2');
    });

    it('renders with responsive card dimensions', () => {
      const experiment = createMockExperiment();
      render(<ExperimentCard experiment={experiment} />);

      const card = screen.getByText('Ethiopia Yirgacheffe').closest('.flex-shrink-0');
      expect(card).toHaveClass('w-full');
      expect(card).toHaveClass('min-h-[160px]');
    });
  });
});
