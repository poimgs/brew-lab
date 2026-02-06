import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { listCoffees, type Coffee } from '@/api/coffees';
import { analyzeExperimentsWithFilters, type AnalyzeResponse } from '@/api/experiments';
import GoalProgressCard from '@/components/dashboard/GoalProgressCard';
import CoffeeDrillDown from '@/components/dashboard/CoffeeDrillDown';
import AnalyzeView from '@/components/experiment/AnalyzeView';

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const coffeeId = searchParams.get('coffee');

  // Per-coffee drill-down mode
  if (coffeeId) {
    return <CoffeeDrillDown coffeeId={coffeeId} />;
  }

  // Landing page
  return <DashboardLanding />;
}

function DashboardLanding() {
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const fetchCoffees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listCoffees({
        include_goals: true,
        include_trend: true,
        per_page: 100,
      });
      setCoffees(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coffees');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCorrelations = useCallback(async () => {
    setAnalyzeLoading(true);
    setAnalyzeError(null);
    try {
      const result = await analyzeExperimentsWithFilters({});
      setAnalyzeResult(result);
    } catch (err: unknown) {
      // Not enough experiments is expected, not an error to show
      const apiError = err as { response?: { data?: { message?: string; error?: string } } };
      const apiMessage = apiError.response?.data?.message || apiError.response?.data?.error || '';
      if (apiMessage.includes('minimum')) {
        setAnalyzeResult(null);
      } else {
        setAnalyzeError(apiMessage || 'Failed to load correlations');
      }
    } finally {
      setAnalyzeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoffees();
    fetchCorrelations();
  }, [fetchCoffees, fetchCorrelations]);

  // Filter coffees with experiments for display
  const coffeesWithExperiments = coffees.filter((c) => c.experiment_count > 0);
  const coffeesWithGoals = coffeesWithExperiments.filter((c) => c.goals != null);
  const coffeesWithoutGoals = coffeesWithExperiments.filter((c) => c.goals == null);

  // Sort by last brewed (most recent first)
  const sortByLastBrewed = (a: Coffee, b: Coffee) => {
    if (!a.last_brewed && !b.last_brewed) return 0;
    if (!a.last_brewed) return 1;
    if (!b.last_brewed) return -1;
    return new Date(b.last_brewed).getTime() - new Date(a.last_brewed).getTime();
  };
  coffeesWithGoals.sort(sortByLastBrewed);
  coffeesWithoutGoals.sort(sortByLastBrewed);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Goal Progress Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Goal Progress</h2>
        {coffeesWithExperiments.length === 0 ? (
          <p className="text-muted-foreground">
            No experiments yet. Start brewing and tracking to see progress here.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {coffeesWithGoals.map((coffee) => (
              <GoalProgressCard key={coffee.id} coffee={coffee} />
            ))}
            {coffeesWithoutGoals.map((coffee) => (
              <GoalProgressCard key={coffee.id} coffee={coffee} />
            ))}
          </div>
        )}
      </section>

      {/* Correlations Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Correlations</h2>
        {analyzeLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : analyzeError ? (
          <p className="text-destructive">{analyzeError}</p>
        ) : analyzeResult ? (
          <AnalyzeView
            result={analyzeResult}
            experimentIds={analyzeResult.experiment_ids}
            onClose={() => setAnalyzeResult(null)}
          />
        ) : (
          <p className="text-muted-foreground">
            Need at least 5 experiments to show correlations. Keep brewing!
          </p>
        )}
      </section>
    </div>
  );
}
