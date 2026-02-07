import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import PostBrewStep from './PostBrewStep';
import type { MineralProfile } from '@/api/mineral-profiles';

// Polyfill DOM methods for Radix UI Select in jsdom
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

const mockProfiles: MineralProfile[] = [
  {
    id: 'mp-1',
    name: 'Barista Hustle #4',
    brand: 'Barista Hustle',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'mp-2',
    name: 'Third Wave Water',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

function PostBrewStepWrapper({
  defaultValues = {},
  mineralProfiles = mockProfiles,
}: {
  defaultValues?: Record<string, unknown>;
  mineralProfiles?: MineralProfile[];
}) {
  const methods = useForm({
    defaultValues: {
      water_bypass_ml: null,
      mineral_profile_id: null,
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...methods}>
      <form>
        <PostBrewStep mineralProfiles={mineralProfiles} />
        <output data-testid="mineral-value">
          {methods.watch('mineral_profile_id') ?? 'null'}
        </output>
      </form>
    </FormProvider>
  );
}

describe('PostBrewStep', () => {
  describe('rendering', () => {
    it('renders heading and both fields', () => {
      render(<PostBrewStepWrapper />);

      expect(screen.getByText('Post-Brew Variables')).toBeInTheDocument();
      expect(screen.getByLabelText('Water Bypass (ml)')).toBeInTheDocument();
      expect(screen.getByText('Mineral Profile')).toBeInTheDocument();
    });

    it('renders water bypass as a number input', () => {
      render(<PostBrewStepWrapper />);

      const input = screen.getByLabelText('Water Bypass (ml)');
      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveAttribute('placeholder', 'e.g., 30');
    });

    it('renders helper text for both fields', () => {
      render(<PostBrewStepWrapper />);

      expect(screen.getByText(/amount of water added after brewing/i)).toBeInTheDocument();
      expect(screen.getByText(/mineral additions used in the brew water/i)).toBeInTheDocument();
    });
  });

  describe('mineral profile dropdown', () => {
    it('defaults to "None" when no profile is selected', () => {
      render(<PostBrewStepWrapper />);

      // When mineral_profile_id is null, the combobox should show "None"
      expect(screen.getByRole('combobox')).toHaveTextContent('None');
    });

    it('shows "None" as the first option in the dropdown', async () => {
      const user = userEvent.setup();
      render(<PostBrewStepWrapper />);

      await user.click(screen.getByRole('combobox'));

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveTextContent('None');
    });

    it('lists all provided mineral profiles after None', async () => {
      const user = userEvent.setup();
      render(<PostBrewStepWrapper />);

      await user.click(screen.getByRole('combobox'));

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3); // None + 2 profiles
      expect(options[1]).toHaveTextContent('Barista Hustle #4');
      expect(options[2]).toHaveTextContent('Third Wave Water');
    });

    it('shows brand in parentheses when available', async () => {
      const user = userEvent.setup();
      render(<PostBrewStepWrapper />);

      await user.click(screen.getByRole('combobox'));

      expect(screen.getByRole('option', { name: 'Barista Hustle #4 (Barista Hustle)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Third Wave Water' })).toBeInTheDocument();
    });

    it('selecting a profile sets the form value', async () => {
      const user = userEvent.setup();
      render(<PostBrewStepWrapper />);

      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: /Barista Hustle #4/i }));

      expect(screen.getByTestId('mineral-value')).toHaveTextContent('mp-1');
    });

    it('selecting "None" clears the form value to null', async () => {
      const user = userEvent.setup();
      render(
        <PostBrewStepWrapper defaultValues={{ mineral_profile_id: 'mp-1' }} />
      );

      // Initial value should be set
      expect(screen.getByTestId('mineral-value')).toHaveTextContent('mp-1');

      // Open dropdown and select None
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'None' }));

      expect(screen.getByTestId('mineral-value')).toHaveTextContent('null');
    });

    it('renders with empty profiles list showing only None', async () => {
      const user = userEvent.setup();
      render(<PostBrewStepWrapper mineralProfiles={[]} />);

      await user.click(screen.getByRole('combobox'));

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('None');
    });
  });
});
