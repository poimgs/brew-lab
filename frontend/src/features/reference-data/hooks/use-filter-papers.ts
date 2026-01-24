import { useState, useEffect, useCallback } from "react";
import { api, type FilterPaper } from "@/lib/api";

interface UseFilterPapersResult {
  filterPapers: FilterPaper[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFilterPapers(): UseFilterPapersResult {
  const [filterPapers, setFilterPapers] = useState<FilterPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFilterPapers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.listFilterPapers();
      setFilterPapers(response.filter_papers);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch filter papers"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilterPapers();
  }, [fetchFilterPapers]);

  return {
    filterPapers,
    isLoading,
    error,
    refetch: fetchFilterPapers,
  };
}
