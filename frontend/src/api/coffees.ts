import client from './client';

export interface BestExperimentSummary {
  id: string;
  brew_date: string;
  overall_score?: number;
  ratio?: number;
  water_temperature?: number;
  filter_paper_name?: string;
  mineral_profile_name?: string;
  bloom_time?: number;
  pour_count: number;
  pour_styles: string[];
}

export interface Coffee {
  id: string;
  roaster: string;
  name: string;
  country?: string;
  farm?: string;
  process?: string;
  roast_level?: string;
  tasting_notes?: string;
  roast_date?: string;
  notes?: string;
  best_experiment_id?: string;
  archived_at?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  // Computed properties
  days_off_roast?: number;
  experiment_count: number;
  last_brewed?: string;
  // Enrichment fields (from list endpoint)
  best_experiment?: BestExperimentSummary;
  improvement_note?: string;
  // Dashboard enrichment fields (populated when include_goals/include_trend params are set)
  goals?: CoffeeGoalSummary;
  latest_values?: GoalValues;
}

export interface FilterPaperSummary {
  id: string;
  name: string;
  brand?: string;
}

export interface ReferenceExperiment {
  id: string;
  brew_date: string;
  coffee_weight?: number;
  water_weight?: number;
  ratio?: number;
  grind_size?: number;
  water_temperature?: number;
  filter_paper?: FilterPaperSummary;
  bloom_water?: number;
  bloom_time?: number;
  total_brew_time?: number;
  tds?: number;
  extraction_yield?: number;
  overall_score?: number;
  is_best: boolean;
}

export interface CoffeeGoalSummary {
  id: string;
  coffee_ml?: number;
  tds?: number;
  extraction_yield?: number;
  aroma_intensity?: number;
  sweetness_intensity?: number;
  body_intensity?: number;
  flavor_intensity?: number;
  brightness_intensity?: number;
  cleanliness_intensity?: number;
  complexity_intensity?: number;
  balance_intensity?: number;
  aftertaste_intensity?: number;
  overall_score?: number;
}

export interface CoffeeReference {
  experiment: ReferenceExperiment | null;
  goals: CoffeeGoalSummary | null;
}

export interface CoffeeInput {
  roaster: string;
  name: string;
  country?: string;
  farm?: string;
  process?: string;
  roast_level?: string;
  tasting_notes?: string;
  roast_date?: string;
  notes?: string;
}

export interface GoalValues {
  coffee_ml?: number;
  tds?: number;
  extraction_yield?: number;
  aroma_intensity?: number;
  sweetness_intensity?: number;
  body_intensity?: number;
  flavor_intensity?: number;
  brightness_intensity?: number;
  cleanliness_intensity?: number;
  complexity_intensity?: number;
  balance_intensity?: number;
  aftertaste_intensity?: number;
  overall_score?: number;
}

export interface GoalTrendValue {
  brew_date: string;
  value: number;
}

export interface GoalTrendMetric {
  target: number;
  values: GoalTrendValue[];
  target_met: boolean;
}

export interface GoalTrendResponse {
  coffee_id: string;
  metrics: Record<string, GoalTrendMetric>;
}

export interface ListCoffeesParams {
  page?: number;
  per_page?: number;
  roaster?: string;
  country?: string;
  process?: string;
  search?: string;
  archived_only?: boolean;
  include_deleted?: boolean;
  include_goals?: boolean;
  include_trend?: boolean;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ListCoffeesResponse {
  items: Coffee[];
  pagination: Pagination;
}

export interface SuggestionsResponse {
  items: string[];
}

export async function listCoffees(params: ListCoffeesParams = {}): Promise<ListCoffeesResponse> {
  const response = await client.get<ListCoffeesResponse>('/coffees', { params });
  return response.data;
}

export async function getCoffee(id: string): Promise<Coffee> {
  const response = await client.get<Coffee>(`/coffees/${id}`);
  return response.data;
}

export async function createCoffee(data: CoffeeInput): Promise<Coffee> {
  const response = await client.post<Coffee>('/coffees', data);
  return response.data;
}

export async function updateCoffee(id: string, data: CoffeeInput): Promise<Coffee> {
  const response = await client.put<Coffee>(`/coffees/${id}`, data);
  return response.data;
}

export async function deleteCoffee(id: string): Promise<void> {
  await client.delete(`/coffees/${id}`);
}

export async function archiveCoffee(id: string): Promise<Coffee> {
  const response = await client.post<Coffee>(`/coffees/${id}/archive`);
  return response.data;
}

export async function unarchiveCoffee(id: string): Promise<Coffee> {
  const response = await client.post<Coffee>(`/coffees/${id}/unarchive`);
  return response.data;
}

export async function getCoffeeSuggestions(field: string, query: string): Promise<string[]> {
  const response = await client.get<SuggestionsResponse>('/coffees/suggestions', {
    params: { field, q: query },
  });
  return response.data.items;
}

export async function setBestExperiment(
  coffeeId: string,
  experimentId: string | null
): Promise<Coffee> {
  const response = await client.post<Coffee>(`/coffees/${coffeeId}/best-experiment`, {
    experiment_id: experimentId,
  });
  return response.data;
}

export async function getReference(coffeeId: string): Promise<CoffeeReference> {
  const response = await client.get<CoffeeReference>(`/coffees/${coffeeId}/reference`);
  return response.data;
}

export async function getGoalTrends(coffeeId: string): Promise<GoalTrendResponse> {
  const response = await client.get<GoalTrendResponse>(`/coffees/${coffeeId}/goal-trends`);
  return response.data;
}
