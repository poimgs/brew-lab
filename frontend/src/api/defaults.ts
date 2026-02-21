import client from "./client"

export interface PourDefault {
  pour_number: number
  water_amount: number | null
  pour_style: string | null
  wait_time: number | null
}

export interface DefaultsResponse {
  coffee_weight: number | null
  ratio: number | null
  grind_size: number | null
  water_temperature: number | null
  filter_paper_id: string | null
  dripper_id: string | null
  pour_defaults: PourDefault[]
}

export interface PourDefaultRequest {
  pour_number: number
  water_amount?: number | null
  pour_style?: string | null
  wait_time?: number | null
}

export interface UpdateDefaultsRequest {
  coffee_weight?: number | null
  ratio?: number | null
  grind_size?: number | null
  water_temperature?: number | null
  filter_paper_id?: string | null
  dripper_id?: string | null
  pour_defaults?: PourDefaultRequest[]
}

export async function getDefaults(): Promise<DefaultsResponse> {
  const res = await client.get<DefaultsResponse>("/defaults")
  return res.data
}

export async function updateDefaults(
  data: UpdateDefaultsRequest
): Promise<DefaultsResponse> {
  const res = await client.put<DefaultsResponse>("/defaults", data)
  return res.data
}

export async function deleteDefault(field: string): Promise<void> {
  await client.delete(`/defaults/${field}`)
}
