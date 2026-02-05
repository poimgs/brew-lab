import client from './client';

export interface CoffeeGoal {
  id: string;
  coffee_id: string;
  tds?: number;
  extraction_yield?: number;
  aroma_intensity?: number;
  acidity_intensity?: number;
  sweetness_intensity?: number;
  bitterness_intensity?: number;
  body_weight?: number;
  flavor_intensity?: number;
  aftertaste_duration?: number;
  aftertaste_intensity?: number;
  overall_score?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CoffeeGoalInput {
  tds?: number | null;
  extraction_yield?: number | null;
  aroma_intensity?: number | null;
  acidity_intensity?: number | null;
  sweetness_intensity?: number | null;
  bitterness_intensity?: number | null;
  body_weight?: number | null;
  flavor_intensity?: number | null;
  aftertaste_duration?: number | null;
  aftertaste_intensity?: number | null;
  overall_score?: number | null;
  notes?: string | null;
}

export async function getCoffeeGoal(coffeeId: string): Promise<CoffeeGoal | null> {
  try {
    const response = await client.get<CoffeeGoal>(`/coffees/${coffeeId}/goals`);
    return response.data;
  } catch (error) {
    // Return null for 404 (no goals set)
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'status' in error.response &&
      error.response.status === 404
    ) {
      return null;
    }
    throw error;
  }
}

export async function upsertCoffeeGoal(
  coffeeId: string,
  data: CoffeeGoalInput
): Promise<CoffeeGoal> {
  const response = await client.put<CoffeeGoal>(`/coffees/${coffeeId}/goals`, data);
  return response.data;
}

export async function deleteCoffeeGoal(coffeeId: string): Promise<void> {
  await client.delete(`/coffees/${coffeeId}/goals`);
}
