import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReferenceSidebar from './ReferenceSidebar';
import type { CoffeeReference, ReferenceExperiment, CoffeeGoalSummary } from '@/api/coffees';

describe('ReferenceSidebar', () => {
  const mockOnCopyParameters = vi.fn();
  const mockOnEditGoals = vi.fn();
  const mockOnChangeReference = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockExperiment = (overrides: Partial<ReferenceExperiment> = {}): ReferenceExperiment => ({
    id: 'exp-123',
    brew_date: '2026-01-15T10:30:00Z',
    coffee_weight: 15,
    water_weight: 225,
    ratio: 15,
    grind_size: 3.5,
    water_temperature: 96,
    filter_paper: {
      id: 'fp-123',
      name: 'Abaca',
      brand: 'Cafec',
    },
    bloom_water: 40,
    bloom_time: 30,
    total_brew_time: 165,
    tds: 1.38,
    extraction_yield: 20.1,
    overall_score: 8,
    is_best: true,
    ...overrides,
  });

  const createMockGoals = (overrides: Partial<CoffeeGoalSummary> = {}): CoffeeGoalSummary => ({
    id: 'goal-123',
    coffee_ml: 180,
    tds: 1.4,
    extraction_yield: 21,
    brightness_intensity: 7,
    sweetness_intensity: 8,
    overall_score: 9,
    ...overrides,
  });

  const createMockReference = (overrides: Partial<CoffeeReference> = {}): CoffeeReference => ({
    experiment: createMockExperiment(),
    goals: createMockGoals(),
    ...overrides,
  });

  describe('loading state', () => {
    it('shows loading skeleton when isLoading is true', () => {
      render(
        <ReferenceSidebar
          reference={null}
          isLoading={true}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('null reference', () => {
    it('renders nothing when reference is null and not loading', () => {
      const { container } = render(
        <ReferenceSidebar
          reference={null}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('empty reference (no experiments)', () => {
    it('shows empty state message when no experiments exist', () => {
      const reference: CoffeeReference = {
        experiment: null,
        goals: null,
      };

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('Reference')).toBeInTheDocument();
      expect(screen.getByText(/No experiments yet/)).toBeInTheDocument();
    });
  });

  describe('experiment display', () => {
    it('displays reference brew indicator when is_best is true', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('Reference Brew')).toBeInTheDocument();
    });

    it('displays latest brew indicator when is_best is false', () => {
      const reference = createMockReference({
        experiment: createMockExperiment({ is_best: false }),
      });

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('Latest Brew')).toBeInTheDocument();
    });

    it('displays formatted brew date', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('Jan 15, 2026')).toBeInTheDocument();
    });

    it('displays coffee weight', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('15g')).toBeInTheDocument();
    });

    it('displays ratio', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('1:15')).toBeInTheDocument();
    });

    it('displays water weight', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('225g')).toBeInTheDocument();
    });

    it('displays grind size', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('3.5')).toBeInTheDocument();
    });

    it('displays water temperature', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('96°C')).toBeInTheDocument();
    });

    it('displays filter paper with brand', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('Abaca (Cafec)')).toBeInTheDocument();
    });

    it('displays bloom info', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('40g / 30s')).toBeInTheDocument();
    });

    it('displays total brew time formatted', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('2:45')).toBeInTheDocument();
    });

    it('displays TDS', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('1.38%')).toBeInTheDocument();
    });

    it('displays extraction yield', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('20.1%')).toBeInTheDocument();
    });

    it('displays overall score', () => {
      const reference = createMockReference({
        goals: null, // Remove goals to avoid duplicate scores
      });

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('8/10')).toBeInTheDocument();
    });

    it('omits parameters that are null', () => {
      const reference = createMockReference({
        experiment: createMockExperiment({
          tds: undefined,
          extraction_yield: undefined,
          overall_score: undefined,
        }),
        goals: null, // Remove goals to test experiment section only
      });

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      // Labels for outcomes should not exist when values are null
      const scoreLabel = screen.queryByText('Score');
      expect(scoreLabel).not.toBeInTheDocument();
    });
  });

  describe('goals display', () => {
    it('displays target goals section header', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('Target Goals')).toBeInTheDocument();
    });

    it('displays goal values', () => {
      // Use a reference with only goals (no experiment) to avoid duplicate values
      const reference: CoffeeReference = {
        experiment: null,
        goals: createMockGoals(),
      };

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      // Goals values - since no experiment, these are unique
      expect(screen.getByText('1.4%')).toBeInTheDocument(); // TDS goal
      expect(screen.getByText('21%')).toBeInTheDocument(); // Extraction goal
      expect(screen.getByText('7/10')).toBeInTheDocument(); // Brightness
      expect(screen.getByText('8/10')).toBeInTheDocument(); // Sweetness
      expect(screen.getByText('9/10')).toBeInTheDocument(); // Overall
    });

    it('shows no goals message when goals are empty', () => {
      const reference = createMockReference({
        goals: createMockGoals({
          coffee_ml: undefined,
          tds: undefined,
          extraction_yield: undefined,
          brightness_intensity: undefined,
          sweetness_intensity: undefined,
          cleanliness_intensity: undefined,
          body_intensity: undefined,
          flavor_intensity: undefined,
          overall_score: undefined,
          aroma_intensity: undefined,
          complexity_intensity: undefined,
          balance_intensity: undefined,
          aftertaste_intensity: undefined,
        }),
      });

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('No goals set yet.')).toBeInTheDocument();
    });

    it('shows only goals when no experiment exists', () => {
      const reference: CoffeeReference = {
        experiment: null,
        goals: createMockGoals(),
      };

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('Target Goals')).toBeInTheDocument();
      expect(screen.queryByText('Copy Parameters')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onCopyParameters when copy button is clicked', async () => {
      const user = userEvent.setup();
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      const copyButton = screen.getByRole('button', { name: /Copy Parameters/i });
      await user.click(copyButton);

      expect(mockOnCopyParameters).toHaveBeenCalledWith(reference.experiment);
    });

    it('calls onEditGoals when edit button is clicked', async () => {
      const user = userEvent.setup();
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
          onEditGoals={mockOnEditGoals}
        />
      );

      // Find the edit button next to Target Goals
      const editButtons = screen.getAllByRole('button');
      const editGoalsButton = editButtons.find(btn =>
        btn.querySelector('svg.lucide-pencil')
      );

      if (editGoalsButton) {
        await user.click(editGoalsButton);
        expect(mockOnEditGoals).toHaveBeenCalled();
      }
    });

    it('collapses and expands when header is clicked', async () => {
      const user = userEvent.setup();
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      // Initially expanded, should show content
      expect(screen.getByText('15g')).toBeInTheDocument();

      // Click to collapse
      const header = screen.getByRole('button', { name: 'Reference' });
      await user.click(header);

      // Content should be hidden
      expect(screen.queryByText('15g')).not.toBeInTheDocument();

      // Click to expand again
      await user.click(header);

      // Content should be visible again
      expect(screen.getByText('15g')).toBeInTheDocument();
    });
  });

  describe('change reference button', () => {
    it('shows Change button when onChangeReference is provided and experiment exists', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
          onChangeReference={mockOnChangeReference}
        />
      );

      expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
    });

    it('does not show Change button when onChangeReference is not provided', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
    });

    it('does not show Change button when no experiment exists', () => {
      const reference: CoffeeReference = {
        experiment: null,
        goals: createMockGoals(),
      };

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
          onChangeReference={mockOnChangeReference}
        />
      );

      expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
    });

    it('calls onChangeReference when Change button is clicked', async () => {
      const user = userEvent.setup();
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
          onChangeReference={mockOnChangeReference}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Change' }));
      expect(mockOnChangeReference).toHaveBeenCalled();
    });

    it('Change button click does not toggle collapse', async () => {
      const user = userEvent.setup();
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
          onChangeReference={mockOnChangeReference}
        />
      );

      // Content should be visible
      expect(screen.getByText('15g')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Change' }));

      // Content should still be visible (not collapsed)
      expect(screen.getByText('15g')).toBeInTheDocument();
    });
  });

  describe('embedded mode', () => {
    it('renders content without border wrapper in embedded mode', () => {
      const reference = createMockReference();

      const { container } = render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
          embedded
        />
      );

      // Should not have the border rounded-lg wrapper
      expect(container.querySelector('.border.rounded-lg')).not.toBeInTheDocument();
      // Content should still render
      expect(screen.getByText('15g')).toBeInTheDocument();
    });

    it('does not show collapse toggle in embedded mode', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
          embedded
        />
      );

      // The collapse toggle button with "Reference" text should not be present
      expect(screen.queryByRole('button', { name: 'Reference' })).not.toBeInTheDocument();
    });

    it('shows Change button in embedded mode when provided', () => {
      const reference = createMockReference();

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
          onChangeReference={mockOnChangeReference}
          embedded
        />
      );

      expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
    });

    it('shows loading without border in embedded mode', () => {
      const { container } = render(
        <ReferenceSidebar
          reference={null}
          isLoading={true}
          onCopyParameters={mockOnCopyParameters}
          embedded
        />
      );

      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
      expect(container.querySelector('.border.rounded-lg')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles experiment without filter paper', () => {
      const reference = createMockReference({
        experiment: createMockExperiment({
          filter_paper: undefined,
        }),
      });

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.queryByText('Abaca')).not.toBeInTheDocument();
    });

    it('handles filter paper without brand', () => {
      const reference = createMockReference({
        experiment: createMockExperiment({
          filter_paper: {
            id: 'fp-123',
            name: 'Generic',
            brand: undefined,
          },
        }),
      });

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('Generic')).toBeInTheDocument();
      expect(screen.queryByText('(Cafec)')).not.toBeInTheDocument();
    });

    it('handles bloom with only water', () => {
      const reference = createMockReference({
        experiment: createMockExperiment({
          bloom_water: 40,
          bloom_time: undefined,
        }),
      });

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('40g')).toBeInTheDocument();
    });

    it('handles bloom with only time', () => {
      const reference = createMockReference({
        experiment: createMockExperiment({
          bloom_water: undefined,
          bloom_time: 30,
        }),
      });

      render(
        <ReferenceSidebar
          reference={reference}
          isLoading={false}
          onCopyParameters={mockOnCopyParameters}
        />
      );

      expect(screen.getByText('30s')).toBeInTheDocument();
    });
  });
});
