import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from './client';
import {
  listExperiments,
  getExperiment,
  createExperiment,
  updateExperiment,
  deleteExperiment,
  copyExperiment,
  type Experiment,
  type ListExperimentsResponse,
  type CreateExperimentInput,
  type UpdateExperimentInput,
} from './experiments';

// Mock the axios client
vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockExperiment: Experiment = {
  id: 'exp-123',
  user_id: 'user-456',
  coffee_id: 'coffee-789',
  brew_date: '2026-01-15T10:30:00Z',
  coffee_weight: 15.0,
  water_weight: 225.0,
  ratio: 15.0,
  grind_size: 3.5,
  overall_notes: 'Bright acidity with lemon notes',
  overall_score: 7,
  created_at: '2026-01-15T10:35:00Z',
  updated_at: '2026-01-15T10:35:00Z',
  coffee: {
    id: 'coffee-789',
    roaster: 'Cata Coffee',
    name: 'Kiamaina',
    roast_date: '2025-11-19',
  },
  days_off_roast: 57,
  pours: [
    {
      id: 'pour-1',
      experiment_id: 'exp-123',
      pour_number: 1,
      water_amount: 90.0,
      pour_style: 'circular',
    },
    {
      id: 'pour-2',
      experiment_id: 'exp-123',
      pour_number: 2,
      water_amount: 90.0,
      pour_style: 'circular',
    },
  ],
};

const mockListResponse: ListExperimentsResponse = {
  items: [mockExperiment],
  pagination: {
    page: 1,
    per_page: 20,
    total: 1,
    total_pages: 1,
  },
};

