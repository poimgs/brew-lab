import client from './client';

export interface RecentExperiment {
  id: string;
  brew_date: string;
  coffee_name: string;
  overall_score: number | null;
  notes: string;
  relative_date: 'today' | 'yesterday' | 'this_week' | 'earlier';
}

export interface DashboardResponse {
  recent_experiments: RecentExperiment[];
}

/**
 * Get dashboard data for the home page
 * @param limit Number of recent experiments to fetch (default 10, max 20)
 */
export async function getDashboard(limit = 10): Promise<DashboardResponse> {
  const response = await client.get<DashboardResponse>('/dashboard', {
    params: { limit },
  });
  return response.data;
}
