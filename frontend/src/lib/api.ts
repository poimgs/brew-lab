const API_BASE = "/api/v1";

export interface User {
  id: string;
  email: string;
  created_at?: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
}

export interface RefreshResponse {
  user: User;
  access_token: string;
}

export interface MeResponse {
  data: User;
}

export interface ApiError {
  error: string;
  message?: string;
}

// Coffee types
export type RoastLevel = "Light" | "Medium" | "Medium-Dark" | "Dark";

export interface Coffee {
  id: string;
  roaster: string;
  name: string;
  country?: string;
  region?: string;
  process?: string;
  roast_level?: RoastLevel;
  tasting_notes?: string;
  roast_date?: string;
  purchase_date?: string;
  notes?: string;
  days_since_roast?: number;
  experiment_count: number;
  last_brewed?: string;
  created_at: string;
  updated_at: string;
}

export interface CoffeeFormData {
  roaster: string;
  name: string;
  country?: string;
  region?: string;
  process?: string;
  roast_level?: RoastLevel;
  tasting_notes?: string;
  roast_date?: string;
  purchase_date?: string;
  notes?: string;
}

export interface CoffeeListParams {
  page?: number;
  page_size?: number;
  roaster?: string;
  country?: string;
  process?: string;
  search?: string;
  sort_by?: "created_at" | "roast_date" | "roaster" | "name";
  sort_dir?: "asc" | "desc";
}

