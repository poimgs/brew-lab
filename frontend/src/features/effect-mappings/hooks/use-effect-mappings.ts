import { useState, useEffect, useCallback } from "react";
import {
  api,
  type EffectMapping,
  type EffectMappingListParams,
} from "@/lib/api";

interface UseEffectMappingsResult {
  mappings: EffectMapping[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  refetch: () => Promise<void>;
}

export function useEffectMappings(
  params: EffectMappingListParams = {}
): UseEffectMappingsResult {
  const [mappings, setMappings] = useState<EffectMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchMappings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.listEffectMappings(params);
      setMappings(response.mappings);
      setPagination({
        page: response.page,
        pageSize: response.page_size,
        total: response.total_count,
        totalPages: response.total_pages,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch effect mappings"
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    params.page,
    params.page_size,
    params.variable,
    params.active,
    params.search,
    params.sort_by,
    params.sort_dir,
  ]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  return {
    mappings,
    isLoading,
    error,
    pagination,
    refetch: fetchMappings,
  };
}
