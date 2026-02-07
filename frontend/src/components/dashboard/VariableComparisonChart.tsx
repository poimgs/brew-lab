import { useState } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Brew } from '@/api/brews';

interface VariableComparisonChartProps {
  brews: Brew[];
}

interface VariableDef {
  key: string;
  label: string;
}

const VARIABLE_GROUPS: Record<string, VariableDef[]> = {
  'Brew Params': [
    { key: 'grind_size', label: 'Grind Size' },
    { key: 'water_temperature', label: 'Temperature' },
    { key: 'ratio', label: 'Ratio' },
    { key: 'bloom_time', label: 'Bloom Time' },
    { key: 'total_brew_time', label: 'Brew Time' },
    { key: 'water_bypass_ml', label: 'Bypass (ml)' },
  ],
  Sensory: [
    { key: 'aroma_intensity', label: 'Aroma' },
    { key: 'sweetness_intensity', label: 'Sweetness' },
    { key: 'body_intensity', label: 'Body' },
    { key: 'flavor_intensity', label: 'Flavor' },
    { key: 'brightness_intensity', label: 'Brightness' },
    { key: 'cleanliness_intensity', label: 'Cleanliness' },
    { key: 'complexity_intensity', label: 'Complexity' },
    { key: 'balance_intensity', label: 'Balance' },
    { key: 'aftertaste_intensity', label: 'Aftertaste' },
  ],
  Outcomes: [
    { key: 'overall_score', label: 'Score' },
    { key: 'tds', label: 'TDS' },
    { key: 'extraction_yield', label: 'Extraction' },
    { key: 'coffee_ml', label: 'Coffee (ml)' },
  ],
};

const DEFAULT_VARIABLES = ['grind_size', 'water_temperature', 'ratio', 'overall_score'];

const BREW_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function VariableComparisonChart({ brews }: VariableComparisonChartProps) {
  const [selectedVariables, setSelectedVariables] = useState<string[]>(DEFAULT_VARIABLES);

  const toggleVariable = (key: string) => {
    setSelectedVariables((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-4">
      {/* Variable toggle buttons */}
      <div className="space-y-3">
        {Object.entries(VARIABLE_GROUPS).map(([group, variables]) => (
          <div key={group}>
            <p className="text-xs font-medium text-muted-foreground mb-1">{group}</p>
            <div className="flex flex-wrap gap-1">
              {variables.map((v) => (
                <Button
                  key={v.key}
                  size="sm"
                  variant={selectedVariables.includes(v.key) ? 'default' : 'outline'}
                  className="h-7 text-xs"
                  onClick={() => toggleVariable(v.key)}
                >
                  {v.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mini charts grid */}
      {selectedVariables.length === 0 ? (
        <p className="text-sm text-muted-foreground">Select variables above to compare.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {selectedVariables.map((varKey) => {
            const varDef = Object.values(VARIABLE_GROUPS)
              .flat()
              .find((v) => v.key === varKey);
            if (!varDef) return null;

            const bars = brews
              .map((brew, idx) => {
                const value = (brew as unknown as Record<string, unknown>)[varKey];
                if (value == null || typeof value !== 'number') return null;
                return {
                  date: formatShortDate(brew.brew_date),
                  value,
                  fill: BREW_COLORS[idx % BREW_COLORS.length],
                };
              })
              .filter(Boolean) as { date: string; value: number; fill: string }[];

            if (bars.length === 0) return null;

            return (
              <Card key={varKey}>
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-sm font-medium">{varDef.label}</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={bars}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" isAnimationActive={false}>
                        {bars.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
