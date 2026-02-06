import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Coffee, GoalValues, CoffeeGoalSummary } from '@/api/coffees';

interface GoalProgressCardProps {
  coffee: Coffee;
}

const metricLabels: Record<string, string> = {
  coffee_ml: 'Coffee (ml)',
  tds: 'TDS',
  extraction_yield: 'Extraction',
  aroma_intensity: 'Aroma',
  sweetness_intensity: 'Sweetness',
  body_intensity: 'Body',
  flavor_intensity: 'Flavor',
  brightness_intensity: 'Brightness',
  cleanliness_intensity: 'Cleanliness',
  complexity_intensity: 'Complexity',
  balance_intensity: 'Balance',
  aftertaste_intensity: 'Aftertaste',
  overall_score: 'Overall',
};

function formatMetricValue(key: string, value: number): string {
  if (key === 'tds') return value.toFixed(2);
  if (key === 'extraction_yield' || key === 'coffee_ml') return value.toFixed(1);
  return String(value);
}

function getProgressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, (current / target) * 100);
}

interface GoalMetric {
  key: string;
  label: string;
  current: number;
  target: number;
  met: boolean;
}

function extractGoalMetrics(
  goals: CoffeeGoalSummary | undefined | null,
  latestValues: GoalValues | undefined | null
): GoalMetric[] {
  if (!goals) return [];
  const metrics: GoalMetric[] = [];

  const goalKeys = Object.keys(metricLabels) as (keyof CoffeeGoalSummary)[];

  for (const key of goalKeys) {
    const target = goals[key as keyof CoffeeGoalSummary];
    if (target == null || typeof target !== 'number') continue;

    const current = latestValues?.[key as keyof GoalValues] ?? undefined;
    if (current == null) continue;

    metrics.push({
      key,
      label: metricLabels[key] || key,
      current,
      target,
      met: current >= target,
    });
  }

  return metrics;
}

export default function GoalProgressCard({ coffee }: GoalProgressCardProps) {
  const metrics = extractGoalMetrics(coffee.goals, coffee.latest_values);
  const hasGoals = coffee.goals != null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">
              {coffee.name}
              <span className="font-normal text-muted-foreground"> · {coffee.roaster}</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              {coffee.experiment_count} experiment{coffee.experiment_count !== 1 ? 's' : ''}
              {coffee.last_brewed && (
                <>
                  {' · Last brewed: '}
                  {new Date(coffee.last_brewed).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </>
              )}
            </p>
          </div>
          <Link
            to={`/dashboard?coffee=${coffee.id}`}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {metrics.length > 0 ? (
          <div className="space-y-3">
            {metrics.map((metric) => (
              <div key={metric.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{metric.label}</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    {formatMetricValue(metric.key, metric.current)}
                    {' / '}
                    {formatMetricValue(metric.key, metric.target)} target
                    {metric.met && (
                      <Check className="h-4 w-4 text-emerald-500" />
                    )}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      metric.met ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${getProgressPercent(metric.current, metric.target)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : hasGoals ? (
          <p className="text-sm text-muted-foreground">
            No experiment data yet to compare against goals.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Set goals to track progress
          </p>
        )}
      </CardContent>
    </Card>
  );
}
