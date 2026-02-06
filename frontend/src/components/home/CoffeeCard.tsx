import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { RecentCoffee } from '@/api/home';

interface CoffeeCardProps {
  coffee: RecentCoffee;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatPourInfo(bloomTime?: number | null, pourCount?: number, pourStyles?: string[]): string {
  const parts: string[] = [];

  if (bloomTime) {
    parts.push(`Bloom ${bloomTime}s`);
  }

  if (pourCount && pourCount > 0) {
    const uniqueStyles = pourStyles && pourStyles.length > 0
      ? [...new Set(pourStyles)].join(', ')
      : null;

    if (uniqueStyles) {
      parts.push(`${pourCount} pours (${uniqueStyles})`);
    } else {
      parts.push(`${pourCount} pours`);
    }
  }

  return parts.join(' \u2192 ');
}

export default function CoffeeCard({ coffee }: CoffeeCardProps) {
  const navigate = useNavigate();
  const { best_experiment, improvement_note } = coffee;

  const handleCardClick = () => {
    navigate(`/coffees/${coffee.id}`);
  };

  const handleNewBrew = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/experiments/new?coffee_id=${coffee.id}`);
  };

  // Build params string: ratio, temp, filter, minerals
  const paramParts: string[] = [];
  if (best_experiment?.ratio) {
    paramParts.push(`1:${best_experiment.ratio}`);
  }
  if (best_experiment?.water_temperature) {
    paramParts.push(`${best_experiment.water_temperature}\u00B0C`);
  }
  if (best_experiment?.filter_paper_name) {
    paramParts.push(best_experiment.filter_paper_name);
  }
  if (best_experiment?.mineral_profile_name) {
    paramParts.push(best_experiment.mineral_profile_name);
  }
  const paramsLine = paramParts.join(' \u00B7 ');

  const pourInfo = best_experiment
    ? formatPourInfo(best_experiment.bloom_time, best_experiment.pour_count, best_experiment.pour_styles)
    : '';

  return (
    <Card
      className="flex-shrink-0 w-full min-h-[200px] cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
    >
      <CardContent className="h-full flex flex-col py-4">
        {/* Header: Coffee name and roaster */}
        <div className="mb-3">
          <h3 className="font-semibold text-base truncate">{coffee.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{coffee.roaster}</p>
        </div>

        {/* Best Brew info */}
        {best_experiment ? (
          <div className="flex-1 space-y-1 text-sm">
            {/* Best brew date and score */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Best Brew ({formatDate(best_experiment.brew_date)})
              </span>
              <span className="font-bold text-primary">
                {best_experiment.overall_score !== null
                  ? `${best_experiment.overall_score}/10`
                  : '\u2014'}
              </span>
            </div>

            {/* Params line */}
            {paramsLine && (
              <p className="text-muted-foreground truncate">{paramsLine}</p>
            )}

            {/* Pour info */}
            {pourInfo && (
              <p className="text-muted-foreground truncate">{pourInfo}</p>
            )}

            {/* Improvement note */}
            {improvement_note && (
              <p className="text-muted-foreground italic line-clamp-2 mt-2">
                "{improvement_note}"
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 text-sm text-muted-foreground">
            No experiments yet
          </div>
        )}

        {/* New Brew button */}
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleNewBrew}
            className="text-primary border-primary hover:bg-primary/10"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Brew
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
