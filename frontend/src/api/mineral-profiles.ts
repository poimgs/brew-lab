import client from './client';

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
  updated_at: string;
}

export interface ListMineralProfilesResponse {
  items: MineralProfile[];
}

export async function listMineralProfiles(): Promise<ListMineralProfilesResponse> {
  const response = await client.get<ListMineralProfilesResponse>('/mineral-profiles');
  return response.data;
}

export async function getMineralProfile(id: string): Promise<MineralProfile> {
  const response = await client.get<MineralProfile>(`/mineral-profiles/${id}`);
  return response.data;
}
