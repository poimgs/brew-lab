import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExperimentForm from './ExperimentForm';

// Mock the API functions
vi.mock('@/api/experiments', () => ({
  createExperiment: vi.fn(),
  updateExperiment: vi.fn(),
}));

vi.mock('@/api/coffees', () => ({
  listCoffees: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'coffee-1',
        roaster: 'Test Roaster',
        name: 'Test Coffee',
        roast_date: '2025-11-01',
        days_off_roast: 90,
        experiment_count: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'coffee-2',
        roaster: 'Another Roaster',
        name: 'Another Coffee',
        experiment_count: 2,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ],
    pagination: { page: 1, per_page: 5, total: 2, total_pages: 1 },
  }),
}));

vi.mock('@/api/defaults', () => ({
  getDefaults: vi.fn().mockResolvedValue({
    coffee_weight: '15',
    ratio: '15',
    grind_size: '3.5',
    water_temperature: '93',
  }),
}));

vi.mock('@/api/filter-papers', () => ({
  listFilterPapers: vi.fn().mockResolvedValue({
    items: [
      { id: 'filter-1', name: 'Abaca', brand: 'Cafec' },
      { id: 'filter-2', name: 'Origami', brand: 'Origami' },
    ],
    pagination: { page: 1, per_page: 100, total: 2, total_pages: 1 },
  }),
}));

import { createExperiment, updateExperiment } from '@/api/experiments';

const mockOnSuccess = vi.fn();
const mockOnCancel = vi.fn();

const mockExperiment = {
  id: 'exp-1',
  user_id: 'user-1',
  coffee_id: 'coffee-1',
  brew_date: '2026-01-15T10:30:00Z',
  coffee_weight: 15,
  water_weight: 225,
  ratio: 15,
  grind_size: 3.5,
  water_temperature: 93,
  overall_notes: 'A great cup with bright acidity',
  overall_score: 8,
  created_at: '2026-01-15T10:35:00Z',
  updated_at: '2026-01-15T10:35:00Z',
  coffee: {
    id: 'coffee-1',
    roaster: 'Test Roaster',
    name: 'Test Coffee',
    roast_date: '2025-11-01',
  },
  pours: [],
};

