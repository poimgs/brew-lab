import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Pencil, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type CoffeeReference, type ReferenceBrew, type CoffeeGoalSummary } from '@/api/coffees';

interface ReferenceSidebarProps {
  reference: CoffeeReference | null;
  isLoading: boolean;
  onCopyParameters: (brew: ReferenceBrew) => void;
  onEditGoals?: () => void;
  onChangeReference?: () => void;
  embedded?: boolean;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function ParameterRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function GoalRow({ label, value }: { label: string; value: number | undefined | null }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}/10</span>
    </div>
  );
}

function BrewSection({ brew }: { brew: ReferenceBrew }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        {brew.is_best ? (
          <>
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span>Reference Brew</span>
          </>
        ) : (
          <span>Latest Brew</span>
        )}
        <span>·</span>
        <span>{formatDate(brew.brew_date)}</span>
      </div>

      <ParameterRow label="Coffee" value={brew.coffee_weight ? `${brew.coffee_weight}g` : null} />
      <ParameterRow label="Ratio" value={brew.ratio ? `1:${brew.ratio}` : null} />
      <ParameterRow label="Water" value={brew.water_weight ? `${brew.water_weight}g` : null} />
      <ParameterRow label="Grind" value={brew.grind_size} />
      <ParameterRow label="Temp" value={brew.water_temperature ? `${brew.water_temperature}°C` : null} />
      <ParameterRow
        label="Filter"
        value={brew.filter_paper ? `${brew.filter_paper.name}${brew.filter_paper.brand ? ` (${brew.filter_paper.brand})` : ''}` : null}
      />
      <ParameterRow
        label="Bloom"
        value={brew.bloom_water || brew.bloom_time ?
          `${brew.bloom_water ? `${brew.bloom_water}g` : ''}${brew.bloom_water && brew.bloom_time ? ' / ' : ''}${brew.bloom_time ? `${brew.bloom_time}s` : ''}`
          : null}
      />
      <ParameterRow label="Total Time" value={brew.total_brew_time ? formatTime(brew.total_brew_time) : null} />

      {(brew.tds || brew.extraction_yield || brew.overall_score) && (
        <>
          <div className="border-t my-3" />
          <ParameterRow label="TDS" value={brew.tds ? `${brew.tds}%` : null} />
          <ParameterRow label="Extraction" value={brew.extraction_yield ? `${brew.extraction_yield}%` : null} />
          <ParameterRow label="Score" value={brew.overall_score ? `${brew.overall_score}/10` : null} />
        </>
      )}
    </div>
  );
}

function GoalsSection({ goals, onEdit }: { goals: CoffeeGoalSummary; onEdit?: () => void }) {
  const hasGoals = goals.coffee_ml || goals.tds || goals.extraction_yield ||
    goals.brightness_intensity || goals.sweetness_intensity ||
    goals.body_intensity || goals.flavor_intensity ||
    goals.cleanliness_intensity || goals.complexity_intensity ||
    goals.balance_intensity || goals.overall_score ||
    goals.aroma_intensity || goals.aftertaste_intensity;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Target Goals</span>
        {onEdit && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>

      {hasGoals ? (
        <div className="space-y-1">
          <ParameterRow label="Coffee" value={goals.coffee_ml ? `${goals.coffee_ml}ml` : null} />
          <ParameterRow label="TDS" value={goals.tds ? `${goals.tds}%` : null} />
          <ParameterRow label="Extraction" value={goals.extraction_yield ? `${goals.extraction_yield}%` : null} />
          <GoalRow label="Aroma" value={goals.aroma_intensity} />
          <GoalRow label="Body" value={goals.body_intensity} />
          <GoalRow label="Flavor" value={goals.flavor_intensity} />
          <GoalRow label="Brightness" value={goals.brightness_intensity} />
          <GoalRow label="Sweetness" value={goals.sweetness_intensity} />
          <GoalRow label="Cleanliness" value={goals.cleanliness_intensity} />
          <GoalRow label="Complexity" value={goals.complexity_intensity} />
          <GoalRow label="Balance" value={goals.balance_intensity} />
          <GoalRow label="Aftertaste" value={goals.aftertaste_intensity} />
          <GoalRow label="Overall" value={goals.overall_score} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No goals set yet.</p>
      )}

    </div>
  );
}

export default function ReferenceSidebar({
  reference,
  isLoading,
  onCopyParameters,
  onEditGoals,
  onChangeReference,
  embedded = false,
}: ReferenceSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className={embedded ? '' : 'border rounded-lg p-4'}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!reference) {
    return null;
  }

  const { brew, goals } = reference;
  const hasContent = brew || goals;

  const content = hasContent ? (
    <div className="space-y-4">
      {brew && (
        <>
          <BrewSection brew={brew} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => onCopyParameters(brew)}
          >
            <Copy className="h-3 w-3" />
            Copy Parameters
          </Button>
        </>
      )}

      {goals && (
        <div className={brew ? 'pt-4 border-t' : ''}>
          <GoalsSection goals={goals} onEdit={onEditGoals} />
        </div>
      )}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">
      No brews yet for this coffee. Reference data will appear after you log some brews.
    </p>
  );

  // Embedded mode: no border wrapper or collapse toggle (used inside Sheet)
  if (embedded) {
    return (
      <div className="space-y-4">
        {onChangeReference && brew && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onChangeReference}
          >
            Change
          </Button>
        )}
        {content}
      </div>
    );
  }

  // Normal mode: collapsible card with border
  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 font-medium hover:text-foreground/80 transition-colors"
        >
          <span>Reference</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {onChangeReference && brew && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onChangeReference}
          >
            Change
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t">
          {content}
        </div>
      )}
    </div>
  );
}
