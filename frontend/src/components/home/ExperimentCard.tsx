import { Card, CardContent } from '@/components/ui/card';
import type { RecentExperiment } from '@/api/dashboard';

interface ExperimentCardProps {
  experiment: RecentExperiment;
}

function formatRelativeDate(
  relativeDate: RecentExperiment['relative_date'],
  brewDate: string
): string {
  const date = new Date(brewDate);
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  switch (relativeDate) {
    case 'today':
      return `Today, ${timeStr}`;
    case 'yesterday':
      return `Yesterday, ${timeStr}`;
    case 'this_week':
      const dayName = date.toLocaleDateString([], { weekday: 'long' });
      return `${dayName}, ${timeStr}`;
    case 'earlier':
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    default:
      return date.toLocaleDateString();
  }
}

export default function ExperimentCard({ experiment }: ExperimentCardProps) {
  return (
    <Card className="flex-shrink-0 w-64 h-40">
      <CardContent className="h-full flex flex-col justify-between py-4">
        <div>
          <h3 className="font-semibold text-sm truncate">{experiment.coffee_name}</h3>
          <p className="text-lg font-bold text-teal-600">
            {experiment.overall_score !== null ? `${experiment.overall_score}/10` : '—'}
          </p>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {experiment.notes ? `"${experiment.notes}"` : '—'}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatRelativeDate(experiment.relative_date, experiment.brew_date)}
        </p>
      </CardContent>
    </Card>
  );
}
