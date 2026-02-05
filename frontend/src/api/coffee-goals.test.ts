import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from './client';
import {
  getCoffeeGoal,
  upsertCoffeeGoal,
  deleteCoffeeGoal,
  type CoffeeGoal,
  type CoffeeGoalInput,
} from './coffee-goals';
import type { AxiosError, AxiosResponse } from 'axios';

// Mock the axios client
vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockCoffeeGoal: CoffeeGoal = {
  id: 'goal-123',
  coffee_id: 'coffee-456',
  tds: 1.38,
  extraction_yield: 20.5,
  aroma_intensity: 7,
  acidity_intensity: 8,
  sweetness_intensity: 9,
  bitterness_intensity: 3,
  body_weight: 6,
  flavor_intensity: 8,
  aftertaste_duration: 5,
  aftertaste_intensity: 4,
  overall_score: 9,
  notes: 'Try finer grind to boost sweetness',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-18T14:30:00Z',
};

describe('coffee-goals API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCoffeeGoal', () => {
    it('fetches coffee goals successfully', async () => {
      vi.mocked(client.get).mockResolvedValueOnce({ data: mockCoffeeGoal });

      const result = await getCoffeeGoal('coffee-456');

      expect(client.get).toHaveBeenCalledWith('/coffees/coffee-456/goals');
      expect(result).toEqual(mockCoffeeGoal);
    });

    it('returns null when no goals exist (404)', async () => {
      const error = {
        response: { status: 404 } as AxiosResponse,
      } as AxiosError;
      vi.mocked(client.get).mockRejectedValueOnce(error);

      const result = await getCoffeeGoal('coffee-no-goals');

      expect(client.get).toHaveBeenCalledWith('/coffees/coffee-no-goals/goals');
      expect(result).toBeNull();
    });

    it('throws error for non-404 errors', async () => {
      const error = {
        response: { status: 500 } as AxiosResponse,
        message: 'Internal Server Error',
      } as AxiosError;
      vi.mocked(client.get).mockRejectedValueOnce(error);

      await expect(getCoffeeGoal('coffee-456')).rejects.toEqual(error);
    });

    it('throws error for network errors', async () => {
      const error = new Error('Network Error');
      vi.mocked(client.get).mockRejectedValueOnce(error);

      await expect(getCoffeeGoal('coffee-456')).rejects.toEqual(error);
    });

    it('returns goals with all sensory fields', async () => {
      vi.mocked(client.get).mockResolvedValueOnce({ data: mockCoffeeGoal });

      const result = await getCoffeeGoal('coffee-456');

      expect(result?.tds).toBe(1.38);
      expect(result?.extraction_yield).toBe(20.5);
      expect(result?.aroma_intensity).toBe(7);
      expect(result?.acidity_intensity).toBe(8);
      expect(result?.sweetness_intensity).toBe(9);
      expect(result?.bitterness_intensity).toBe(3);
      expect(result?.body_weight).toBe(6);
      expect(result?.flavor_intensity).toBe(8);
      expect(result?.aftertaste_duration).toBe(5);
      expect(result?.aftertaste_intensity).toBe(4);
      expect(result?.overall_score).toBe(9);
      expect(result?.notes).toBe('Try finer grind to boost sweetness');
    });

    it('returns goals with partial fields', async () => {
      const partialGoal: CoffeeGoal = {
        id: 'goal-partial',
        coffee_id: 'coffee-456',
        tds: 1.35,
        overall_score: 8,
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-15T10:00:00Z',
      };
      vi.mocked(client.get).mockResolvedValueOnce({ data: partialGoal });

      const result = await getCoffeeGoal('coffee-456');

      expect(result?.tds).toBe(1.35);
      expect(result?.overall_score).toBe(8);
      expect(result?.extraction_yield).toBeUndefined();
      expect(result?.sweetness_intensity).toBeUndefined();
    });
  });

  describe('upsertCoffeeGoal', () => {
    it('creates new goals', async () => {
      const input: CoffeeGoalInput = {
        tds: 1.40,
        extraction_yield: 21.0,
        overall_score: 9,
        notes: 'New target profile',
      };
      vi.mocked(client.put).mockResolvedValueOnce({ data: { ...mockCoffeeGoal, ...input } });

      const result = await upsertCoffeeGoal('coffee-456', input);

      expect(client.put).toHaveBeenCalledWith('/coffees/coffee-456/goals', input);
      expect(result.tds).toBe(1.40);
      expect(result.notes).toBe('New target profile');
    });

    it('updates existing goals', async () => {
      const input: CoffeeGoalInput = {
        sweetness_intensity: 10,
        notes: 'Updated notes',
      };
      vi.mocked(client.put).mockResolvedValueOnce({
        data: { ...mockCoffeeGoal, ...input },
      });

      const result = await upsertCoffeeGoal('coffee-456', input);

      expect(client.put).toHaveBeenCalledWith('/coffees/coffee-456/goals', input);
      expect(result.sweetness_intensity).toBe(10);
    });

    it('handles all sensory intensity fields', async () => {
      const input: CoffeeGoalInput = {
        aroma_intensity: 7,
        acidity_intensity: 8,
        sweetness_intensity: 9,
        bitterness_intensity: 2,
        body_weight: 6,
        flavor_intensity: 8,
        aftertaste_duration: 5,
        aftertaste_intensity: 4,
      };
      vi.mocked(client.put).mockResolvedValueOnce({
        data: { ...mockCoffeeGoal, ...input },
      });

      await upsertCoffeeGoal('coffee-456', input);

      expect(client.put).toHaveBeenCalledWith('/coffees/coffee-456/goals', input);
    });

    it('handles null values to clear fields', async () => {
      const input: CoffeeGoalInput = {
        tds: null,
        extraction_yield: null,
        notes: null,
      };
      const resultGoal: CoffeeGoal = {
        id: 'goal-123',
        coffee_id: 'coffee-456',
        overall_score: 9,
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-18T14:30:00Z',
      };
      vi.mocked(client.put).mockResolvedValueOnce({ data: resultGoal });

      const result = await upsertCoffeeGoal('coffee-456', input);

      expect(client.put).toHaveBeenCalledWith('/coffees/coffee-456/goals', input);
      expect(result.tds).toBeUndefined();
      expect(result.extraction_yield).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });

    it('handles empty input (clears all optional fields)', async () => {
      const input: CoffeeGoalInput = {};
      vi.mocked(client.put).mockResolvedValueOnce({
        data: {
          id: 'goal-123',
          coffee_id: 'coffee-456',
          created_at: '2026-01-15T10:00:00Z',
          updated_at: '2026-01-18T14:30:00Z',
        },
      });

      await upsertCoffeeGoal('coffee-456', input);

      expect(client.put).toHaveBeenCalledWith('/coffees/coffee-456/goals', input);
    });
  });

  describe('deleteCoffeeGoal', () => {
    it('deletes coffee goals', async () => {
      vi.mocked(client.delete).mockResolvedValueOnce({ data: null });

      await deleteCoffeeGoal('coffee-456');

      expect(client.delete).toHaveBeenCalledWith('/coffees/coffee-456/goals');
    });

    it('completes without error when goals already deleted', async () => {
      vi.mocked(client.delete).mockResolvedValueOnce({ data: null });

      await expect(deleteCoffeeGoal('coffee-no-goals')).resolves.toBeUndefined();
    });
  });
});
