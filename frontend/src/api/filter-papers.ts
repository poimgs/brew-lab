import client from './client';

export interface FilterPaper {
  id: string;
  name: string;
  brand?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FilterPaperInput {
  name: string;
  brand?: string;
  notes?: string;
}

export interface ListFilterPapersParams {
  page?: number;
  per_page?: number;
  sort?: string;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ListFilterPapersResponse {
  items: FilterPaper[];
  pagination: Pagination;
}

export async function listFilterPapers(params: ListFilterPapersParams = {}): Promise<ListFilterPapersResponse> {
  const response = await client.get<ListFilterPapersResponse>('/filter-papers', { params });
  return response.data;
}

export async function getFilterPaper(id: string): Promise<FilterPaper> {
  const response = await client.get<FilterPaper>(`/filter-papers/${id}`);
  return response.data;
}

export async function createFilterPaper(data: FilterPaperInput): Promise<FilterPaper> {
  const response = await client.post<FilterPaper>('/filter-papers', data);
  return response.data;
}

export async function updateFilterPaper(id: string, data: FilterPaperInput): Promise<FilterPaper> {
  const response = await client.put<FilterPaper>(`/filter-papers/${id}`, data);
  return response.data;
}

export async function deleteFilterPaper(id: string): Promise<void> {
  await client.delete(`/filter-papers/${id}`);
}
