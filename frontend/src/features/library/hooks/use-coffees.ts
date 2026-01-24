import { useState, useEffect, useCallback } from "react";
import {
  api,
  type Coffee,
  type CoffeeListParams,
} from "@/lib/api";

interface UseCoffeesResult {
  coffees: Coffee[];
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

export function useCoffees(params: CoffeeListParams = {}): UseCoffeesResult {
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0,
  });

  const fetchCoffees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.listCoffees(params);
      setCoffees(response.coffees);
      setPagination({
        page: response.page,
        pageSize: response.page_size,
        total: response.total_count,
        totalPages: response.total_pages,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch coffees");
    } finally {
      setIsLoading(false);
    }
  }, [
    params.page,
    params.page_size,
    params.roaster,
    params.country,
    params.process,
    params.search,
    params.sort_by,
    params.sort_dir,
  ]);

  useEffect(() => {
    fetchCoffees();
  }, [fetchCoffees]);

  return {
    coffees,
    isLoading,
    error,
    pagination,
    refetch: fetchCoffees,
  };
}
