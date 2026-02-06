import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getCoffee, getGoalTrends, type Coffee, type GoalTrendResponse } from '@/api/coffees';
import { listExperiments, analyzeExperimentsWithFilters, type Experiment, type AnalyzeResponse } from '@/api/experiments';
import { listSessions, type Session } from '@/api/sessions';
import GoalTrends from './GoalTrends';
import CoffeeInsights from './CoffeeInsights';
import SessionList from '@/components/session/SessionList';
import AnalyzeView from '@/components/experiment/AnalyzeView';
import ExperimentDetailModal from '@/components/experiment/ExperimentDetailModal';

interface CoffeeDrillDownProps {
  coffeeId: string;
}

export default function CoffeeDrillDown({ coffeeId }: CoffeeDrillDownProps) {
  const navigate = useNavigate();

  const [coffee, setCoffee] = useState<Coffee | null>(null);
  const [trends, setTrends] = useState<GoalTrendResponse | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);

  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [experimentModalOpen, setExperimentModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [coffeeData, trendsData, experimentsData, sessionsData] = await Promise.all([
        getCoffee(coffeeId),
        getGoalTrends(coffeeId).catch(() => null),
        listExperiments({ coffee_id: coffeeId, sort: '-brew_date', per_page: 50 }),
        listSessions(coffeeId),
      ]);
      setCoffee(coffeeData);
      setTrends(trendsData);
      setExperiments(experimentsData.items);
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
      const result = await analyzeExperimentsWithFilters({ coffee_ids: [coffeeId] });
      setAnalyzeResult(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes('minimum')) {
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

  const experimentIds = useMemo(() => experiments.map((e) => e.id), [experiments]);

  const handleOpenExperiment = (id: string) => {
    setSelectedExperimentId(id);
    setExperimentModalOpen(true);
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

  const isBestExperiment = (exp: Experiment) => {
    return coffee.best_experiment_id === exp.id;
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
              {coffee.experiment_count} experiment{coffee.experiment_count !== 1 ? 's' : ''}
              {coffee.last_brewed && (
                <> · Last brewed: {formatShortDate(coffee.last_brewed)}</>
              )}
              {coffee.days_off_roast != null && (
                <> · {coffee.days_off_roast} days off roast</>
              )}
            </p>
          </div>
          <Button size="sm" onClick={() => navigate(`/experiments/new?coffee_id=${coffeeId}`)}>
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">New Experiment</span>
          </Button>
        </div>
      </div>

      {/* Goal Trends */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Goal Trends</h2>
        {trends ? (
          <GoalTrends trends={trends} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No goals set. Set targets on the{' '}
            <Link to={`/coffees/${coffeeId}`} className="underline">coffee detail page</Link>{' '}
            to track trends.
          </p>
        )}
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
            experimentIds={analyzeResult.experiment_ids}
            onClose={() => setAnalyzeResult(null)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Need at least 5 experiments for this coffee to show correlations.
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
          experiments={experiments}
          onRefresh={handleRefresh}
        />
      </section>

      {/* Brew History */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Brew History</h2>
        {experiments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No experiments yet. Start brewing to see history here.
          </p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="hidden sm:table-cell">Grind</TableHead>
                    <TableHead className="hidden sm:table-cell">Ratio</TableHead>
                    <TableHead className="hidden md:table-cell">Temp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experiments.map((exp) => {
                    const isBest = isBestExperiment(exp);

                    return (
                      <TableRow
                        key={exp.id}
                        className="cursor-pointer"
                        onClick={() => handleOpenExperiment(exp.id)}
                      >
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

      {/* Experiment Detail Modal */}
      <ExperimentDetailModal
        experimentId={selectedExperimentId}
        open={experimentModalOpen}
        onOpenChange={setExperimentModalOpen}
        onRefresh={handleRefresh}
        experimentIds={experimentIds}
        onNavigate={(id) => setSelectedExperimentId(id)}
      />
    </div>
  );
}
