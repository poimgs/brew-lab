import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from './client';
import {
  setBestExperiment,
  getReference,
  type Coffee,
  type CoffeeReference,
} from './coffees';

// Mock the axios client
vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockCoffee: Coffee = {
  id: 'coffee-123',
  roaster: 'Cata Coffee',
  name: 'Kiamaina',
  country: 'Kenya',
  region: 'Nyeri',
  process: 'Washed',
  roast_level: 'Light',
  roast_date: '2025-11-19',
  best_experiment_id: 'exp-456',
  created_at: '2025-11-22T15:00:00Z',
  updated_at: '2025-11-22T15:00:00Z',
  days_off_roast: 61,
  experiment_count: 8,
  last_brewed: '2026-01-19T10:30:00Z',
};

const mockCoffeeReference: CoffeeReference = {
  experiment: {
    id: 'exp-456',
    brew_date: '2026-01-15T10:30:00Z',
    coffee_weight: 15.0,
    water_weight: 225.0,
    ratio: 15.0,
    grind_size: 3.5,
    water_temperature: 96.0,
    filter_paper: {
      id: 'filter-123',
      name: 'Abaca',
      brand: 'Cafec',
    },
    bloom_water: 40.0,
    bloom_time: 30,
    total_brew_time: 165,
    tds: 1.38,
    extraction_yield: 20.1,
    overall_score: 8,
    is_best: true,
  },
  goals: {
    id: 'goal-789',
    tds: 1.38,
    extraction_yield: 20.5,
    acidity_intensity: 7,
    sweetness_intensity: 8,
    overall_score: 9,
    notes: 'Try finer grind to boost sweetness, maybe 3.2',
  },
};

describe('coffees API - Best Experiment and Reference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setBestExperiment', () => {
    it('sets a best experiment for a coffee', async () => {
      const updatedCoffee = { ...mockCoffee, best_experiment_id: 'exp-new' };
      vi.mocked(client.post).mockResolvedValueOnce({ data: updatedCoffee });

      const result = await setBestExperiment('coffee-123', 'exp-new');

      expect(client.post).toHaveBeenCalledWith('/coffees/coffee-123/best-experiment', {
        experiment_id: 'exp-new',
      });
      expect(result).toEqual(updatedCoffee);
      expect(result.best_experiment_id).toBe('exp-new');
    });

    it('clears the best experiment when passing null', async () => {
      const updatedCoffee = { ...mockCoffee, best_experiment_id: undefined };
      vi.mocked(client.post).mockResolvedValueOnce({ data: updatedCoffee });

      const result = await setBestExperiment('coffee-123', null);

      expect(client.post).toHaveBeenCalledWith('/coffees/coffee-123/best-experiment', {
        experiment_id: null,
      });
      expect(result.best_experiment_id).toBeUndefined();
    });
  });

  describe('getReference', () => {
    it('fetches reference data with experiment and goals', async () => {
      vi.mocked(client.get).mockResolvedValueOnce({ data: mockCoffeeReference });

      const result = await getReference('coffee-123');

      expect(client.get).toHaveBeenCalledWith('/coffees/coffee-123/reference');
      expect(result).toEqual(mockCoffeeReference);
      expect(result.experiment).not.toBeNull();
      expect(result.experiment?.is_best).toBe(true);
      expect(result.goals).not.toBeNull();
      expect(result.goals?.notes).toBe('Try finer grind to boost sweetness, maybe 3.2');
    });

    it('handles reference with null experiment (no experiments yet)', async () => {
      const referenceNoExperiment: CoffeeReference = {
        experiment: null,
        goals: mockCoffeeReference.goals,
      };
      vi.mocked(client.get).mockResolvedValueOnce({ data: referenceNoExperiment });

      const result = await getReference('coffee-new');

      expect(result.experiment).toBeNull();
      expect(result.goals).not.toBeNull();
    });

    it('handles reference with null goals (no goals set)', async () => {
      const referenceNoGoals: CoffeeReference = {
        experiment: mockCoffeeReference.experiment,
        goals: null,
      };
      vi.mocked(client.get).mockResolvedValueOnce({ data: referenceNoGoals });

      const result = await getReference('coffee-123');

      expect(result.experiment).not.toBeNull();
      expect(result.goals).toBeNull();
    });

    it('handles reference with is_best false (latest experiment)', async () => {
      const referenceLatest: CoffeeReference = {
        experiment: {
          ...mockCoffeeReference.experiment!,
          is_best: false,
        },
        goals: null,
      };
      vi.mocked(client.get).mockResolvedValueOnce({ data: referenceLatest });

      const result = await getReference('coffee-123');

      expect(result.experiment?.is_best).toBe(false);
    });

    it('includes all experiment fields in reference', async () => {
      vi.mocked(client.get).mockResolvedValueOnce({ data: mockCoffeeReference });

      const result = await getReference('coffee-123');
      const exp = result.experiment!;

      expect(exp.coffee_weight).toBe(15.0);
      expect(exp.water_weight).toBe(225.0);
      expect(exp.ratio).toBe(15.0);
      expect(exp.grind_size).toBe(3.5);
      expect(exp.water_temperature).toBe(96.0);
      expect(exp.filter_paper?.name).toBe('Abaca');
      expect(exp.bloom_water).toBe(40.0);
      expect(exp.bloom_time).toBe(30);
      expect(exp.total_brew_time).toBe(165);
      expect(exp.tds).toBe(1.38);
      expect(exp.extraction_yield).toBe(20.1);
      expect(exp.overall_score).toBe(8);
    });

    it('includes all goal fields in reference', async () => {
      const fullGoals: CoffeeReference = {
        experiment: null,
        goals: {
          id: 'goal-789',
          tds: 1.40,
          extraction_yield: 21.0,
          aroma_intensity: 7,
          acidity_intensity: 8,
          sweetness_intensity: 9,
          bitterness_intensity: 3,
          body_weight: 6,
          flavor_intensity: 8,
          aftertaste_duration: 5,
          aftertaste_intensity: 4,
          overall_score: 9,
          notes: 'Target profile notes',
        },
      };
      vi.mocked(client.get).mockResolvedValueOnce({ data: fullGoals });

      const result = await getReference('coffee-123');
      const goals = result.goals!;

      expect(goals.tds).toBe(1.40);
      expect(goals.extraction_yield).toBe(21.0);
      expect(goals.aroma_intensity).toBe(7);
      expect(goals.acidity_intensity).toBe(8);
      expect(goals.sweetness_intensity).toBe(9);
      expect(goals.bitterness_intensity).toBe(3);
      expect(goals.body_weight).toBe(6);
      expect(goals.flavor_intensity).toBe(8);
      expect(goals.aftertaste_duration).toBe(5);
      expect(goals.aftertaste_intensity).toBe(4);
      expect(goals.overall_score).toBe(9);
      expect(goals.notes).toBe('Target profile notes');
    });
  });
});
