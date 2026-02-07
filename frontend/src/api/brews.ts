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
export interface BrewPour {
  id: string;
  brew_id: string;
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

// Main brew type
export interface Brew {
  id: string;
  user_id: string;
  coffee_id: string;
  brew_date: string;

  // Roast date for this specific bag
  roast_date?: string;

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
  coffee_ml?: number;
  tds?: number;
  extraction_yield?: number;

  // Draft status
  is_draft: boolean;

  // Sensory outcomes (1-10 scale)
  aroma_intensity?: number;
  aroma_notes?: string;
  body_intensity?: number;
  body_notes?: string;
  flavor_intensity?: number;
  flavor_notes?: string;
  brightness_intensity?: number;
  brightness_notes?: string;
  sweetness_intensity?: number;
  sweetness_notes?: string;
  cleanliness_intensity?: number;
  cleanliness_notes?: string;
  complexity_intensity?: number;
  complexity_notes?: string;
  balance_intensity?: number;
  balance_notes?: string;
  aftertaste_intensity?: number;
  aftertaste_notes?: string;

  // Overall assessment
  overall_score?: number;
  overall_notes: string;
  improvement_notes?: string;

  created_at: string;
  updated_at: string;

  // Nested data (populated on read)
  pours?: BrewPour[];
  coffee?: CoffeeSummary;
  filter_paper?: FilterPaperSummary;
  mineral_profile?: MineralProfileSummary;

  // Computed properties (read-only)
  days_off_roast?: number;
  calculated_ratio?: number;
}

// Input type for creating brews
export interface CreateBrewInput {
  coffee_id: string;
  brew_date?: string;
  roast_date?: string;

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
  coffee_ml?: number;
  tds?: number;
  extraction_yield?: number;

  // Draft status
  is_draft?: boolean;

  // Sensory outcomes
  aroma_intensity?: number;
  aroma_notes?: string;
  body_intensity?: number;
  body_notes?: string;
  flavor_intensity?: number;
  flavor_notes?: string;
  brightness_intensity?: number;
  brightness_notes?: string;
  sweetness_intensity?: number;
  sweetness_notes?: string;
  cleanliness_intensity?: number;
  cleanliness_notes?: string;
  complexity_intensity?: number;
  complexity_notes?: string;
  balance_intensity?: number;
  balance_notes?: string;
  aftertaste_intensity?: number;
  aftertaste_notes?: string;

  // Overall assessment
  overall_score?: number;
  overall_notes: string;
  improvement_notes?: string;
}

// Input type for updating brews (all fields optional except on partial update)
export interface UpdateBrewInput {
  coffee_id?: string;
  brew_date?: string;
  roast_date?: string;

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
  coffee_ml?: number;
  tds?: number;
  extraction_yield?: number;

  // Draft status
  is_draft?: boolean;

  // Sensory outcomes
  aroma_intensity?: number;
  aroma_notes?: string;
  body_intensity?: number;
  body_notes?: string;
  flavor_intensity?: number;
  flavor_notes?: string;
  brightness_intensity?: number;
  brightness_notes?: string;
  sweetness_intensity?: number;
  sweetness_notes?: string;
  cleanliness_intensity?: number;
  cleanliness_notes?: string;
  complexity_intensity?: number;
  complexity_notes?: string;
  balance_intensity?: number;
  balance_notes?: string;
  aftertaste_intensity?: number;
  aftertaste_notes?: string;

  // Overall assessment
  overall_score?: number;
  overall_notes?: string;
  improvement_notes?: string;
}

// Query parameters for listing brews
export interface ListBrewsParams {
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

// Response type for listing brews
export interface ListBrewsResponse {
  items: Brew[];
  pagination: Pagination;
}

/**
 * List brews with optional filtering, sorting, and pagination
 */
export async function listBrews(
  params: ListBrewsParams = {}
): Promise<ListBrewsResponse> {
  const response = await client.get<ListBrewsResponse>('/brews', { params });
  return response.data;
}

/**
 * Get a single brew by ID
 */
export async function getBrew(id: string): Promise<Brew> {
  const response = await client.get<Brew>(`/brews/${id}`);
  return response.data;
}

/**
 * Create a new brew
 */
export async function createBrew(data: CreateBrewInput): Promise<Brew> {
  const response = await client.post<Brew>('/brews', data);
  return response.data;
}

/**
 * Update an existing brew
 */
export async function updateBrew(
  id: string,
  data: UpdateBrewInput
): Promise<Brew> {
  const response = await client.put<Brew>(`/brews/${id}`, data);
  return response.data;
}

/**
 * Delete an brew
 */
export async function deleteBrew(id: string): Promise<void> {
  await client.delete(`/brews/${id}`);
}

/**
 * Copy an brew as a template
 * Creates a new brew with same parameters, but clears notes/scores
 */
export async function copyBrew(id: string): Promise<Brew> {
  const response = await client.post<Brew>(`/brews/${id}/copy`);
  return response.data;
}

// Compare types
export interface DeltaInfo {
  min?: number;
  max?: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'variable';
}

export interface CompareResponse {
  brews: Brew[];
  deltas: Record<string, DeltaInfo>;
}

/**
 * Compare 2-4 brews side by side
 */
export async function compareBrews(brewIds: string[]): Promise<CompareResponse> {
  const response = await client.post<CompareResponse>('/brews/compare', {
    brew_ids: brewIds,
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
  brew_count: number;
  brew_ids: string[];
  insights: Insight[];
  warnings: Warning[];
}

/**
 * Analyze correlations across 5+ brews
 */
export async function analyzeBrews(
  brewIds: string[],
  minSamples = 5
): Promise<AnalyzeResponse> {
  const response = await client.post<AnalyzeResponse>('/brews/analyze', {
    brew_ids: brewIds,
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
 * Analyze correlations across brews matching filters
 */
export async function analyzeBrewsWithFilters(
  filters: AnalyzeFilters,
  minSamples = 5
): Promise<AnalyzeResponse> {
  const response = await client.post<AnalyzeResponse>('/brews/analyze', {
    filters,
    min_samples: minSamples,
  });
  return response.data;
}

// Analyze detail types
export interface ScatterPoint {
  x: number;
  y: number;
  brew_id: string;
}

export interface BrewPoint {
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
  brews: BrewPoint[];
}

/**
 * Get detailed correlation data for scatter plot visualization
 */
export async function analyzeBrewsDetail(
  brewIds: string[],
  inputVariable: string,
  outcomeVariable: string
): Promise<AnalyzeDetailResponse> {
  const response = await client.post<AnalyzeDetailResponse>('/brews/analyze/detail', {
    brew_ids: brewIds,
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
 * Export brews as CSV or JSON
 */
export async function exportBrews(params: ExportParams = {}): Promise<Blob> {
  const response = await client.get('/brews/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
}
