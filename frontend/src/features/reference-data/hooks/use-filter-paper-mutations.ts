import { useState } from "react";
import { api, type FilterPaperFormData } from "@/lib/api";

export function useFilterPaperMutations() {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createFilterPaper = async (data: FilterPaperFormData) => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await api.createFilterPaper(data);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create filter paper";
      setError(message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const updateFilterPaper = async (id: string, data: FilterPaperFormData) => {
    setIsUpdating(true);
    setError(null);
    try {
      const result = await api.updateFilterPaper(id, data);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update filter paper";
      setError(message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteFilterPaper = async (id: string) => {
    setIsDeleting(true);
    setError(null);
    try {
      await api.deleteFilterPaper(id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete filter paper";
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    createFilterPaper,
    updateFilterPaper,
    deleteFilterPaper,
    isCreating,
    isUpdating,
    isDeleting,
    error,
  };
}
