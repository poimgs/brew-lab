import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { listCoffees, type Coffee } from '@/api/coffees';
import { analyzeBrewsWithFilters, type AnalyzeResponse, type AnalyzeFilters } from '@/api/brews';
import GoalProgressCard from '@/components/dashboard/GoalProgressCard';
import CoffeeDrillDown from '@/components/dashboard/CoffeeDrillDown';
import AnalyzeView from '@/components/brew/AnalyzeView';
import DashboardFilters, {
  EMPTY_FILTERS,
  getActiveFilterCount,
  type FilterValues,
} from '@/components/dashboard/DashboardFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';

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

  // Filter state
  const [filterValues, setFilterValues] = useState<FilterValues>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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

  const fetchCorrelations = useCallback(async (filters: AnalyzeFilters = {}) => {
    setAnalyzeLoading(true);
    setAnalyzeError(null);
    try {
      const result = await analyzeBrewsWithFilters(filters);
      setAnalyzeResult(result);
    } catch (err: unknown) {
      // Not enough brews is expected, not an error to show
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

  function buildAnalyzeFilters(values: FilterValues): AnalyzeFilters {
    const filters: AnalyzeFilters = {};
    if (values.selectedCoffeeIds.length > 0) filters.coffee_ids = values.selectedCoffeeIds;
    if (values.dateFrom) filters.date_from = values.dateFrom;
    if (values.dateTo) filters.date_to = values.dateTo;
    if (values.scoreMin) filters.score_min = Number(values.scoreMin);
    if (values.scoreMax) filters.score_max = Number(values.scoreMax);
    return filters;
  }

  function handleApplyFilters() {
    fetchCorrelations(buildAnalyzeFilters(filterValues));
    setMobileFiltersOpen(false);
  }

  function handleClearFilters() {
    setFilterValues(EMPTY_FILTERS);
    fetchCorrelations({});
    setMobileFiltersOpen(false);
  }

  // Filter coffees with brews for display
  const coffeesWithBrews = coffees.filter((c) => c.brew_count > 0);

  // Client-side filter by selected coffee IDs
  const filteredCoffees = filterValues.selectedCoffeeIds.length > 0
    ? coffeesWithBrews.filter((c) => filterValues.selectedCoffeeIds.includes(c.id))
    : coffeesWithBrews;

  const coffeesWithGoals = filteredCoffees.filter((c) => c.goals != null);
  const coffeesWithoutGoals = filteredCoffees.filter((c) => c.goals == null);

  // Sort by last brewed (most recent first)
  const sortByLastBrewed = (a: Coffee, b: Coffee) => {
    if (!a.last_brewed && !b.last_brewed) return 0;
    if (!a.last_brewed) return 1;
    if (!b.last_brewed) return -1;
    return new Date(b.last_brewed).getTime() - new Date(a.last_brewed).getTime();
  };
  coffeesWithGoals.sort(sortByLastBrewed);
  coffeesWithoutGoals.sort(sortByLastBrewed);

  const activeFilterCount = getActiveFilterCount(filterValues);

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          {/* Desktop filter toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="hidden md:flex items-center gap-1.5"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Mobile filter trigger */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="md:hidden flex items-center gap-1.5"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs w-5 h-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Filter dashboard by coffee, date, or score</SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <DashboardFilters
                  coffees={coffeesWithBrews}
                  values={filterValues}
                  onChange={setFilterValues}
                  onClear={handleClearFilters}
                  onApply={handleApplyFilters}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop collapsible filter panel */}
      {showFilters && (
        <Card className="hidden md:block">
          <CardContent className="pt-6">
            <DashboardFilters
              coffees={coffeesWithBrews}
              values={filterValues}
              onChange={setFilterValues}
              onClear={handleClearFilters}
              onApply={handleApplyFilters}
            />
          </CardContent>
        </Card>
      )}

      {/* Goal Progress Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Goal Progress</h2>
        {coffeesWithBrews.length === 0 ? (
          <p className="text-muted-foreground">
            No brews yet. Start brewing and tracking to see progress here.
          </p>
        ) : filteredCoffees.length === 0 ? (
          <p className="text-muted-foreground">
            No coffees match the selected filters.
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
            brewIds={analyzeResult.brew_ids}
            onClose={() => setAnalyzeResult(null)}
          />
        ) : (
          <p className="text-muted-foreground">
            Need at least 5 brews to show correlations. Keep brewing!
          </p>
        )}
      </section>
    </div>
  );
}
