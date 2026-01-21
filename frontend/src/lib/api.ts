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
  data: {
    access_token: string;
  };
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
  data: Coffee[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
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
  filter_type?: string;
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
  // Nested
  coffee?: Coffee;
  issue_tags?: IssueTag[];
  created_at: string;
  updated_at: string;
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
  filter_type?: string;
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
}

export interface ExperimentListParams {
  page?: number;
  page_size?: number;
  coffee_id?: string;
  min_score?: number;
  max_score?: number;
  start_date?: string;
  end_date?: string;
  tag_id?: string;
  sort_by?: "brew_date" | "created_at" | "overall_score";
  sort_dir?: "asc" | "desc";
}

export interface ExperimentListResponse {
  data: Experiment[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface ExperimentResponse {
  data: Experiment;
}

export interface TagListResponse {
  data: IssueTag[];
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
    this.accessToken = response.data.access_token;
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
}

export const api = new ApiClient();