export interface CoffeeListResponse {
  coffees: Coffee[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CoffeeResponse {
  data: Coffee;
}

export interface SuggestionsResponse {
  data: string[];
}

// Experiment types
export interface IssueTag {
  id: string;
  name: string;
  is_system: boolean;
}

export interface Experiment {
  id: string;
  coffee_id?: string;
  brew_date: string;
  overall_notes: string;
  overall_score?: number;
  // Pre-brew
  coffee_weight?: number;
  water_weight?: number;
  ratio?: number;
  grind_size?: string;
  water_temperature?: number;
  filter_paper_id?: string;
  // Brew
  bloom_water?: number;
  bloom_time?: number;
  pour_1?: string;
  pour_2?: string;
  pour_3?: string;
  total_brew_time?: number;
  drawdown_time?: number;
  technique_notes?: string;
  // Post-brew
  serving_temperature?: number;
  water_bypass?: number;
  mineral_additions?: string;
  // Quantitative
  final_weight?: number;
  tds?: number;
  extraction_yield?: number;
  // Sensory (1-10)
  aroma_intensity?: number;
  acidity_intensity?: number;
  sweetness_intensity?: number;
  bitterness_intensity?: number;
  body_weight?: number;
  aftertaste_duration?: number;
  aftertaste_intensity?: number;
  // Notes
  aroma_notes?: string;
  flavor_notes?: string;
  aftertaste_notes?: string;
  improvement_notes?: string;
  // Computed
  days_off_roast?: number;
  calculated_ratio?: number;
  // Target profile
  target_acidity?: number;
  target_sweetness?: number;
  target_bitterness?: number;
  target_body?: number;
  target_aroma?: number;
  // Computed gaps
  gaps?: SensoryGaps;
  // Nested
  coffee?: Coffee;
  filter_paper?: FilterPaper;
  issue_tags?: IssueTag[];
  created_at: string;
  updated_at: string;
}

export type GapDirection = "increase" | "decrease" | "on_target";

export interface SensoryGap {
  current?: number;
  target?: number;
  direction: GapDirection;
  amount: number;
}

export interface SensoryGaps {
  acidity?: SensoryGap;
  sweetness?: SensoryGap;
  bitterness?: SensoryGap;
  body?: SensoryGap;
  aroma?: SensoryGap;
}

export interface ExperimentFormData {
  coffee_id?: string;
  brew_date?: string;
  overall_notes: string;
  overall_score?: number;
  coffee_weight?: number;
  water_weight?: number;
  grind_size?: string;
  water_temperature?: number;
  filter_paper_id?: string;
  bloom_water?: number;
  bloom_time?: number;
  pour_1?: string;
  pour_2?: string;
  pour_3?: string;
  total_brew_time?: number;
  drawdown_time?: number;
  technique_notes?: string;
  serving_temperature?: number;
  water_bypass?: number;
  mineral_additions?: string;
  final_weight?: number;
  tds?: number;
  aroma_intensity?: number;
  acidity_intensity?: number;
  sweetness_intensity?: number;
  bitterness_intensity?: number;
  body_weight?: number;
  aftertaste_duration?: number;
  aftertaste_intensity?: number;
  aroma_notes?: string;
  flavor_notes?: string;
  aftertaste_notes?: string;
  improvement_notes?: string;
  tag_ids?: string[];
  // Target profile
  target_acidity?: number;
  target_sweetness?: number;
  target_bitterness?: number;
  target_body?: number;
  target_aroma?: number;
}

export interface ExperimentListParams {
  page?: number;
  page_size?: number;
  coffee_id?: string;
  score_gte?: number;
  score_lte?: number;
  date_from?: string;
  date_to?: string;
  tags?: string;
  sort_by?: "brew_date" | "created_at" | "overall_score";
  sort_dir?: "asc" | "desc";
}

export interface ExperimentListResponse {
  experiments: Experiment[];
  total: number;
  page: number;
  per_page: number;
}

export interface ExperimentResponse {
  data: Experiment;
}

export interface OptimizationResponse {
  experiment: Experiment;
  relevant_mappings: EffectMapping[];
}

export interface TagListResponse {
  tags: IssueTag[];
}

export interface TagResponse {
  data: IssueTag;
}

export interface UserDefaults {
  [field: string]: string;
}

export interface DefaultsResponse {
  data: UserDefaults;
}

// Filter Paper types
export interface FilterPaper {
  id: string;
  name: string;
  brand?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FilterPaperFormData {
  name: string;
  brand?: string;
  notes?: string;
}

export interface FilterPaperListResponse {
  filter_papers: FilterPaper[];
  total: number;
}

// Mineral Profile types
export interface MineralProfile {
  id: string;
  name: string;
  brand?: string;
  hardness?: number;
  alkalinity?: number;
  magnesium?: number;
  calcium?: number;
  potassium?: number;
  sodium?: number;
  chloride?: number;
  sulfate?: number;
  bicarbonate?: number;
  typical_dose?: string;
  taste_effects?: string;
  created_at: string;
}

export interface MineralProfileListResponse {
  mineral_profiles: MineralProfile[];
  total: number;
}

// Effect Mapping types
export type InputVariable =
  | "temperature"
  | "ratio"
  | "grind_size"
  | "bloom_time"
  | "total_brew_time"
  | "coffee_weight"
  | "pour_count"
  | "pour_technique"
  | "filter_type";

export type OutputVariable =
  | "acidity"
  | "sweetness"
  | "bitterness"
  | "body"
  | "aroma"
  | "aftertaste"
  | "overall";

export type MappingDirection = "increase" | "decrease";
export type EffectDirection = "increase" | "decrease" | "none";
export type Confidence = "low" | "medium" | "high";

export interface Effect {
  id: string;
  output_variable: OutputVariable;
  direction: EffectDirection;
  range_min?: number;
  range_max?: number;
  confidence: Confidence;
}

export interface EffectMapping {
  id: string;
  name: string;
  variable: InputVariable;
  direction: MappingDirection;
  tick_description: string;
  source?: string;
  notes?: string;
  active: boolean;
  effects: Effect[];
  created_at: string;
  updated_at: string;
}

export interface EffectInput {
  output_variable: OutputVariable;
  direction: EffectDirection;
  range_min?: number;
  range_max?: number;
  confidence: Confidence;
}

export interface EffectMappingFormData {
  name: string;
  variable: InputVariable;
  direction: MappingDirection;
  tick_description: string;
  source?: string;
  notes?: string;
  effects: EffectInput[];
}

export interface EffectMappingUpdateData {
  name?: string;
  variable?: InputVariable;
  direction?: MappingDirection;
  tick_description?: string;
  source?: string;
  notes?: string;
  active?: boolean;
  effects?: EffectInput[];
}

export interface EffectMappingListParams {
  page?: number;
  page_size?: number;
  variable?: InputVariable;
  active?: boolean;
  search?: string;
  sort_by?: "created_at" | "updated_at" | "name" | "variable";
  sort_dir?: "asc" | "desc";
}

export interface EffectMappingListResponse {
  mappings: EffectMapping[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GapInput {
  output_variable: OutputVariable;
  current_value: number;
  target_value: number;
}

export interface FindRelevantInput {
  gaps: GapInput[];
}

export interface FindRelevantResponse {
  mappings: EffectMapping[];
}

// Recommendation types
export interface RecommendationResponse {
  id: string;
  name: string;
  variable: InputVariable;
  direction: MappingDirection;
  tick_description: string;
  source?: string;
  notes?: string;
  active: boolean;
  effects: Effect[];
  created_at: string;
  updated_at: string;
  helps_count: number;
  helps_gaps: string[];
  has_conflict: boolean;
  score: number;
  is_dismissed: boolean;
}

export interface RecommendationsResponse {
  recommendations: RecommendationResponse[];
  experiment_id: string;
  total_count: number;
}

export interface ExperimentWithGaps {
  id: string;
  coffee_id?: string;
  brew_date: string;
  overall_notes: string;
  overall_score?: number;
  coffee?: Coffee;
  gaps?: SensoryGaps;
  active_gap_count: number;
  recommendation_count: number;
  created_at: string;
}

export interface ExperimentsWithGapsResponse {
  experiments: ExperimentWithGaps[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TryMappingInput {
  mapping_id: string;
  notes?: string;
}

export interface DismissMappingInput {
  mapping_id: string;
}

export interface GetRecommendationsInput {
  experiment_id: string;
}

export interface DismissedMappingsResponse {
  mapping_ids: string[];
}

// Compare types
export interface CompareExperimentsInput {
  experiment_ids: string[];
}

export type DeltaTrend = "increasing" | "decreasing" | "stable" | "variable";

export interface DeltaInfo {
  min: number | string;
  max: number | string;
  trend: DeltaTrend;
}

export interface CompareExperimentsResponse {
  experiments: Experiment[];
  deltas: Record<string, DeltaInfo>;
}

// Analyze types
export interface AnalyzeExperimentsInput {
  experiment_ids: string[];
  min_samples?: number;
}

export interface CorrelationResult {
  r: number;
  n: number;
  p: number;
}

export type InsightType =
  | "strong_positive"
  | "strong_negative"
  | "moderate_positive"
  | "moderate_negative";

export interface Insight {
  type: InsightType;
  input: string;
  outcome: string;
  r: number;
  message: string;
}

export type WarningType = "low_samples" | "missing_data" | "insufficient_variance";

export interface Warning {
  type: WarningType;
  field?: string;
  n?: number;
  message: string;
}

export interface AnalyzeExperimentsResponse {
  correlations: Record<string, Record<string, CorrelationResult>>;
  inputs: string[];
  outcomes: string[];
  experiment_count: number;
  insights: Insight[];
  warnings: Warning[];
}

// Analyze Detail types
export interface AnalyzeDetailInput {
  experiment_ids: string[];
  input_variable: string;
  outcome_variable: string;
}

export interface ScatterPoint {
  x: number;
  y: number;
  experiment_id: string;
}

export interface ScatterExperiment {
  id: string;
  brew_date: string;
  coffee_name?: string;
  input_value: number;
  outcome_value: number;
}

export interface CorrelationDetail {
  r: number;
  n: number;
  p: number;
  interpretation: string;
}

export interface AnalyzeDetailResponse {
  input_variable: string;
  outcome_variable: string;
  correlation: CorrelationDetail;
  scatter_data: ScatterPoint[];
  insight: string;
  experiments: ScatterExperiment[];
}

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)["Authorization"] =
        `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: "Request failed",
      }));
      throw new Error(error.message || error.error || "Request failed");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.accessToken = response.access_token;
    return response;
  }

  async logout(): Promise<void> {
    await this.request<void>("/auth/logout", {
      method: "POST",
    });
    this.accessToken = null;
  }

  async refreshToken(): Promise<RefreshResponse> {
    const response = await this.request<RefreshResponse>("/auth/refresh", {
      method: "POST",
    });
    this.accessToken = response.access_token;
    return response;
  }

  async getMe(): Promise<MeResponse> {
    return this.request<MeResponse>("/auth/me");
  }

  // Coffee methods
  async listCoffees(params?: CoffeeListParams): Promise<CoffeeListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request<CoffeeListResponse>(
      `/coffees${query ? `?${query}` : ""}`
    );
  }

  async getCoffee(id: string): Promise<CoffeeResponse> {
    return this.request<CoffeeResponse>(`/coffees/${id}`);
  }

  async createCoffee(data: CoffeeFormData): Promise<CoffeeResponse> {
    return this.request<CoffeeResponse>("/coffees", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCoffee(id: string, data: CoffeeFormData): Promise<CoffeeResponse> {
    return this.request<CoffeeResponse>(`/coffees/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCoffee(id: string): Promise<void> {
    return this.request<void>(`/coffees/${id}`, {
      method: "DELETE",
    });
  }

  async getCoffeeSuggestions(
    field: string,
    query: string
  ): Promise<SuggestionsResponse> {
    const searchParams = new URLSearchParams({ field, q: query });
    return this.request<SuggestionsResponse>(
      `/coffees/suggestions?${searchParams.toString()}`
    );
  }

  // Experiment methods
  async listExperiments(
    params?: ExperimentListParams
  ): Promise<ExperimentListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request<ExperimentListResponse>(
      `/experiments${query ? `?${query}` : ""}`
    );
  }

  async getExperiment(id: string): Promise<ExperimentResponse> {
    return this.request<ExperimentResponse>(`/experiments/${id}`);
  }

  async createExperiment(data: ExperimentFormData): Promise<ExperimentResponse> {
    return this.request<ExperimentResponse>("/experiments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateExperiment(
    id: string,
    data: ExperimentFormData
  ): Promise<ExperimentResponse> {
    return this.request<ExperimentResponse>(`/experiments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteExperiment(id: string): Promise<void> {
    return this.request<void>(`/experiments/${id}`, {
      method: "DELETE",
    });
  }

  async copyExperiment(id: string): Promise<ExperimentResponse> {
    return this.request<ExperimentResponse>(`/experiments/${id}/copy`, {
      method: "POST",
    });
  }

  async addExperimentTags(
    experimentId: string,
    tagIds: string[]
  ): Promise<ExperimentResponse> {
    return this.request<ExperimentResponse>(
      `/experiments/${experimentId}/tags`,
      {
        method: "POST",
        body: JSON.stringify({ tag_ids: tagIds }),
      }
    );
  }

  async removeExperimentTag(
    experimentId: string,
    tagId: string
  ): Promise<void> {
    return this.request<void>(`/experiments/${experimentId}/tags/${tagId}`, {
      method: "DELETE",
    });
  }

  async getExperimentOptimization(id: string): Promise<OptimizationResponse> {
    return this.request<OptimizationResponse>(`/experiments/${id}/optimization`);
  }

  // Tags methods
  async listTags(): Promise<TagListResponse> {
    return this.request<TagListResponse>("/tags");
  }

  async createTag(name: string): Promise<TagResponse> {
    return this.request<TagResponse>("/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async deleteTag(id: string): Promise<void> {
    return this.request<void>(`/tags/${id}`, {
      method: "DELETE",
    });
  }

  // User defaults methods
  async getDefaults(): Promise<DefaultsResponse> {
    return this.request<DefaultsResponse>("/defaults");
  }

  async updateDefaults(data: UserDefaults): Promise<DefaultsResponse> {
    return this.request<DefaultsResponse>("/defaults", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteDefault(field: string): Promise<void> {
    return this.request<void>(`/defaults/${field}`, {
      method: "DELETE",
    });
  }

  // Effect Mapping methods
  async listEffectMappings(
    params?: EffectMappingListParams
  ): Promise<EffectMappingListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request<EffectMappingListResponse>(
      `/effect-mappings${query ? `?${query}` : ""}`
    );
  }

  async getEffectMapping(id: string): Promise<EffectMapping> {
    return this.request<EffectMapping>(`/effect-mappings/${id}`);
  }

  async createEffectMapping(
    data: EffectMappingFormData
  ): Promise<EffectMapping> {
    return this.request<EffectMapping>("/effect-mappings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateEffectMapping(
    id: string,
    data: EffectMappingUpdateData
  ): Promise<EffectMapping> {
    return this.request<EffectMapping>(`/effect-mappings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteEffectMapping(id: string): Promise<void> {
    return this.request<void>(`/effect-mappings/${id}`, {
      method: "DELETE",
    });
  }

  async toggleEffectMapping(id: string): Promise<EffectMapping> {
    return this.request<EffectMapping>(`/effect-mappings/${id}/toggle`, {
      method: "PATCH",
    });
  }

  async findRelevantMappings(
    input: FindRelevantInput
  ): Promise<FindRelevantResponse> {
    return this.request<FindRelevantResponse>("/effect-mappings/relevant", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  // Filter Paper methods
  async listFilterPapers(): Promise<FilterPaperListResponse> {
    return this.request<FilterPaperListResponse>("/filter-papers");
  }

  async getFilterPaper(id: string): Promise<FilterPaper> {
    return this.request<FilterPaper>(`/filter-papers/${id}`);
  }

  async createFilterPaper(data: FilterPaperFormData): Promise<FilterPaper> {
    return this.request<FilterPaper>("/filter-papers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateFilterPaper(
    id: string,
    data: FilterPaperFormData
  ): Promise<FilterPaper> {
    return this.request<FilterPaper>(`/filter-papers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteFilterPaper(id: string): Promise<void> {
    return this.request<void>(`/filter-papers/${id}`, {
      method: "DELETE",
    });
  }

  // Mineral Profile methods
  async listMineralProfiles(): Promise<MineralProfileListResponse> {
    return this.request<MineralProfileListResponse>("/mineral-profiles");
  }

  // Recommendation methods
  async getRecommendations(
    experimentId: string
  ): Promise<RecommendationsResponse> {
    return this.request<RecommendationsResponse>("/recommendations", {
      method: "POST",
      body: JSON.stringify({ experiment_id: experimentId }),
    });
  }

  async dismissMapping(
    experimentId: string,
    mappingId: string
  ): Promise<void> {
    return this.request<void>(`/experiments/${experimentId}/dismiss-mapping`, {
      method: "POST",
      body: JSON.stringify({ mapping_id: mappingId }),
    });
  }

  async undoDismissMapping(
    experimentId: string,
    mappingId: string
  ): Promise<void> {
    return this.request<void>(
      `/experiments/${experimentId}/dismiss-mapping/${mappingId}`,
      {
        method: "DELETE",
      }
    );
  }

  async getDismissedMappings(
    experimentId: string
  ): Promise<DismissedMappingsResponse> {
    return this.request<DismissedMappingsResponse>(
      `/experiments/${experimentId}/dismissed-mappings`
    );
  }

  async tryMapping(
    experimentId: string,
    input: TryMappingInput
  ): Promise<ExperimentResponse> {
    return this.request<ExperimentResponse>(
      `/experiments/${experimentId}/try-mapping`,
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
  }

  async getExperimentsWithGaps(
    page?: number,
    pageSize?: number
  ): Promise<ExperimentsWithGapsResponse> {
    const searchParams = new URLSearchParams();
    if (page !== undefined) {
      searchParams.append("page", String(page));
    }
    if (pageSize !== undefined) {
      searchParams.append("page_size", String(pageSize));
    }
    const query = searchParams.toString();
    return this.request<ExperimentsWithGapsResponse>(
      `/experiments/with-gaps${query ? `?${query}` : ""}`
    );
  }

  // Compare experiments
  async compareExperiments(
    experimentIds: string[]
  ): Promise<CompareExperimentsResponse> {
    return this.request<CompareExperimentsResponse>("/experiments/compare", {
      method: "POST",
      body: JSON.stringify({ experiment_ids: experimentIds }),
    });
  }

  // Analyze experiments
  async analyzeExperiments(
    input: AnalyzeExperimentsInput
  ): Promise<AnalyzeExperimentsResponse> {
    return this.request<AnalyzeExperimentsResponse>("/experiments/analyze", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  // Analyze detail
  async analyzeDetail(
    input: AnalyzeDetailInput
  ): Promise<AnalyzeDetailResponse> {
    return this.request<AnalyzeDetailResponse>("/experiments/analyze/detail", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  // Export experiments
  async exportExperiments(
    params?: ExperimentListParams,
    format: "csv" | "json" = "csv"
  ): Promise<Blob> {
    const searchParams = new URLSearchParams();
    searchParams.append("format", format);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
    }

    const headers: HeadersInit = {};
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(
      `${API_BASE}/experiments/export?${searchParams.toString()}`,
      {
        headers,
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Export failed");
    }

    return response.blob();
  }
}

export const api = new ApiClient();
