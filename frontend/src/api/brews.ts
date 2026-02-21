import client from "./client"
import type { PaginatedResponse } from "./filterPapers"

export interface BrewPour {
  pour_number: number
  water_amount: number | null
  pour_style: string | null
  wait_time: number | null
}

export interface BrewFilterPaper {
  id: string
  name: string
  brand: string | null
}

export interface BrewDripper {
  id: string
  name: string
  brand: string | null
}

export interface Brew {
  id: string
  coffee_id: string
  coffee_name: string
  coffee_roaster: string
  coffee_tasting_notes: string | null
  coffee_reference_brew_id: string | null
  brew_date: string
  days_off_roast: number | null
  coffee_weight: number | null
  ratio: number | null
  water_weight: number | null
  grind_size: number | null
  water_temperature: number | null
  filter_paper: BrewFilterPaper | null
  dripper: BrewDripper | null
  pours: BrewPour[]
  total_brew_time: number | null
  technique_notes: string | null
  coffee_ml: number | null
  tds: number | null
  extraction_yield: number | null
  aroma_intensity: number | null
  body_intensity: number | null
  sweetness_intensity: number | null
  brightness_intensity: number | null
  complexity_intensity: number | null
  aftertaste_intensity: number | null
  overall_score: number | null
  overall_notes: string | null
  improvement_notes: string | null
  created_at: string
  updated_at: string
}

export interface BrewPourRequest {
  pour_number: number
  water_amount?: number | null
  pour_style?: string | null
  wait_time?: number | null
}

export interface BrewRequest {
  coffee_id: string
  brew_date?: string | null
  coffee_weight?: number | null
  ratio?: number | null
  grind_size?: number | null
  water_temperature?: number | null
  filter_paper_id?: string | null
  dripper_id?: string | null
  pours?: BrewPourRequest[]
  total_brew_time?: number | null
  technique_notes?: string | null
  coffee_ml?: number | null
  tds?: number | null
  aroma_intensity?: number | null
  body_intensity?: number | null
  sweetness_intensity?: number | null
  brightness_intensity?: number | null
  complexity_intensity?: number | null
  aftertaste_intensity?: number | null
  overall_score?: number | null
  overall_notes?: string | null
  improvement_notes?: string | null
}

export interface BrewListParams {
  page?: number
  per_page?: number
  sort?: string
  coffee_id?: string
  score_gte?: number
  score_lte?: number
  has_tds?: boolean
  date_from?: string
  date_to?: string
}

export interface ReferenceResponse {
  brew: Brew | null
  source: "starred" | "latest"
}

export async function listBrews(
  params: BrewListParams = {}
): Promise<PaginatedResponse<Brew>> {
  const res = await client.get<PaginatedResponse<Brew>>("/brews", {
    params: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      ...(params.sort && { sort: params.sort }),
      ...(params.coffee_id && { coffee_id: params.coffee_id }),
      ...(params.score_gte != null && { score_gte: params.score_gte }),
      ...(params.score_lte != null && { score_lte: params.score_lte }),
      ...(params.has_tds != null && { has_tds: String(params.has_tds) }),
      ...(params.date_from && { date_from: params.date_from }),
      ...(params.date_to && { date_to: params.date_to }),
    },
  })
  return res.data
}

export async function listBrewsByCoffee(
  coffeeId: string,
  params: BrewListParams = {}
): Promise<PaginatedResponse<Brew>> {
  const res = await client.get<PaginatedResponse<Brew>>(
    `/coffees/${coffeeId}/brews`,
    {
      params: {
        page: params.page ?? 1,
        per_page: params.per_page ?? 20,
        ...(params.sort && { sort: params.sort }),
        ...(params.score_gte != null && { score_gte: params.score_gte }),
        ...(params.score_lte != null && { score_lte: params.score_lte }),
        ...(params.has_tds != null && { has_tds: String(params.has_tds) }),
        ...(params.date_from && { date_from: params.date_from }),
        ...(params.date_to && { date_to: params.date_to }),
      },
    }
  )
  return res.data
}

export async function getRecentBrews(limit = 5): Promise<{ items: Brew[] }> {
  const res = await client.get<{ items: Brew[] }>("/brews/recent", {
    params: { limit },
  })
  return res.data
}

export async function getBrew(id: string): Promise<Brew> {
  const res = await client.get<Brew>(`/brews/${id}`)
  return res.data
}

export async function createBrew(data: BrewRequest): Promise<Brew> {
  const res = await client.post<Brew>("/brews", data)
  return res.data
}

export async function updateBrew(
  id: string,
  data: BrewRequest
): Promise<Brew> {
  const res = await client.put<Brew>(`/brews/${id}`, data)
  return res.data
}

export async function deleteBrew(id: string): Promise<void> {
  await client.delete(`/brews/${id}`)
}

export async function getReference(
  coffeeId: string
): Promise<ReferenceResponse> {
  const res = await client.get<ReferenceResponse>(
    `/coffees/${coffeeId}/reference`
  )
  return res.data
}
