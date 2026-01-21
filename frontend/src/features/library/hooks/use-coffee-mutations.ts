import { useState } from "react";
import { api, type Coffee, type CoffeeFormData } from "@/lib/api";

interface UseCoffeeMutationsResult {
  createCoffee: (data: CoffeeFormData) => Promise<Coffee>;
  updateCoffee: (id: string, data: CoffeeFormData) => Promise<Coffee>;
  deleteCoffee: (id: string) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
}

export function useCoffeeMutations(): UseCoffeeMutationsResult {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCoffee = async (data: CoffeeFormData): Promise<Coffee> => {
    setIsCreating(true);
    setError(null);
    try {
      const response = await api.createCoffee(data);
      return response.data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create coffee";
      setError(message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const updateCoffee = async (
    id: string,
    data: CoffeeFormData
  ): Promise<Coffee> => {
    setIsUpdating(true);
    setError(null);
    try {
      const response = await api.updateCoffee(id, data);
      return response.data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update coffee";
      setError(message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteCoffee = async (id: string): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    try {
      await api.deleteCoffee(id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete coffee";
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const clearError = () => setError(null);

  return {
    createCoffee,
    updateCoffee,
    deleteCoffee,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    clearError,
  };
}
