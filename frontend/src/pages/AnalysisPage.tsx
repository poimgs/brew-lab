import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Filter, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type AnalyzeResponse,
  type AnalyzeFilters,
  analyzeExperimentsWithFilters,
} from '@/api/experiments';
import { listCoffees, type Coffee } from '@/api/coffees';
import AnalyzeView from '@/components/experiment/AnalyzeView';

export default function AnalysisPage() {
  // Filter state
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [selectedCoffeeIds, setSelectedCoffeeIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [scoreMin, setScoreMin] = useState<string>('');
  const [scoreMax, setScoreMax] = useState<string>('');
  const [showFilters, setShowFilters] = useState(true);

  // Analysis state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);

  // Fetch coffees for filter dropdown
  useEffect(() => {
    listCoffees({ per_page: 100 }).then((res) => setCoffees(res.items || []));
  }, []);

  const toggleCoffee = (coffeeId: string) => {
    setSelectedCoffeeIds((prev) =>
      prev.includes(coffeeId)
        ? prev.filter((id) => id !== coffeeId)
        : [...prev, coffeeId]
    );
  };

  const selectAllCoffees = () => {
    if (selectedCoffeeIds.length === coffees.length) {
      setSelectedCoffeeIds([]);
    } else {
      setSelectedCoffeeIds(coffees.map((c) => c.id));
    }
  };

  const clearFilters = () => {
    setSelectedCoffeeIds([]);
    setDateFrom('');
    setDateTo('');
    setScoreMin('');
    setScoreMax('');
    setAnalyzeResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: AnalyzeFilters = {};

      if (selectedCoffeeIds.length > 0) {
        filters.coffee_ids = selectedCoffeeIds;
      }
      if (dateFrom) {
        filters.date_from = dateFrom;
      }
      if (dateTo) {
        filters.date_to = dateTo;
      }
      if (scoreMin) {
        filters.score_min = parseInt(scoreMin, 10);
      }
      if (scoreMax) {
        filters.score_max = parseInt(scoreMax, 10);
      }

      const result = await analyzeExperimentsWithFilters(filters);
      setAnalyzeResult(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to analyze experiments';
      // Check for specific error about minimum experiments
      if (errorMessage.includes('not enough') || errorMessage.includes('minimum')) {
        setError('Not enough experiments match your filters. At least 5 experiments are required for analysis.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasFilters = selectedCoffeeIds.length > 0 || dateFrom || dateTo || scoreMin || scoreMax;

  // If we have results, show the analysis view
  if (analyzeResult) {
    return (
      <div className="container mx-auto py-8 px-4">
        <AnalyzeView
          result={analyzeResult}
          experimentIds={analyzeResult.experiment_ids || []}
          onClose={() => setAnalyzeResult(null)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold">Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Discover correlations between brewing variables and outcomes
          </p>
        </div>
        <BarChart3 className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* Info Card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">How Analysis Works</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">
            Analysis calculates correlations between your brewing parameters (temperature, grind
            size, dose, etc.) and outcomes (score, acidity, sweetness, etc.). Use the filters
            below to select which experiments to include. Cross-coffee analysis is supported -
            you can analyze patterns across multiple coffees or focus on a single coffee.
          </CardDescription>
          <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
            <span>Minimum: 5 experiments</span>
            <span>Recommended: 10+ for reliable correlations</span>
          </div>
        </CardContent>
      </Card>

      {/* Filter Panel */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle className="text-base">Filter Experiments</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide' : 'Show'}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="space-y-6">
            {/* Coffee Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Coffees</label>
                <Button variant="ghost" size="sm" onClick={selectAllCoffees}>
                  {selectedCoffeeIds.length === coffees.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                {coffees.map((coffee) => (
                  <div
                    key={coffee.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                    onClick={() => toggleCoffee(coffee.id)}
                  >
                    <Checkbox
                      checked={selectedCoffeeIds.includes(coffee.id)}
                      onCheckedChange={() => toggleCoffee(coffee.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{coffee.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {coffee.roaster}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {coffee.experiment_count}
                    </Badge>
                  </div>
                ))}
                {coffees.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                    No coffees found.{' '}
                    <Link to="/coffees" className="text-primary hover:underline">
                      Add a coffee
                    </Link>{' '}
                    to get started.
                  </p>
                )}
              </div>
              {selectedCoffeeIds.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedCoffeeIds.length} coffee{selectedCoffeeIds.length !== 1 ? 's' : ''}{' '}
                  selected
                </p>
              )}
            </div>

            {/* Date Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <div className="flex gap-2 items-center">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Score Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Score Range</label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Min (1)"
                  value={scoreMin}
                  onChange={(e) => setScoreMin(e.target.value)}
                  className="flex-1"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Max (10)"
                  value={scoreMax}
                  onChange={(e) => setScoreMax(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters}>
                Clear All
              </Button>
              <Button onClick={handleAnalyze} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Run Analysis
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
            {error.includes('5 experiments') && (
              <p className="text-muted-foreground text-sm mt-2">
                Try expanding your filters to include more experiments, or{' '}
                <Link to="/experiments/new" className="text-primary hover:underline">
                  log more experiments
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!error && !analyzeResult && (
        <Card>
          <CardContent className="pt-6 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {hasFilters
                ? 'Click "Run Analysis" to discover correlations in your filtered experiments.'
                : 'Select filters above to narrow down experiments, then run analysis.'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Leave filters empty to analyze all your experiments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
