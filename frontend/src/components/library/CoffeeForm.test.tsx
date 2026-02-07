import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoffeeForm from './CoffeeForm';

// Mock the API functions
vi.mock('@/api/coffees', () => ({
  createCoffee: vi.fn(),
  updateCoffee: vi.fn(),
  getCoffeeSuggestions: vi.fn().mockResolvedValue([]),
}));

import { createCoffee, updateCoffee } from '@/api/coffees';

const mockOnSuccess = vi.fn();
const mockOnCancel = vi.fn();

describe('CoffeeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders add form when no coffee is provided', () => {
      render(<CoffeeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Both the card title and submit button have "Add Coffee" text
      const addCoffeeElements = screen.getAllByText('Add Coffee');
      expect(addCoffeeElements).toHaveLength(2); // Title + button
      expect(screen.getByLabelText(/roaster/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add coffee/i })).toBeInTheDocument();
    });

    it('renders edit form when coffee is provided', () => {
      const coffee = {
        id: '123',
        roaster: 'Test Roaster',
        name: 'Test Coffee',
        country: 'Ethiopia',
        brew_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      render(
        <CoffeeForm
          coffee={coffee}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Edit Coffee')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Roaster')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Coffee')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Ethiopia')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('renders all form sections', () => {
      render(<CoffeeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByText('Origin')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows error when roaster is empty', async () => {
      const user = userEvent.setup();
      render(<CoffeeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const nameInput = screen.getByLabelText(/^name/i);
      await user.type(nameInput, 'Test Coffee');

      const submitButton = screen.getByRole('button', { name: /add coffee/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/roaster is required/i)).toBeInTheDocument();
      });

      expect(createCoffee).not.toHaveBeenCalled();
    });

    it('shows error when name is empty', async () => {
      const user = userEvent.setup();
      render(<CoffeeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const roasterInput = screen.getByLabelText(/roaster/i);
      await user.type(roasterInput, 'Test Roaster');

      const submitButton = screen.getByRole('button', { name: /add coffee/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      expect(createCoffee).not.toHaveBeenCalled();
    });

    it('shows error when roast date is in the future', async () => {
      const user = userEvent.setup();
      render(<CoffeeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/roaster/i), 'Test Roaster');
      await user.type(screen.getByLabelText(/^name/i), 'Test Coffee');

      // Set roast date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const futureDate = tomorrow.toISOString().split('T')[0];

      const roastDateInput = screen.getByLabelText(/roast date/i);
      await user.type(roastDateInput, futureDate);

      const submitButton = screen.getByRole('button', { name: /add coffee/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/roast date cannot be in the future/i)).toBeInTheDocument();
      });

      expect(createCoffee).not.toHaveBeenCalled();
    });

  });

  describe('form submission', () => {
    it('calls createCoffee with form data when creating', async () => {
      const user = userEvent.setup();
      vi.mocked(createCoffee).mockResolvedValueOnce({
        id: 'new-id',
        roaster: 'Test Roaster',
        name: 'Test Coffee',
        brew_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      render(<CoffeeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/roaster/i), 'Test Roaster');
      await user.type(screen.getByLabelText(/^name/i), 'Test Coffee');
      await user.type(screen.getByLabelText(/country/i), 'Ethiopia');

      const submitButton = screen.getByRole('button', { name: /add coffee/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(createCoffee).toHaveBeenCalledWith({
          roaster: 'Test Roaster',
          name: 'Test Coffee',
          country: 'Ethiopia',
          farm: undefined,
          process: undefined,
          roast_level: undefined,
          tasting_notes: undefined,
          roast_date: undefined,
          notes: undefined,
        });
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('calls updateCoffee with form data when editing', async () => {
      const user = userEvent.setup();
      const existingCoffee = {
        id: '123',
        roaster: 'Old Roaster',
        name: 'Old Coffee',
        country: 'Kenya',
        brew_count: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(updateCoffee).mockResolvedValueOnce({
        ...existingCoffee,
        roaster: 'New Roaster',
      });

      render(
        <CoffeeForm
          coffee={existingCoffee}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      const roasterInput = screen.getByLabelText(/roaster/i);
      await user.clear(roasterInput);
      await user.type(roasterInput, 'New Roaster');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(updateCoffee).toHaveBeenCalledWith('123', expect.objectContaining({
          roaster: 'New Roaster',
          name: 'Old Coffee',
          country: 'Kenya',
        }));
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('shows API error when submission fails', async () => {
      const user = userEvent.setup();
      vi.mocked(createCoffee).mockRejectedValueOnce({
        response: { data: { error: 'Coffee already exists' } },
      });

      render(<CoffeeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      await user.type(screen.getByLabelText(/roaster/i), 'Test Roaster');
      await user.type(screen.getByLabelText(/^name/i), 'Test Coffee');

      const submitButton = screen.getByRole('button', { name: /add coffee/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Coffee already exists')).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('cancel action', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<CoffeeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when back button is clicked', async () => {
      const user = userEvent.setup();
      render(<CoffeeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const backButton = screen.getByRole('button', { name: /back to library/i });
      await user.click(backButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});
