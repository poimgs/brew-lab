import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getCoffee, getGoalTrends, type Coffee, type GoalTrendResponse, type CoffeeGoalSummary } from '@/api/coffees';
import { listBrews, analyzeBrewsWithFilters, type Brew, type AnalyzeResponse } from '@/api/brews';
import { listSessions, type Session } from '@/api/sessions';
import SensoryRadarChart from './SensoryRadarChart';
import CoffeeInsights from './CoffeeInsights';
import VariableComparisonChart from './VariableComparisonChart';
import SessionList from '@/components/session/SessionList';
import AnalyzeView from '@/components/brew/AnalyzeView';
import BrewDetailModal from '@/components/brew/BrewDetailModal';

interface CoffeeDrillDownProps {
  coffeeId: string;
}

export default function CoffeeDrillDown({ coffeeId }: CoffeeDrillDownProps) {
  const navigate = useNavigate();

  const [coffee, setCoffee] = useState<Coffee | null>(null);
  const [trends, setTrends] = useState<GoalTrendResponse | null>(null);
  const [brews, setBrews] = useState<Brew[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);

  const [selectedBrewId, setSelectedBrewId] = useState<string | null>(null);
  const [brewModalOpen, setBrewModalOpen] = useState(false);
  const [selectedBrewIds, setSelectedBrewIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [coffeeData, trendsData, brewsData, sessionsData] = await Promise.all([
        getCoffee(coffeeId),
        getGoalTrends(coffeeId).catch(() => null),
        listBrews({ coffee_id: coffeeId, sort: '-brew_date', per_page: 50 }),
        listSessions(coffeeId),
      ]);
      setCoffee(coffeeData);
      setTrends(trendsData);
      setBrews(brewsData.items);
      setSessions(sessionsData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coffee data');
    } finally {
      setIsLoading(false);
    }
  }, [coffeeId]);

  const fetchCorrelations = useCallback(async () => {
    setAnalyzeLoading(true);
    try {
      const result = await analyzeBrewsWithFilters({ coffee_ids: [coffeeId] });
      setAnalyzeResult(result);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string; error?: string } } };
      const apiMessage = apiError.response?.data?.message || apiError.response?.data?.error || '';
      if (apiMessage.includes('minimum')) {
        setAnalyzeResult(null);
      }
    } finally {
      setAnalyzeLoading(false);
    }
  }, [coffeeId]);

  useEffect(() => {
    fetchData();
    fetchCorrelations();
  }, [fetchData, fetchCorrelations]);

  const handleRefresh = async () => {
    await Promise.all([fetchData(), fetchCorrelations()]);
  };

  const brewIds = useMemo(() => brews.map((e) => e.id), [brews]);

  const referenceBrew = useMemo(() => {
    if (brews.length === 0) return null;
    if (coffee?.best_brew_id) {
      const best = brews.find((e) => e.id === coffee.best_brew_id);
      if (best) return best;
    }
    return brews[0];
  }, [brews, coffee?.best_brew_id]);

  const goalSummary = useMemo((): CoffeeGoalSummary | null => {
    if (!trends || Object.keys(trends.metrics).length === 0) return null;
    const sensoryKeys = [
      'aroma_intensity', 'sweetness_intensity', 'body_intensity', 'flavor_intensity',
      'brightness_intensity', 'cleanliness_intensity', 'complexity_intensity',
      'balance_intensity', 'aftertaste_intensity',
    ];
    const hasSensoryGoals = sensoryKeys.some((key) => trends.metrics[key]?.target != null);
    if (!hasSensoryGoals) return null;
    const summary: Record<string, unknown> = { id: '' };
    for (const key of sensoryKeys) {
      if (trends.metrics[key]) {
        summary[key] = trends.metrics[key].target;
      }
    }
    return summary as unknown as CoffeeGoalSummary;
  }, [trends]);

  const handleOpenBrew = (id: string) => {
    setSelectedBrewId(id);
    setBrewModalOpen(true);
  };

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '\u2014';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !coffee) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <p className="text-destructive">{error || 'Coffee not found'}</p>
      </div>
    );
  }

  const isBestBrew = (exp: Brew) => {
    return coffee.best_brew_id === exp.id;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {coffee.name}
              <span className="font-normal text-muted-foreground"> · {coffee.roaster}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {coffee.brew_count} brew{coffee.brew_count !== 1 ? 's' : ''}
              {coffee.last_brewed && (
                <> · Last brewed: {formatShortDate(coffee.last_brewed)}</>
              )}
              {coffee.days_off_roast != null && (
                <> · {coffee.days_off_roast} days off roast</>
              )}
            </p>
          </div>
          <Button size="sm" onClick={() => navigate(`/brews/new?coffee_id=${coffeeId}`)}>
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">New Brew</span>
          </Button>
        </div>
      </div>

      {/* Sensory Profile */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Sensory Profile</h2>
        <SensoryRadarChart referenceBrew={referenceBrew} goals={goalSummary} />
      </section>

      {/* Correlations */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Correlations</h2>
        {analyzeLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : analyzeResult ? (
          <AnalyzeView
            result={analyzeResult}
            brewIds={analyzeResult.brew_ids}
            onClose={() => setAnalyzeResult(null)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Need at least 5 brews for this coffee to show correlations.
          </p>
        )}
      </section>

      {/* Insights */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Insights</h2>
        <CoffeeInsights trends={trends} correlations={analyzeResult} />
      </section>

      {/* Sessions */}
      <section>
        <SessionList
          coffeeId={coffeeId}
          sessions={sessions}
          brews={brews}
          onRefresh={handleRefresh}
        />
      </section>

      {/* Brew History */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Brew History</h2>
        {brews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No brews yet. Start brewing to see history here.
          </p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="hidden sm:table-cell">Grind</TableHead>
                    <TableHead className="hidden sm:table-cell">Ratio</TableHead>
                    <TableHead className="hidden md:table-cell">Temp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brews.map((exp) => {
                    const isBest = isBestBrew(exp);
                    const isSelected = selectedBrewIds.includes(exp.id);

                    return (
                      <TableRow
                        key={exp.id}
                        className="cursor-pointer"
                        onClick={() => handleOpenBrew(exp.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            disabled={selectedBrewIds.length >= 6 && !isSelected}
                            onCheckedChange={(checked) => {
                              setSelectedBrewIds((prev) =>
                                checked
                                  ? [...prev, exp.id]
                                  : prev.filter((id) => id !== exp.id)
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {isBest && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatShortDate(exp.brew_date)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {exp.overall_score != null ? `${exp.overall_score}/10` : '\u2014'}
                        </TableCell>
                        <TableCell className="tabular-nums hidden sm:table-cell">
                          {exp.grind_size ?? '\u2014'}
                        </TableCell>
                        <TableCell className="tabular-nums hidden sm:table-cell">
                          {exp.ratio != null ? `1:${exp.ratio}` : '\u2014'}
                        </TableCell>
                        <TableCell className="tabular-nums hidden md:table-cell">
                          {exp.water_temperature != null ? `${exp.water_temperature}°C` : '\u2014'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Compare Brews */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Compare Brews</h2>
        {selectedBrewIds.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Select 2 or more brews from brew history to compare.
          </p>
        ) : (
          <VariableComparisonChart
            brews={brews.filter((e) => selectedBrewIds.includes(e.id))}
          />
        )}
      </section>

      {/* Brew Detail Modal */}
      <BrewDetailModal
        brewId={selectedBrewId}
        open={brewModalOpen}
        onOpenChange={setBrewModalOpen}
        onRefresh={handleRefresh}
        brewIds={brewIds}
        onNavigate={(id) => setSelectedBrewId(id)}
      />
    </div>
  );
}