describe('ExperimentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders new experiment form when no experiment is provided', async () => {
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByText('New Experiment')).toBeInTheDocument();
      expect(screen.getByText('Coffee *')).toBeInTheDocument();
      expect(screen.getByLabelText(/overall notes/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save experiment/i })).toBeInTheDocument();
    });

    it('renders edit form when experiment is provided', async () => {
      render(
        <ExperimentForm
          experiment={mockExperiment}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Edit Experiment')).toBeInTheDocument();
      expect(screen.getByDisplayValue('A great cup with bright acidity')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('renders all collapsible sections', () => {
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByText('Pre-Brew Variables')).toBeInTheDocument();
      expect(screen.getByText('Brew Variables')).toBeInTheDocument();
      expect(screen.getByText('Post-Brew Variables')).toBeInTheDocument();
      expect(screen.getByText('Quantitative Outcomes')).toBeInTheDocument();
      expect(screen.getByText('Sensory Outcomes')).toBeInTheDocument();
    });
  });

  describe('coffee selector', () => {
    it('shows recent coffees when coffee selector is opened', async () => {
      const user = userEvent.setup();
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Recent')).toBeInTheDocument();
        expect(screen.getByText('Test Coffee')).toBeInTheDocument();
      });
    });

    it('allows selecting a coffee', async () => {
      const user = userEvent.setup();
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Test Coffee')).toBeInTheDocument();
      });

      // Get all buttons with test coffee in the name and click the first one
      const coffeeOptions = screen.getAllByRole('button', { name: /test coffee/i });
      await user.click(coffeeOptions[0]);

      // After selection, the selector should show the coffee name
      await waitFor(() => {
        expect(screen.queryByText('Select a coffee...')).not.toBeInTheDocument();
      });
    });
  });

  describe('collapsible sections', () => {
    it('expands pre-brew section when clicked', async () => {
      const user = userEvent.setup();
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Initially, pre-brew section is collapsed for new experiments
      expect(screen.queryByLabelText(/coffee weight/i)).not.toBeInTheDocument();

      // Click to expand
      const sectionButton = screen.getByRole('button', { name: /pre-brew variables/i });
      await user.click(sectionButton);

      // Now the fields should be visible
      await waitFor(() => {
        expect(screen.getByLabelText(/coffee weight/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/ratio/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/water weight/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/grind size/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/water temperature/i)).toBeInTheDocument();
      });
    });

    it('applies defaults when expanding pre-brew section for new experiment', async () => {
      const user = userEvent.setup();
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Click to expand pre-brew section
      const sectionButton = screen.getByRole('button', { name: /pre-brew variables/i });
      await user.click(sectionButton);

      // Defaults should be applied
      await waitFor(() => {
        expect(screen.getByLabelText(/coffee weight/i)).toHaveValue(15);
        expect(screen.getByLabelText(/ratio/i)).toHaveValue(15);
        expect(screen.getByLabelText(/grind size/i)).toHaveValue(3.5);
        expect(screen.getByLabelText(/water temperature/i)).toHaveValue(93);
      });
    });

    it('expands brew section and shows pours management', async () => {
      const user = userEvent.setup();
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Find the brew variables section by text and click its parent button
      const brewSectionText = screen.getByText('Brew Variables');
      const sectionButton = brewSectionText.closest('button');
      await user.click(sectionButton!);

      await waitFor(() => {
        expect(screen.getByLabelText(/bloom water/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/bloom time/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add pour/i })).toBeInTheDocument();
      });
    });
  });

  describe('validation', () => {
    it('shows error when coffee is not selected', async () => {
      const user = userEvent.setup();
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Fill in notes but don't select coffee
      const notesInput = screen.getByLabelText(/overall notes/i);
      await user.type(notesInput, 'This is a test note that is long enough');

      const submitButton = screen.getByRole('button', { name: /save experiment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/coffee is required/i)).toBeInTheDocument();
      });

      expect(createExperiment).not.toHaveBeenCalled();
    });

    it('shows error when notes are too short', async () => {
      const user = userEvent.setup();
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select a coffee first
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Test Coffee')).toBeInTheDocument();
      });

      const coffeeOption = screen.getByRole('button', { name: /test coffee/i });
      await user.click(coffeeOption);

      // Type short notes
      const notesInput = screen.getByLabelText(/overall notes/i);
      await user.type(notesInput, 'Short');

      const submitButton = screen.getByRole('button', { name: /save experiment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/notes must be at least 10 characters/i)).toBeInTheDocument();
      });

      expect(createExperiment).not.toHaveBeenCalled();
    });
  });

  describe('form submission', () => {
    it('calls createExperiment with minimal required fields', async () => {
      const user = userEvent.setup();
      vi.mocked(createExperiment).mockResolvedValueOnce(mockExperiment);

      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select coffee
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Test Coffee')).toBeInTheDocument();
      });

      const coffeeOption = screen.getByRole('button', { name: /test coffee/i });
      await user.click(coffeeOption);

      // Fill in notes
      const notesInput = screen.getByLabelText(/overall notes/i);
      await user.type(notesInput, 'A wonderful cup with great flavor notes');

      const submitButton = screen.getByRole('button', { name: /save experiment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(createExperiment).toHaveBeenCalledWith(
          expect.objectContaining({
            coffee_id: 'coffee-1',
            overall_notes: 'A wonderful cup with great flavor notes',
          })
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('calls updateExperiment when editing', async () => {
      const user = userEvent.setup();
      vi.mocked(updateExperiment).mockResolvedValueOnce({
        ...mockExperiment,
        overall_notes: 'Updated notes are here now',
      });

      render(
        <ExperimentForm
          experiment={mockExperiment}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      // Update notes
      const notesInput = screen.getByLabelText(/overall notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated notes are here now');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(updateExperiment).toHaveBeenCalledWith(
          'exp-1',
          expect.objectContaining({
            overall_notes: 'Updated notes are here now',
          })
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('shows API error when submission fails', async () => {
      const user = userEvent.setup();
      vi.mocked(createExperiment).mockRejectedValueOnce({
        response: { data: { error: 'Coffee not found' } },
      });

      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Select coffee
      const selector = screen.getByText('Select a coffee...');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Test Coffee')).toBeInTheDocument();
      });

      const coffeeOption = screen.getByRole('button', { name: /test coffee/i });
      await user.click(coffeeOption);

      // Fill in notes
      const notesInput = screen.getByLabelText(/overall notes/i);
      await user.type(notesInput, 'A wonderful cup with great flavor notes');

      const submitButton = screen.getByRole('button', { name: /save experiment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Coffee not found')).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('pours management', () => {
    it('can add pours', async () => {
      const user = userEvent.setup();
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Expand brew section by finding text and clicking its parent button
      const brewSectionText = screen.getByText('Brew Variables');
      const sectionButton = brewSectionText.closest('button');
      await user.click(sectionButton!);

      // Wait for section to expand and add pour button to appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add pour/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add pour/i });
      await user.click(addButton);

      // Verify pour was added - look for the pour number
      await waitFor(() => {
        expect(screen.getByText('1.')).toBeInTheDocument();
      });

      // Add second pour
      await user.click(addButton);

      // Both pours should be visible
      await waitFor(() => {
        expect(screen.getByText('1.')).toBeInTheDocument();
        expect(screen.getByText('2.')).toBeInTheDocument();
      });
    });
  });

  describe('cancel action', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when back button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('overall score slider', () => {
    it('allows setting overall score via slider', async () => {
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // The score slider should be present
      const scoreSlider = screen.getByRole('slider');
      expect(scoreSlider).toBeInTheDocument();

      // Check that the slider has a value attribute
      expect(scoreSlider).toHaveValue('5'); // Default value as string from range input
    });

    it('can clear overall score', async () => {
      const user = userEvent.setup();
      render(<ExperimentForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Get the first clear button (for overall score)
      const clearButtons = screen.getAllByRole('button', { name: /clear/i });
      await user.click(clearButtons[0]);

      // After clearing, should show dash instead of number
      await waitFor(() => {
        expect(screen.getByText('-')).toBeInTheDocument();
      });
    });
  });
});
