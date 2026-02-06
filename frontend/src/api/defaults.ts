import client from './client';

// Defaults is a map of field names to their default values
export type Defaults = Record<string, string>;

// Supported default field names
export const SUPPORTED_FIELDS = [
  'coffee_weight',
  'water_weight',
  'ratio',
  'grind_size',
  'water_temperature',
  'filter_paper_id',
  'bloom_water',
  'bloom_time',
  'pour_defaults',
] as const;

export type DefaultField = (typeof SUPPORTED_FIELDS)[number];

// Pour default template stored as JSON string in pour_defaults field
export interface PourDefault {
  water_amount?: number;
  pour_style?: string;
  notes?: string;
}

export async function getDefaults(): Promise<Defaults> {
  const response = await client.get<Defaults>('/defaults');
  return response.data;
}

export async function updateDefaults(data: Partial<Defaults>): Promise<Defaults> {
  const response = await client.put<Defaults>('/defaults', data);
  return response.data;
}

export async function deleteDefault(field: DefaultField): Promise<void> {
  await client.delete(`/defaults/${field}`);
}
