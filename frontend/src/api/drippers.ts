import client from "./client"
import type { PaginatedResponse } from "./filterPapers"

export interface Dripper {
  id: string
  name: string
  brand: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DripperRequest {
  name: string
  brand?: string | null
  notes?: string | null
}

export async function listDrippers(
  page = 1,
  perPage = 20,
  sort = "-created_at"
): Promise<PaginatedResponse<Dripper>> {
  const res = await client.get<PaginatedResponse<Dripper>>(
    "/drippers",
    { params: { page, per_page: perPage, sort } }
  )
  return res.data
}

export async function getDripper(id: string): Promise<Dripper> {
  const res = await client.get<Dripper>(`/drippers/${id}`)
  return res.data
}

export async function createDripper(
  data: DripperRequest
): Promise<Dripper> {
  const res = await client.post<Dripper>("/drippers", data)
  return res.data
}

export async function updateDripper(
  id: string,
  data: DripperRequest
): Promise<Dripper> {
  const res = await client.put<Dripper>(`/drippers/${id}`, data)
  return res.data
}

export async function deleteDripper(id: string): Promise<void> {
  await client.delete(`/drippers/${id}`)
}
