import client from './client';

// Summary types for nested data
export interface CoffeeSummary {
  id: string;
  roaster: string;
  name: string;
  roast_date?: string;
}

export interface FilterPaperSummary {
  id: string;
  name: string;
  brand?: string;
}

export interface MineralProfileSummary {
  id: string;
  name: string;
  brand?: string;
}

// Pour types
export interface ExperimentPour {
  id: string;
  experiment_id: string;
  pour_number: number;
  water_amount?: number;
  pour_style?: string;
  notes?: string;
}

export interface PourInput {
  pour_number: number;
  water_amount?: number;
  pour_style?: string;
  notes?: string;
}

// Main experiment type
export interface Experiment {
  id: string;
  user_id: string;
  coffee_id: string;
  brew_date: string;

  // Pre-brew variables
  coffee_weight?: number;
  water_weight?: number;
  ratio?: number;
  grind_size?: number;
  water_temperature?: number;
  filter_paper_id?: string;

  // Brew variables
  bloom_water?: number;
  bloom_time?: number;
  total_brew_time?: number;
  drawdown_time?: number;
  technique_notes?: string;

  // Post-brew variables
  water_bypass_ml?: number;
  mineral_profile_id?: string;

  // Quantitative outcomes
  final_weight?: number;
  tds?: number;
  extraction_yield?: number;

  // Sensory outcomes (1-10 scale)
  aroma_intensity?: number;
  aroma_notes?: string;
  acidity_intensity?: number;
  acidity_notes?: string;
  sweetness_intensity?: number;
  sweetness_notes?: string;
  bitterness_intensity?: number;
  bitterness_notes?: string;
  body_weight?: number;
  body_notes?: string;
  flavor_intensity?: number;
  flavor_notes?: string;
  aftertaste_duration?: number;
  aftertaste_intensity?: number;
  aftertaste_notes?: string;

  // Overall assessment
  overall_score?: number;
  overall_notes: string;
  improvement_notes?: string;

  created_at: string;
  updated_at: string;

  // Nested data (populated on read)
  pours?: ExperimentPour[];
  coffee?: CoffeeSummary;
  filter_paper?: FilterPaperSummary;
  mineral_profile?: MineralProfileSummary;

  // Computed properties (read-only)
  days_off_roast?: number;
  calculated_ratio?: number;
}

// Input type for creating experiments
export interface CreateExperimentInput {
  coffee_id: string;
  brew_date?: string;

  // Pre-brew variables
  coffee_weight?: number;
  water_weight?: number;
  ratio?: number;
  grind_size?: number;
  water_temperature?: number;
  filter_paper_id?: string;

  // Brew variables
  bloom_water?: number;
  bloom_time?: number;
  pours?: PourInput[];
  total_brew_time?: number;
  drawdown_time?: number;
  technique_notes?: string;

  // Post-brew variables
  water_bypass_ml?: number;
  mineral_profile_id?: string;

  // Quantitative outcomes
  final_weight?: number;
  tds?: number;
  extraction_yield?: number;

  // Sensory outcomes
  aroma_intensity?: number;
  aroma_notes?: string;
  acidity_intensity?: number;
  acidity_notes?: string;
  sweetness_intensity?: number;
  sweetness_notes?: string;
  bitterness_intensity?: number;
  bitterness_notes?: string;
  body_weight?: number;
  body_notes?: string;
  flavor_intensity?: number;
  flavor_notes?: string;
  aftertaste_duration?: number;
  aftertaste_intensity?: number;
  aftertaste_notes?: string;

  // Overall assessment
  overall_score?: number;
  overall_notes: string;
  improvement_notes?: string;
}

// Input type for updating experiments (all fields optional except on partial update)
export interface UpdateExperimentInput {
  coffee_id?: string;
  brew_date?: string;

  // Pre-brew variables
  coffee_weight?: number;
  water_weight?: number;
  ratio?: number;
  grind_size?: number;
  water_temperature?: number;
  filter_paper_id?: string;

  // Brew variables
  bloom_water?: number;
  bloom_time?: number;
  pours?: PourInput[];
  total_brew_time?: number;
  drawdown_time?: number;
  technique_notes?: string;

  // Post-brew variables
  water_bypass_ml?: number;
  mineral_profile_id?: string;

  // Quantitative outcomes
  final_weight?: number;
  tds?: number;
  extraction_yield?: number;

  // Sensory outcomes
  aroma_intensity?: number;
  aroma_notes?: string;
  acidity_intensity?: number;
  acidity_notes?: string;
  sweetness_intensity?: number;
  sweetness_notes?: string;
  bitterness_intensity?: number;
  bitterness_notes?: string;
  body_weight?: number;
  body_notes?: string;
  flavor_intensity?: number;
  flavor_notes?: string;
  aftertaste_duration?: number;
  aftertaste_intensity?: number;
  aftertaste_notes?: string;

  // Overall assessment
  overall_score?: number;
  overall_notes?: string;
  improvement_notes?: string;
}

