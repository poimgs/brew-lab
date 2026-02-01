import { useState, useEffect, useCallback } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type MineralProfile, listMineralProfiles } from '@/api/mineral-profiles';
import MineralProfileDetail from './MineralProfileDetail';

export default function MineralProfileList() {
  const [profiles, setProfiles] = useState<MineralProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingProfile, setViewingProfile] = useState<MineralProfile | null>(null);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listMineralProfiles();
      setProfiles(response.items || []);
    } catch (err) {
      setError('Failed to load mineral profiles');
      console.error('Error fetching mineral profiles:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const formatValue = (value?: number, unit?: string) => {
    if (value === null || value === undefined) return '—';
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        <span>Predefined mineral profiles (read-only)</span>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
          <Button variant="link" size="sm" onClick={fetchProfiles} className="ml-2">
            Try again
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && profiles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No mineral profiles available</p>
        </div>
      )}

      {/* Card grid */}
      {!isLoading && !error && profiles.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{profile.name}</CardTitle>
                {profile.brand && (
                  <CardDescription>{profile.brand}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hardness</span>
                    <span className="tabular-nums">{formatValue(profile.hardness, 'ppm')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Magnesium</span>
                    <span className="tabular-nums">{formatValue(profile.magnesium, 'mg/L')}</span>
                  </div>
                </div>

                {profile.taste_effects && (
                  <p className="text-sm text-muted-foreground mt-4 italic">
                    {profile.taste_effects}
                  </p>
                )}

                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingProfile(profile)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <MineralProfileDetail
        profile={viewingProfile}
        onClose={() => setViewingProfile(null)}
      />
    </div>
  );
}
