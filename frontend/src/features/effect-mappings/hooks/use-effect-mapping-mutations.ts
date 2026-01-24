import { useState } from "react";
import {
  api,
  type EffectMapping,
  type EffectMappingFormData,
  type EffectMappingUpdateData,
} from "@/lib/api";

interface UseEffectMappingMutationsResult {
  createMapping: (data: EffectMappingFormData) => Promise<EffectMapping>;
  updateMapping: (
    id: string,
    data: EffectMappingUpdateData
  ) => Promise<EffectMapping>;
  deleteMapping: (id: string) => Promise<void>;
  toggleMapping: (id: string) => Promise<EffectMapping>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isToggling: boolean;
  error: string | null;
  clearError: () => void;
}

export function useEffectMappingMutations(): UseEffectMappingMutationsResult {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMapping = async (
    data: EffectMappingFormData
  ): Promise<EffectMapping> => {
    setIsCreating(true);
    setError(null);
    try {
      const response = await api.createEffectMapping(data);
      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create effect mapping";
      setError(message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const updateMapping = async (
    id: string,
    data: EffectMappingUpdateData
  ): Promise<EffectMapping> => {
    setIsUpdating(true);
    setError(null);
    try {
      const response = await api.updateEffectMapping(id, data);
      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update effect mapping";
      setError(message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteMapping = async (id: string): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    try {
      await api.deleteEffectMapping(id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete effect mapping";
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleMapping = async (id: string): Promise<EffectMapping> => {
    setIsToggling(true);
    setError(null);
    try {
      const response = await api.toggleEffectMapping(id);
      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to toggle effect mapping";
      setError(message);
      throw err;
    } finally {
      setIsToggling(false);
    }
  };

  const clearError = () => setError(null);

  return {
    createMapping,
    updateMapping,
    deleteMapping,
    toggleMapping,
    isCreating,
    isUpdating,
    isDeleting,
    isToggling,
    error,
    clearError,
  };
}
