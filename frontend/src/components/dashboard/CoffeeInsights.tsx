import { Lightbulb, Check } from 'lucide-react';
import type { GoalTrendResponse } from '@/api/coffees';
import type { AnalyzeResponse } from '@/api/experiments';

interface CoffeeInsightsProps {
  trends: GoalTrendResponse | null;
  correlations: AnalyzeResponse | null;
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

const inputLabels: Record<string, string> = {
  coffee_weight: 'dose',
  water_weight: 'water amount',
  water_temperature: 'temperature',
  grind_size: 'grind size',
  bloom_time: 'bloom time',
  total_brew_time: 'brew time',
  days_off_roast: 'days off roast',
};

function formatValue(key: string, value: number): string {
  if (key === 'tds') return value.toFixed(2);
  if (key === 'extraction_yield' || key === 'coffee_ml') return value.toFixed(1);
  return String(value);
}

interface InsightItem {
  type: 'change' | 'worked';
  message: string;
}

function generateInsights(
  trends: GoalTrendResponse | null,
  correlations: AnalyzeResponse | null
): InsightItem[] {
  const insights: InsightItem[] = [];
  if (!trends) return insights;

  const metrics = trends.metrics;

  for (const [key, metric] of Object.entries(metrics)) {
    const label = metricLabels[key] || key;
    const latestValue = metric.values.length > 0
      ? metric.values[metric.values.length - 1].value
      : null;

    if (metric.target_met) {
      insights.push({
        type: 'worked',
        message: `${label} goal reached (${latestValue !== null ? formatValue(key, latestValue) : '?'} / ${formatValue(key, metric.target)} target)`,
      });
      continue;
    }

    if (latestValue === null) continue;

    const gap = metric.target - latestValue;
    const gapStr = formatValue(key, Math.abs(gap));
    let suggestion = `${label} is ${gapStr} ${gap > 0 ? 'below' : 'above'} target`;

    // Find strongest correlated input for this metric
    if (correlations) {
      let bestInput: string | null = null;
      let bestR = 0;

      for (const input of correlations.inputs) {
        const corr = correlations.correlations[input]?.[key];
        if (corr && Math.abs(corr.r) > Math.abs(bestR) && Math.abs(corr.r) >= 0.3) {
          bestR = corr.r;
          bestInput = input;
        }
      }

      if (bestInput) {
        const inputLabel = inputLabels[bestInput] || bestInput;
        const direction = (gap > 0 && bestR > 0) || (gap < 0 && bestR < 0)
          ? 'increasing' : 'decreasing';
        suggestion += ` \u2014 ${inputLabel} correlates ${bestR > 0 ? 'positively' : 'negatively'} (${bestR > 0 ? '+' : ''}${bestR.toFixed(2)}), try ${direction} it`;
      }
    }

    insights.push({ type: 'change', message: suggestion });

    // Check if trending in right direction
    if (metric.values.length >= 2) {
      const prev = metric.values[metric.values.length - 2].value;
      const improving = gap > 0 ? latestValue > prev : latestValue < prev;
      if (improving) {
        insights.push({
          type: 'worked',
          message: `${label} trending in the right direction (${formatValue(key, prev)} \u2192 ${formatValue(key, latestValue)})`,
        });
      }
    }
  }

  return insights;
}

export default function CoffeeInsights({ trends, correlations }: CoffeeInsightsProps) {
  const insights = generateInsights(trends, correlations);

  if (insights.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Not enough data to generate insights yet. Keep brewing and tracking goals.
      </p>
    );
  }

  const changeInsights = insights.filter((i) => i.type === 'change');
  const workedInsights = insights.filter((i) => i.type === 'worked');

  return (
    <div className="space-y-4">
      {changeInsights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-medium">What to change</h4>
          </div>
          <ul className="space-y-1.5">
            {changeInsights.map((insight, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="shrink-0">&bull;</span>
                <span>{insight.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {workedInsights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <h4 className="text-sm font-medium">What worked</h4>
          </div>
          <ul className="space-y-1.5">
            {workedInsights.map((insight, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="shrink-0">&bull;</span>
                <span>{insight.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
