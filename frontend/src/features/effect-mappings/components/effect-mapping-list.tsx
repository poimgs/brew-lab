import type { EffectMapping } from "@/lib/api";
import { EffectMappingCard } from "./effect-mapping-card";
import { Skeleton } from "@/components/ui/skeleton";

interface EffectMappingListProps {
  mappings: EffectMapping[];
  isLoading: boolean;
  error: string | null;
  onSelectMapping: (mapping: EffectMapping) => void;
  onToggleMapping: (mapping: EffectMapping) => void;
  isToggling: boolean;
}

export function EffectMappingList({
  mappings,
  isLoading,
  error,
  onSelectMapping,
  onToggleMapping,
  isToggling,
}: EffectMappingListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (mappings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          No effect mappings found. Create your first mapping to start tracking
          brewing cause-effect relationships.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {mappings.map((mapping) => (
        <EffectMappingCard
          key={mapping.id}
          mapping={mapping}
          onClick={() => onSelectMapping(mapping)}
          onToggle={() => onToggleMapping(mapping)}
          isToggling={isToggling}
        />
      ))}
    </div>
  );
}
