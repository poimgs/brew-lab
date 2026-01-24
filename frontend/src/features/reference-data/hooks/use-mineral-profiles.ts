import { useState, useEffect, useCallback } from "react";
import { api, type MineralProfile } from "@/lib/api";

interface UseMineralProfilesResult {
  mineralProfiles: MineralProfile[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMineralProfiles(): UseMineralProfilesResult {
  const [mineralProfiles, setMineralProfiles] = useState<MineralProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMineralProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.listMineralProfiles();
      setMineralProfiles(response.mineral_profiles);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch mineral profiles"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMineralProfiles();
  }, [fetchMineralProfiles]);

  return {
    mineralProfiles,
    isLoading,
    error,
    refetch: fetchMineralProfiles,
  };
}
