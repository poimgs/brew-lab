import client from './client';

export interface Coffee {
  id: string;
  roaster: string;
  name: string;
  country?: string;
  region?: string;
  process?: string;
  roast_level?: string;
  tasting_notes?: string;
  roast_date?: string;
  purchase_date?: string;
  notes?: string;
  archived_at?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  // Computed properties
  days_off_roast?: number;
  experiment_count: number;
  last_brewed?: string;
}

export interface CoffeeInput {
  roaster: string;
  name: string;
  country?: string;
  region?: string;
  process?: string;
  roast_level?: string;
  tasting_notes?: string;
  roast_date?: string;
  purchase_date?: string;
  notes?: string;
}

export interface ListCoffeesParams {
  page?: number;
  per_page?: number;
  sort?: string;
  roaster?: string;
  country?: string;
  process?: string;
  search?: string;
  include_archived?: boolean;
  include_deleted?: boolean;
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
