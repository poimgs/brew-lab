import { Check, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { GoalTrendResponse } from '@/api/coffees';

interface GoalTrendsProps {
  trends: GoalTrendResponse;
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

function formatValue(key: string, value: number): string {
  if (key === 'tds') return value.toFixed(2);
  if (key === 'extraction_yield' || key === 'coffee_ml') return value.toFixed(1);
  return String(value);
}

function getTrend(values: { value: number }[]): 'up' | 'down' | 'flat' {
  if (values.length < 2) return 'flat';
  const last = values[values.length - 1].value;
  const prev = values[values.length - 2].value;
  if (last > prev) return 'up';
  if (last < prev) return 'down';
  return 'flat';
}

export default function GoalTrends({ trends }: GoalTrendsProps) {
  const metricKeys = Object.keys(trends.metrics);

  if (metricKeys.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No goals set. Set targets on the coffee detail page to track trends.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {metricKeys.map((key) => {
        const metric = trends.metrics[key];
        const label = metricLabels[key] || key;
        const trend = getTrend(metric.values);
        const latestValue = metric.values.length > 0
          ? metric.values[metric.values.length - 1].value
          : null;

        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-sm font-medium w-24 shrink-0">{label}</span>
            <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto">
              {metric.values.map((v, i) => (
                <span key={i} className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                  {i > 0 && <span className="mx-0.5">{'\u2192'}</span>}
                  {formatValue(key, v.value)}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                target: {formatValue(key, metric.target)}
              </span>
              {metric.target_met ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-blue-500" />
              ) : trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-orange-500" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
