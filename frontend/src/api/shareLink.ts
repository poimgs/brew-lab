import client from "./client"

export interface ShareLink {
  token: string | null
  url: string | null
  created_at: string | null
}

export interface ShareReferenceBrew {
  overall_score: number | null
  aroma_intensity: number | null
  body_intensity: number | null
  sweetness_intensity: number | null
  brightness_intensity: number | null
  complexity_intensity: number | null
  aftertaste_intensity: number | null
}

export interface ShareCoffee {
  roaster: string | null
  name: string
  country: string | null
  region: string | null
  process: string | null
  roast_level: string | null
  tasting_notes: string | null
  roast_date: string | null
  reference_brew: ShareReferenceBrew | null
}

export async function getShareLink(): Promise<ShareLink> {
  const res = await client.get<ShareLink>("/share-link")
  return res.data
}

export async function createShareLink(): Promise<ShareLink> {
  const res = await client.post<ShareLink>("/share-link")
  return res.data
}

export async function revokeShareLink(): Promise<void> {
  await client.delete("/share-link")
}

export async function getSharedCoffees(
  token: string
): Promise<{ items: ShareCoffee[] }> {
  const res = await fetch(`/api/v1/share/${encodeURIComponent(token)}`)
  if (!res.ok) {
    const error = new Error("Failed to fetch shared coffees") as Error & {
      status: number
    }
    error.status = res.status
    throw error
  }
  return res.json()
}
