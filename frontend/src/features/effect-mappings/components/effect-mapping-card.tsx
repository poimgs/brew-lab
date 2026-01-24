import type {
  EffectMapping,
  InputVariable,
  MappingDirection,
  EffectDirection,
  Confidence,
} from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

interface EffectMappingCardProps {
  mapping: EffectMapping;
  onClick: () => void;
  onToggle: (e: React.MouseEvent) => void;
  isToggling: boolean;
}

const inputVariableLabels: Record<InputVariable, string> = {
  temperature: "Temperature",
  ratio: "Ratio",
  grind_size: "Grind Size",
  bloom_time: "Bloom Time",
  total_brew_time: "Brew Time",
  coffee_weight: "Coffee Weight",
  pour_count: "Pour Count",
  pour_technique: "Pour Technique",
  filter_type: "Filter Type",
};

const directionLabels: Record<MappingDirection, string> = {
  increase: "Increase",
  decrease: "Decrease",
};

const effectDirectionIcons: Record<EffectDirection, React.ReactNode> = {
  increase: <ArrowUp className="h-3 w-3 text-green-600" />,
  decrease: <ArrowDown className="h-3 w-3 text-red-600" />,
  none: <Minus className="h-3 w-3 text-gray-400" />,
};

const confidenceColors: Record<Confidence, string> = {
  low: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export function EffectMappingCard({
  mapping,
  onClick,
  onToggle,
  isToggling,
}: EffectMappingCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-md ${
        !mapping.active ? "opacity-60" : ""
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg truncate">{mapping.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {directionLabels[mapping.direction]}{" "}
              {inputVariableLabels[mapping.variable]}
            </p>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={mapping.active}
              onCheckedChange={() => onToggle({ stopPropagation: () => {} } as React.MouseEvent)}
              disabled={isToggling}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {mapping.tick_description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {mapping.effects.slice(0, 3).map((effect) => (
            <Badge
              key={effect.id}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {effectDirectionIcons[effect.direction]}
              <span className="capitalize">{effect.output_variable}</span>
            </Badge>
          ))}
          {mapping.effects.length > 3 && (
            <Badge variant="outline">+{mapping.effects.length - 3} more</Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {mapping.source && (
            <span className="truncate max-w-[150px]">
              Source: {mapping.source}
            </span>
          )}
          <div className="flex gap-1">
            {mapping.effects.slice(0, 2).map((effect) => (
              <Badge
                key={effect.id}
                variant="secondary"
                className={`text-[10px] ${confidenceColors[effect.confidence]}`}
              >
                {effect.confidence}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
