import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Brew } from '@/api/brews';
import type { CoffeeGoalSummary } from '@/api/coffees';

interface SensoryRadarChartProps {
  referenceBrew: Brew | null;
  goals: CoffeeGoalSummary | null;
}

const SENSORY_DIMENSIONS = [
  { key: 'aroma_intensity', label: 'Aroma' },
  { key: 'sweetness_intensity', label: 'Sweetness' },
  { key: 'body_intensity', label: 'Body' },
  { key: 'flavor_intensity', label: 'Flavor' },
  { key: 'brightness_intensity', label: 'Brightness' },
  { key: 'cleanliness_intensity', label: 'Cleanliness' },
  { key: 'complexity_intensity', label: 'Complexity' },
  { key: 'balance_intensity', label: 'Balance' },
  { key: 'aftertaste_intensity', label: 'Aftertaste' },
] as const;

type SensoryKey = (typeof SENSORY_DIMENSIONS)[number]['key'];

export default function SensoryRadarChart({ referenceBrew, goals }: SensoryRadarChartProps) {
  const hasReference = referenceBrew && SENSORY_DIMENSIONS.some(
    (d) => (referenceBrew as unknown as Record<string, unknown>)[d.key] != null
  );
  const hasGoals = goals && SENSORY_DIMENSIONS.some(
    (d) => (goals as unknown as Record<string, unknown>)[d.key] != null
  );

  if (!hasReference && !hasGoals) {
    return (
      <p className="text-sm text-muted-foreground">
        No sensory data or goals set. Brew a coffee and rate sensory dimensions, or set target goals.
      </p>
    );
  }

  const chartData = SENSORY_DIMENSIONS.map((dim) => {
    const key = dim.key as SensoryKey;
    return {
      label: dim.label,
      reference: hasReference ? (referenceBrew as unknown as Record<string, unknown>)[key] as number | undefined : undefined,
      target: hasGoals ? (goals as unknown as Record<string, unknown>)[key] as number | undefined : undefined,
    };
  });

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={chartData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="label" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} />
          {hasReference && (
            <Radar
              name="Reference"
              dataKey="reference"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              stroke="hsl(var(--primary))"
            />
          )}
          {hasGoals && (
            <Radar
              name="Target"
              dataKey="target"
              fill="none"
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
            />
          )}
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
      {hasReference && !hasGoals && (
        <p className="text-sm text-muted-foreground text-center mt-2">
          Set goals to see target overlay.
        </p>
      )}
      {!hasReference && hasGoals && (
        <p className="text-sm text-muted-foreground text-center mt-2">
          Brew a coffee to see how it compares.
        </p>
      )}
    </div>
  );
}
