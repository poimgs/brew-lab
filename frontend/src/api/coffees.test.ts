import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from './client';
import {
  listCoffees,
  setBestExperiment,
  getReference,
  type Coffee,
  type CoffeeReference,
  type BestExperimentSummary,
  type ListCoffeesResponse,
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
  farm: 'Nyeri',
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
    coffee_ml: 180,
    tds: 1.38,
    extraction_yield: 20.5,
    brightness_intensity: 7,
    sweetness_intensity: 8,
    overall_score: 9,
  },
};

describe('coffees API - List with enrichment data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('BestExperimentSummary type has all expected fields', () => {
    const summary: BestExperimentSummary = {
      id: 'exp-456',
      brew_date: '2026-01-15T10:30:00Z',
      overall_score: 8,
      ratio: 15.0,
      water_temperature: 96.0,
      filter_paper_name: 'Abaca',
      mineral_profile_name: 'Catalyst',
      bloom_time: 30,
      pour_count: 2,
      pour_styles: ['circular', 'center'],
    };

    expect(summary.id).toBe('exp-456');
    expect(summary.overall_score).toBe(8);
    expect(summary.ratio).toBe(15.0);
    expect(summary.water_temperature).toBe(96.0);
    expect(summary.filter_paper_name).toBe('Abaca');
    expect(summary.mineral_profile_name).toBe('Catalyst');
    expect(summary.bloom_time).toBe(30);
    expect(summary.pour_count).toBe(2);
    expect(summary.pour_styles).toEqual(['circular', 'center']);
  });

  it('Coffee type supports optional best_experiment and improvement_note', () => {
    const coffeeWithEnrichment: Coffee = {
      ...mockCoffee,
      best_experiment: {
        id: 'exp-456',
        brew_date: '2026-01-15T10:30:00Z',
        overall_score: 8,
        ratio: 15.0,
        water_temperature: 96.0,
        filter_paper_name: 'Abaca',
        bloom_time: 30,
        pour_count: 2,
        pour_styles: ['circular'],
      },
      improvement_note: 'Try finer grind',
    };

    expect(coffeeWithEnrichment.best_experiment).toBeDefined();
    expect(coffeeWithEnrichment.best_experiment?.overall_score).toBe(8);
    expect(coffeeWithEnrichment.improvement_note).toBe('Try finer grind');
  });

  it('Coffee type works without enrichment fields', () => {
    const plain: Coffee = { ...mockCoffee };
    expect(plain.best_experiment).toBeUndefined();
    expect(plain.improvement_note).toBeUndefined();
  });

  it('listCoffees returns enriched coffee data', async () => {
    const response: ListCoffeesResponse = {
      items: [
        {
          ...mockCoffee,
          best_experiment: {
            id: 'exp-456',
            brew_date: '2026-01-15T10:30:00Z',
            overall_score: 8,
            ratio: 15.0,
            water_temperature: 96.0,
            bloom_time: 30,
            pour_count: 3,
            pour_styles: ['circular', 'circular', 'center'],
          },
          improvement_note: 'Try finer grind to boost sweetness',
        },
      ],
      pagination: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    };

    vi.mocked(client.get).mockResolvedValueOnce({ data: response });

    const result = await listCoffees();

    expect(client.get).toHaveBeenCalledWith('/coffees', { params: {} });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].best_experiment?.pour_count).toBe(3);
    expect(result.items[0].best_experiment?.pour_styles).toEqual([
      'circular',
      'circular',
      'center',
    ]);
    expect(result.items[0].improvement_note).toBe('Try finer grind to boost sweetness');
  });
});

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
      expect(result.goals?.coffee_ml).toBe(180);
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
          coffee_ml: 185,
          tds: 1.40,
          extraction_yield: 21.0,
          aroma_intensity: 7,
          brightness_intensity: 8,
          sweetness_intensity: 9,
          cleanliness_intensity: 3,
          body_intensity: 6,
          flavor_intensity: 8,
          complexity_intensity: 5,
          balance_intensity: 7,
          aftertaste_intensity: 4,
          overall_score: 9,
        },
      };
      vi.mocked(client.get).mockResolvedValueOnce({ data: fullGoals });

      const result = await getReference('coffee-123');
      const goals = result.goals!;

      expect(goals.tds).toBe(1.40);
      expect(goals.extraction_yield).toBe(21.0);
      expect(goals.aroma_intensity).toBe(7);
      expect(goals.brightness_intensity).toBe(8);
      expect(goals.sweetness_intensity).toBe(9);
      expect(goals.cleanliness_intensity).toBe(3);
      expect(goals.body_intensity).toBe(6);
      expect(goals.flavor_intensity).toBe(8);
      expect(goals.complexity_intensity).toBe(5);
      expect(goals.balance_intensity).toBe(7);
      expect(goals.aftertaste_intensity).toBe(4);
      expect(goals.overall_score).toBe(9);
      expect(goals.coffee_ml).toBe(185);
    });
  });
});
