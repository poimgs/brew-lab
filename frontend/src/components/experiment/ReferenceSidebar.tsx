import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Pencil, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type CoffeeReference, type ReferenceExperiment, type CoffeeGoalSummary } from '@/api/coffees';

interface ReferenceSidebarProps {
  reference: CoffeeReference | null;
  isLoading: boolean;
  onCopyParameters: (experiment: ReferenceExperiment) => void;
  onEditGoals?: () => void;
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

function ExperimentSection({ experiment }: { experiment: ReferenceExperiment }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        {experiment.is_best ? (
          <>
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span>Best Brew</span>
          </>
        ) : (
          <span>Latest Brew</span>
        )}
        <span>·</span>
        <span>{formatDate(experiment.brew_date)}</span>
      </div>

      <ParameterRow label="Coffee" value={experiment.coffee_weight ? `${experiment.coffee_weight}g` : null} />
      <ParameterRow label="Ratio" value={experiment.ratio ? `1:${experiment.ratio}` : null} />
      <ParameterRow label="Water" value={experiment.water_weight ? `${experiment.water_weight}g` : null} />
      <ParameterRow label="Grind" value={experiment.grind_size} />
      <ParameterRow label="Temp" value={experiment.water_temperature ? `${experiment.water_temperature}°C` : null} />
      <ParameterRow
        label="Filter"
        value={experiment.filter_paper ? `${experiment.filter_paper.name}${experiment.filter_paper.brand ? ` (${experiment.filter_paper.brand})` : ''}` : null}
      />
      <ParameterRow
        label="Bloom"
        value={experiment.bloom_water || experiment.bloom_time ?
          `${experiment.bloom_water ? `${experiment.bloom_water}g` : ''}${experiment.bloom_water && experiment.bloom_time ? ' / ' : ''}${experiment.bloom_time ? `${experiment.bloom_time}s` : ''}`
          : null}
      />
      <ParameterRow label="Total Time" value={experiment.total_brew_time ? formatTime(experiment.total_brew_time) : null} />

      {(experiment.tds || experiment.extraction_yield || experiment.overall_score) && (
        <>
          <div className="border-t my-3" />
          <ParameterRow label="TDS" value={experiment.tds ? `${experiment.tds}%` : null} />
          <ParameterRow label="Extraction" value={experiment.extraction_yield ? `${experiment.extraction_yield}%` : null} />
          <ParameterRow label="Score" value={experiment.overall_score ? `${experiment.overall_score}/10` : null} />
        </>
      )}
    </div>
  );
}

function GoalsSection({ goals, onEdit }: { goals: CoffeeGoalSummary; onEdit?: () => void }) {
  const hasGoals = goals.tds || goals.extraction_yield ||
    goals.acidity_intensity || goals.sweetness_intensity ||
    goals.bitterness_intensity || goals.body_weight ||
    goals.flavor_intensity || goals.overall_score ||
    goals.aroma_intensity || goals.aftertaste_duration || goals.aftertaste_intensity;

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
          <ParameterRow label="TDS" value={goals.tds ? `${goals.tds}%` : null} />
          <ParameterRow label="Extraction" value={goals.extraction_yield ? `${goals.extraction_yield}%` : null} />
          <GoalRow label="Aroma" value={goals.aroma_intensity} />
          <GoalRow label="Acidity" value={goals.acidity_intensity} />
          <GoalRow label="Sweetness" value={goals.sweetness_intensity} />
          <GoalRow label="Bitterness" value={goals.bitterness_intensity} />
          <GoalRow label="Body" value={goals.body_weight} />
          <GoalRow label="Flavor" value={goals.flavor_intensity} />
          <GoalRow label="Aftertaste" value={goals.aftertaste_intensity} />
          <GoalRow label="Overall" value={goals.overall_score} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No goals set yet.</p>
      )}

      {goals.notes && (
        <div className="mt-3 pt-3 border-t">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-1">Improvement Notes</span>
          <p className="text-sm italic text-muted-foreground">"{goals.notes}"</p>
        </div>
      )}
    </div>
  );
}

export default function ReferenceSidebar({
  reference,
  isLoading,
  onCopyParameters,
  onEditGoals,
}: ReferenceSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4">
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

  const { experiment, goals } = reference;
  const hasContent = experiment || goals;

  if (!hasContent) {
    return (
      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 text-left font-medium hover:bg-muted/50 transition-colors"
        >
          <span>Reference</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              No experiments yet for this coffee. Reference data will appear after you log some brews.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left font-medium hover:bg-muted/50 transition-colors"
      >
        <span>Reference</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t space-y-4">
          {experiment && (
            <>
              <ExperimentSection experiment={experiment} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => onCopyParameters(experiment)}
              >
                <Copy className="h-3 w-3" />
                Copy Parameters
              </Button>
            </>
          )}

          {goals && (
            <div className={experiment ? 'pt-4 border-t' : ''}>
              <GoalsSection goals={goals} onEdit={onEditGoals} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
