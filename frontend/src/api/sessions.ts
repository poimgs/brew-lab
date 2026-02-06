import client from './client';

export interface ExperimentSummary {
  id: string;
  brew_date: string;
  grind_size?: number;
  overall_score?: number;
  overall_notes: string;
}

export interface Session {
  id: string;
  user_id: string;
  coffee_id: string;
  name: string;
  variable_tested: string;
  hypothesis?: string;
  conclusion?: string;
  experiment_count: number;
  experiments?: ExperimentSummary[];
  created_at: string;
  updated_at: string;
}

export interface CreateSessionInput {
  coffee_id: string;
  name: string;
  variable_tested: string;
  hypothesis?: string;
  experiment_ids?: string[];
}

export interface UpdateSessionInput {
  name?: string;
  variable_tested?: string;
  hypothesis?: string;
  conclusion?: string;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ListSessionsResponse {
  items: Session[];
  pagination: Pagination;
}

export async function listSessions(coffeeId: string): Promise<ListSessionsResponse> {
  const response = await client.get<ListSessionsResponse>('/sessions', {
    params: { coffee_id: coffeeId },
  });
  return response.data;
}

export async function getSession(id: string): Promise<Session> {
  const response = await client.get<Session>(`/sessions/${id}`);
  return response.data;
}

export async function createSession(data: CreateSessionInput): Promise<Session> {
  const response = await client.post<Session>('/sessions', data);
  return response.data;
}

export async function updateSession(id: string, data: UpdateSessionInput): Promise<Session> {
  const response = await client.put<Session>(`/sessions/${id}`, data);
  return response.data;
}

export async function deleteSession(id: string): Promise<void> {
  await client.delete(`/sessions/${id}`);
}

export async function linkExperiments(sessionId: string, experimentIds: string[]): Promise<Session> {
  const response = await client.post<Session>(`/sessions/${sessionId}/experiments`, {
    experiment_ids: experimentIds,
  });
  return response.data;
}

export async function unlinkExperiment(sessionId: string, experimentId: string): Promise<void> {
  await client.delete(`/sessions/${sessionId}/experiments/${experimentId}`);
}
