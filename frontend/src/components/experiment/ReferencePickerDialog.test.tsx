import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReferencePickerDialog from './ReferencePickerDialog';
import type { Experiment } from '@/api/experiments';

// Polyfills required by Radix UI Dialog in jsdom
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const createMockExperiment = (overrides: Partial<Experiment> = {}): Experiment => ({
  id: 'exp-1',
  user_id: 'user-1',
  coffee_id: 'coffee-1',
  brew_date: '2026-01-15T10:30:00Z',
  overall_notes: 'Test notes',
  is_draft: false,
  created_at: '2026-01-15T10:30:00Z',
  updated_at: '2026-01-15T10:30:00Z',
  ...overrides,
});

describe('ReferencePickerDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog with title and description when open', () => {
    render(
      <ReferencePickerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        experiments={[]}
        isLoading={false}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Select Reference Brew')).toBeInTheDocument();
    expect(screen.getByText(/Choose an experiment to use as reference/)).toBeInTheDocument();
  });

  it('shows loading skeletons when isLoading is true', () => {
    render(
      <ReferencePickerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        experiments={[]}
        isLoading={true}
        onSelect={mockOnSelect}
      />
    );

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('shows empty state when no experiments exist', () => {
    render(
      <ReferencePickerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        experiments={[]}
        isLoading={false}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('No experiments found for this coffee.')).toBeInTheDocument();
  });

  it('displays experiment dates and scores', () => {
    const experiments = [
      createMockExperiment({ id: 'exp-1', brew_date: '2026-01-15T10:30:00Z', overall_score: 8 }),
      createMockExperiment({ id: 'exp-2', brew_date: '2026-01-12T10:30:00Z', overall_score: 7 }),
    ];

    render(
      <ReferencePickerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        experiments={experiments}
        isLoading={false}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Jan 15, 2026')).toBeInTheDocument();
    expect(screen.getByText('Jan 12, 2026')).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
    expect(screen.getByText('7/10')).toBeInTheDocument();
  });

  it('displays experiment parameters (grind, ratio, temp)', () => {
    const experiments = [
      createMockExperiment({
        id: 'exp-1',
        grind_size: 3.5,
        ratio: 15,
        water_temperature: 96,
      }),
    ];

    render(
      <ReferencePickerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        experiments={experiments}
        isLoading={false}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Grind: 3.5')).toBeInTheDocument();
    expect(screen.getByText('Ratio: 1:15')).toBeInTheDocument();
    expect(screen.getByText('Temp: 96°C')).toBeInTheDocument();
  });

  it('shows checkmark on current reference experiment', () => {
    const experiments = [
      createMockExperiment({ id: 'exp-1' }),
      createMockExperiment({ id: 'exp-2', brew_date: '2026-01-12T10:30:00Z' }),
    ];

    render(
      <ReferencePickerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        experiments={experiments}
        currentReferenceId="exp-1"
        isLoading={false}
        onSelect={mockOnSelect}
      />
    );

    // The checkmark icon (rendered as SVG by lucide-react) should be in the first experiment row
    const buttons = screen.getAllByRole('button').filter(btn => btn.textContent?.includes('Jan'));
    // First button (exp-1, current reference) should contain an SVG (the Check icon)
    const firstButtonSvgs = buttons[0].querySelectorAll('svg');
    expect(firstButtonSvgs.length).toBe(1);
    // Second button (exp-2) should not have the check SVG
    const secondButtonSvgs = buttons[1].querySelectorAll('svg');
    expect(secondButtonSvgs.length).toBe(0);
  });

  it('calls onSelect and closes when an experiment is clicked', async () => {
    const user = userEvent.setup();
    const experiments = [
      createMockExperiment({ id: 'exp-1', overall_score: 8 }),
    ];

    render(
      <ReferencePickerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        experiments={experiments}
        isLoading={false}
        onSelect={mockOnSelect}
      />
    );

    await user.click(screen.getByText('Jan 15, 2026'));

    expect(mockOnSelect).toHaveBeenCalledWith(experiments[0]);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render when open is false', () => {
    render(
      <ReferencePickerDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        experiments={[]}
        isLoading={false}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.queryByText('Select Reference Brew')).not.toBeInTheDocument();
  });

  it('omits parameters that are not set', () => {
    const experiments = [
      createMockExperiment({ id: 'exp-1' }),
    ];

    render(
      <ReferencePickerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        experiments={experiments}
        isLoading={false}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.queryByText(/Grind:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ratio:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Temp:/)).not.toBeInTheDocument();
  });
});