describe('experiments API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listExperiments', () => {
    it('fetches experiments without parameters', async () => {
      vi.mocked(client.get).mockResolvedValueOnce({ data: mockListResponse });

      const result = await listExperiments();

      expect(client.get).toHaveBeenCalledWith('/experiments', { params: {} });
      expect(result).toEqual(mockListResponse);
    });

    it('passes pagination parameters', async () => {
      vi.mocked(client.get).mockResolvedValueOnce({ data: mockListResponse });

      await listExperiments({ page: 2, per_page: 10 });

      expect(client.get).toHaveBeenCalledWith('/experiments', {
        params: { page: 2, per_page: 10 },
      });
    });

    it('passes sort parameter', async () => {
      vi.mocked(client.get).mockResolvedValueOnce({ data: mockListResponse });

      await listExperiments({ sort: '-overall_score' });

      expect(client.get).toHaveBeenCalledWith('/experiments', {
        params: { sort: '-overall_score' },
      });
    });

    it('passes filter parameters', async () => {
      vi.mocked(client.get).mockResolvedValueOnce({ data: mockListResponse });

      await listExperiments({
        coffee_id: 'coffee-789',
        score_gte: 7,
        score_lte: 10,
        has_tds: true,
        date_from: '2026-01-01',
        date_to: '2026-01-31',
      });

      expect(client.get).toHaveBeenCalledWith('/experiments', {
        params: {
          coffee_id: 'coffee-789',
          score_gte: 7,
          score_lte: 10,
          has_tds: true,
          date_from: '2026-01-01',
          date_to: '2026-01-31',
        },
      });
    });
  });

  describe('getExperiment', () => {
    it('fetches a single experiment by ID', async () => {
      vi.mocked(client.get).mockResolvedValueOnce({ data: mockExperiment });

      const result = await getExperiment('exp-123');

      expect(client.get).toHaveBeenCalledWith('/experiments/exp-123');
      expect(result).toEqual(mockExperiment);
    });
  });

  describe('createExperiment', () => {
    it('creates experiment with minimal required fields', async () => {
      const input: CreateExperimentInput = {
        coffee_id: 'coffee-789',
        overall_notes: 'A simple brew',
      };

      vi.mocked(client.post).mockResolvedValueOnce({ data: mockExperiment });

      const result = await createExperiment(input);

      expect(client.post).toHaveBeenCalledWith('/experiments', input);
      expect(result).toEqual(mockExperiment);
    });

    it('creates experiment with all fields', async () => {
      const input: CreateExperimentInput = {
        coffee_id: 'coffee-789',
        brew_date: '2026-01-15T10:30:00Z',
        coffee_weight: 15.0,
        water_weight: 225.0,
        ratio: 15.0,
        grind_size: 3.5,
        water_temperature: 90.0,
        filter_paper_id: 'filter-123',
        bloom_water: 45.0,
        bloom_time: 45,
        pours: [
          { pour_number: 1, water_amount: 90.0, pour_style: 'circular', notes: 'Gentle' },
          { pour_number: 2, water_amount: 90.0, pour_style: 'circular' },
        ],
        total_brew_time: 180,
        drawdown_time: 30,
        technique_notes: 'Swirl after bloom',
        water_bypass_ml: 30,
        mineral_profile_id: 'mineral-123',
        final_weight: 200.0,
        tds: 1.35,
        extraction_yield: 18.0,
        aroma_intensity: 7,
        aroma_notes: 'Floral',
        acidity_intensity: 8,
        acidity_notes: 'Bright, citrus',
        sweetness_intensity: 6,
        sweetness_notes: 'Subtle',
        bitterness_intensity: 3,
        bitterness_notes: 'Clean finish',
        body_weight: 5,
        body_notes: 'Medium',
        flavor_intensity: 7,
        flavor_notes: 'Lemon, floral',
        aftertaste_duration: 6,
        aftertaste_intensity: 5,
        aftertaste_notes: 'Lingering citrus',
        overall_score: 8,
        overall_notes: 'Excellent cup with bright acidity',
        improvement_notes: 'Try slightly finer grind',
      };

      vi.mocked(client.post).mockResolvedValueOnce({ data: mockExperiment });

      await createExperiment(input);

      expect(client.post).toHaveBeenCalledWith('/experiments', input);
    });
  });

  describe('updateExperiment', () => {
    it('updates experiment with partial data', async () => {
      const input: UpdateExperimentInput = {
        overall_score: 8,
        improvement_notes: 'Grind finer next time',
      };

      vi.mocked(client.put).mockResolvedValueOnce({ data: mockExperiment });

      const result = await updateExperiment('exp-123', input);

      expect(client.put).toHaveBeenCalledWith('/experiments/exp-123', input);
      expect(result).toEqual(mockExperiment);
    });

    it('updates experiment with pours', async () => {
      const input: UpdateExperimentInput = {
        pours: [
          { pour_number: 1, water_amount: 100.0, pour_style: 'center' },
          { pour_number: 2, water_amount: 80.0, pour_style: 'circular' },
          { pour_number: 3, water_amount: 45.0, pour_style: 'center' },
        ],
      };

      vi.mocked(client.put).mockResolvedValueOnce({ data: mockExperiment });

      await updateExperiment('exp-123', input);

      expect(client.put).toHaveBeenCalledWith('/experiments/exp-123', input);
    });
  });

  describe('deleteExperiment', () => {
    it('deletes an experiment by ID', async () => {
      vi.mocked(client.delete).mockResolvedValueOnce({ data: null });

      await deleteExperiment('exp-123');

      expect(client.delete).toHaveBeenCalledWith('/experiments/exp-123');
    });
  });

  describe('copyExperiment', () => {
    it('copies an experiment as a template', async () => {
      const copiedExperiment = {
        ...mockExperiment,
        id: 'exp-new',
        overall_notes: '',
        overall_score: undefined,
        improvement_notes: undefined,
        brew_date: '2026-01-20T09:00:00Z',
      };

      vi.mocked(client.post).mockResolvedValueOnce({ data: copiedExperiment });

      const result = await copyExperiment('exp-123');

      expect(client.post).toHaveBeenCalledWith('/experiments/exp-123/copy');
      expect(result).toEqual(copiedExperiment);
    });
  });
});
