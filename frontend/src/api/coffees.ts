import client from "./client"
import type { PaginatedResponse } from "./filterPapers"

export interface Coffee {
  id: string
  roaster: string
  name: string
  country: string | null
  farm: string | null
  process: string | null
  roast_level: string | null
  tasting_notes: string | null
  roast_date: string | null
  notes: string | null
  reference_brew_id: string | null
  archived_at: string | null
  brew_count: number
  last_brewed: string | null
  created_at: string
  updated_at: string
}

export interface CoffeeRequest {
  roaster: string
  name: string
  country?: string | null
  farm?: string | null
  process?: string | null
  roast_level?: string | null
  tasting_notes?: string | null
  roast_date?: string | null
  notes?: string | null
}

export interface CoffeeListParams {
  page?: number
  per_page?: number
  search?: string
  roaster?: string
  country?: string
  process?: string
  archived_only?: boolean
}

export interface SuggestionsResponse {
  items: string[]
}

export async function listCoffees(
  params: CoffeeListParams = {}
): Promise<PaginatedResponse<Coffee>> {
  const res = await client.get<PaginatedResponse<Coffee>>("/coffees", {
    params: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      ...(params.search && { search: params.search }),
      ...(params.roaster && { roaster: params.roaster }),
      ...(params.country && { country: params.country }),
      ...(params.process && { process: params.process }),
      ...(params.archived_only && { archived_only: "true" }),
    },
  })
  return res.data
}

export async function getCoffee(id: string): Promise<Coffee> {
  const res = await client.get<Coffee>(`/coffees/${id}`)
  return res.data
}

export async function createCoffee(data: CoffeeRequest): Promise<Coffee> {
  const res = await client.post<Coffee>("/coffees", data)
  return res.data
}

export async function updateCoffee(
  id: string,
  data: CoffeeRequest
): Promise<Coffee> {
  const res = await client.put<Coffee>(`/coffees/${id}`, data)
  return res.data
}

export async function deleteCoffee(id: string): Promise<void> {
  await client.delete(`/coffees/${id}`)
}

export async function archiveCoffee(id: string): Promise<Coffee> {
  const res = await client.post<Coffee>(`/coffees/${id}/archive`)
  return res.data
}

export async function unarchiveCoffee(id: string): Promise<Coffee> {
  const res = await client.post<Coffee>(`/coffees/${id}/unarchive`)
  return res.data
}

export async function setReferenceBrew(
  coffeeId: string,
  brewId: string | null
): Promise<Coffee> {
  const res = await client.post<Coffee>(
    `/coffees/${coffeeId}/reference-brew`,
    { brew_id: brewId }
  )
  return res.data
}

export async function getSuggestions(
  field: string,
  q: string
): Promise<string[]> {
  const res = await client.get<SuggestionsResponse>("/coffees/suggestions", {
    params: { field, q },
  })
  return res.data.items
}
