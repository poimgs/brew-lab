import { useNavigate } from 'react-router-dom';
import { Plus, ArchiveRestore, Pencil, Archive } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Coffee } from '@/api/coffees';

interface CoffeeCardProps {
  coffee: Coffee;
  onNewExperiment: (coffeeId: string) => void;
  onEdit: (coffee: Coffee) => void;
  onArchive: (coffeeId: string) => void;
  onReactivate?: (coffeeId: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatPourInfo(bloomTime?: number, pourCount?: number, pourStyles?: string[]): string {
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

export default function CoffeeCard({ coffee, onNewExperiment, onEdit, onArchive, onReactivate }: CoffeeCardProps) {
  const navigate = useNavigate();
  const { best_experiment, improvement_note } = coffee;
  const isArchived = !!coffee.archived_at;

  const handleCardClick = () => {
    navigate(`/coffees/${coffee.id}`);
  };

  const handleNewExperiment = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNewExperiment(coffee.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(coffee);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive(coffee.id);
  };

  const handleReactivate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReactivate?.(coffee.id);
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
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
    >
      <CardContent className="flex flex-col h-full py-4">
        {/* Header: Coffee name and roaster */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base truncate">{coffee.name}</h3>
            {isArchived && (
              <Badge variant="secondary" className="text-xs shrink-0">
                Archived
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{coffee.roaster}</p>
        </div>

        {/* Best Brew info */}
        {best_experiment ? (
          <div className="flex-1 space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Reference Brew ({formatDate(best_experiment.brew_date)})
              </span>
              {best_experiment.overall_score != null && (
                <Badge variant="outline" className="font-bold">
                  {best_experiment.overall_score}/10
                </Badge>
              )}
            </div>

            {paramsLine && (
              <p className="text-muted-foreground truncate">{paramsLine}</p>
            )}

            {pourInfo && (
              <p className="text-muted-foreground truncate">{pourInfo}</p>
            )}

            {improvement_note && (
              <p className="text-muted-foreground italic line-clamp-2 mt-2">
                &ldquo;{improvement_note}&rdquo;
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 text-sm text-muted-foreground">
            No experiments yet
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap gap-2 justify-end">
          {isArchived ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReactivate}
            >
              <ArchiveRestore className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Re-activate</span>
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleNewExperiment}
              >
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">New Experiment</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleEdit}
              >
                <Pencil className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleArchive}
              >
                <Archive className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Archive</span>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
