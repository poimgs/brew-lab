import client from './client';

export interface BestExperiment {
  id: string;
  brew_date: string;
  overall_score?: number | null;
  ratio?: number | null;
  water_temperature?: number | null;
  filter_paper_name?: string | null;
  mineral_additions?: string | null;
  bloom_time?: number | null;
  pour_count: number;
  pour_styles: string[];
}

export interface RecentCoffee {
  id: string;
  name: string;
  roaster: string;
  last_brewed_at: string;
  best_experiment?: BestExperiment | null;
  improvement_note?: string | null;
}

export interface HomeResponse {
  recent_coffees: RecentCoffee[];
}

/**
 * Get home page data - recently brewed coffees with best experiment info
 * @param limit Number of coffees to fetch (default 10, max 20)
 */
export async function getHome(limit = 10): Promise<HomeResponse> {
  const response = await client.get<HomeResponse>('/home', {
    params: { limit },
  });
  return response.data;
}
