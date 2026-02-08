import client from "./client"

export interface FilterPaper {
  id: string
  name: string
  brand: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FilterPaperRequest {
  name: string
  brand?: string | null
  notes?: string | null
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export async function listFilterPapers(
  page = 1,
  perPage = 20,
  sort = "-created_at"
): Promise<PaginatedResponse<FilterPaper>> {
  const res = await client.get<PaginatedResponse<FilterPaper>>(
    "/filter-papers",
    { params: { page, per_page: perPage, sort } }
  )
  return res.data
}

export async function getFilterPaper(id: string): Promise<FilterPaper> {
  const res = await client.get<FilterPaper>(`/filter-papers/${id}`)
  return res.data
}

export async function createFilterPaper(
  data: FilterPaperRequest
): Promise<FilterPaper> {
  const res = await client.post<FilterPaper>("/filter-papers", data)
  return res.data
}

export async function updateFilterPaper(
  id: string,
  data: FilterPaperRequest
): Promise<FilterPaper> {
  const res = await client.put<FilterPaper>(`/filter-papers/${id}`, data)
  return res.data
}

export async function deleteFilterPaper(id: string): Promise<void> {
  await client.delete(`/filter-papers/${id}`)
}