// Query parameters for listing experiments
export interface ListExperimentsParams {
  page?: number;
  per_page?: number;
  sort?: string;
  coffee_id?: string;
  score_gte?: number;
  score_lte?: number;
  has_tds?: boolean;
  date_from?: string;
  date_to?: string;
}

// Pagination type
export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// Response type for listing experiments
export interface ListExperimentsResponse {
  items: Experiment[];
  pagination: Pagination;
}

/**
 * List experiments with optional filtering, sorting, and pagination
 */
export async function listExperiments(
  params: ListExperimentsParams = {}
): Promise<ListExperimentsResponse> {
  const response = await client.get<ListExperimentsResponse>('/experiments', { params });
  return response.data;
}

/**
 * Get a single experiment by ID
 */
export async function getExperiment(id: string): Promise<Experiment> {
  const response = await client.get<Experiment>(`/experiments/${id}`);
  return response.data;
}

/**
 * Create a new experiment
 */
export async function createExperiment(data: CreateExperimentInput): Promise<Experiment> {
  const response = await client.post<Experiment>('/experiments', data);
  return response.data;
}

/**
 * Update an existing experiment
 */
export async function updateExperiment(
  id: string,
  data: UpdateExperimentInput
): Promise<Experiment> {
  const response = await client.put<Experiment>(`/experiments/${id}`, data);
  return response.data;
}

/**
 * Delete an experiment
 */
export async function deleteExperiment(id: string): Promise<void> {
  await client.delete(`/experiments/${id}`);
}

/**
 * Copy an experiment as a template
 * Creates a new experiment with same parameters, but clears notes/scores
 */
export async function copyExperiment(id: string): Promise<Experiment> {
  const response = await client.post<Experiment>(`/experiments/${id}/copy`);
  return response.data;
}

// Compare types
export interface DeltaInfo {
  min?: number;
  max?: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'variable';
}

export interface CompareResponse {
  experiments: Experiment[];
  deltas: Record<string, DeltaInfo>;
}

/**
 * Compare 2-4 experiments side by side
 */
export async function compareExperiments(experimentIds: string[]): Promise<CompareResponse> {
  const response = await client.post<CompareResponse>('/experiments/compare', {
    experiment_ids: experimentIds,
  });
  return response.data;
}

// Analyze types
export interface CorrelationResult {
  r: number;
  n: number;
  p: number;
  interpretation: string;
}

export interface Insight {
  type: string;
  input: string;
  outcome: string;
  r: number;
  message: string;
}

export interface Warning {
  type: string;
  field: string;
  n: number;
  message: string;
}

export interface AnalyzeResponse {
  correlations: Record<string, Record<string, CorrelationResult | null>>;
  inputs: string[];
  outcomes: string[];
  experiment_count: number;
  experiment_ids: string[];
  insights: Insight[];
  warnings: Warning[];
}

/**
 * Analyze correlations across 5+ experiments
 */
export async function analyzeExperiments(
  experimentIds: string[],
  minSamples = 5
): Promise<AnalyzeResponse> {
  const response = await client.post<AnalyzeResponse>('/experiments/analyze', {
    experiment_ids: experimentIds,
    min_samples: minSamples,
  });
  return response.data;
}

// Filter-based analysis types
export interface AnalyzeFilters {
  coffee_ids?: string[];
  date_from?: string;
  date_to?: string;
  score_min?: number;
  score_max?: number;
}

/**
 * Analyze correlations across experiments matching filters
 */
export async function analyzeExperimentsWithFilters(
  filters: AnalyzeFilters,
  minSamples = 5
): Promise<AnalyzeResponse> {
  const response = await client.post<AnalyzeResponse>('/experiments/analyze', {
    filters,
    min_samples: minSamples,
  });
  return response.data;
}

// Analyze detail types
export interface ScatterPoint {
  x: number;
  y: number;
  experiment_id: string;
}

export interface ExperimentPoint {
  id: string;
  brew_date: string;
  coffee_name: string;
  input_value: number | null;
  outcome_value: number | null;
}

export interface AnalyzeDetailResponse {
  input_variable: string;
  outcome_variable: string;
  correlation: CorrelationResult;
  scatter_data: ScatterPoint[];
  insight: string;
  experiments: ExperimentPoint[];
}

/**
 * Get detailed correlation data for scatter plot visualization
 */
export async function analyzeExperimentsDetail(
  experimentIds: string[],
  inputVariable: string,
  outcomeVariable: string
): Promise<AnalyzeDetailResponse> {
  const response = await client.post<AnalyzeDetailResponse>('/experiments/analyze/detail', {
    experiment_ids: experimentIds,
    input_variable: inputVariable,
    outcome_variable: outcomeVariable,
  });
  return response.data;
}

// Export types
export interface ExportParams {
  format?: 'csv' | 'json';
  coffee_id?: string;
  score_gte?: number;
  score_lte?: number;
  date_from?: string;
  date_to?: string;
  has_tds?: boolean;
}

/**
 * Export experiments as CSV or JSON
 */
export async function exportExperiments(params: ExportParams = {}): Promise<Blob> {
  const response = await client.get('/experiments/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
}
