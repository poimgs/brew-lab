import { X, ArrowUp, ArrowDown, Minus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type CompareResponse, type DeltaInfo } from '@/api/experiments';

interface CompareViewProps {
  result: CompareResponse;
  onClose: () => void;
}

type TrendIcon = 'up' | 'down' | 'same' | 'variable';

function getTrendIcon(trend: DeltaInfo['trend']): TrendIcon {
  switch (trend) {
    case 'increasing':
      return 'up';
    case 'decreasing':
      return 'down';
    case 'stable':
      return 'same';
    case 'variable':
      return 'variable';
    default:
      return 'variable';
  }
}

function TrendIndicator({ trend }: { trend: TrendIcon }) {
  switch (trend) {
    case 'up':
      return <ArrowUp className="h-4 w-4 text-emerald-500" />;
    case 'down':
      return <ArrowDown className="h-4 w-4 text-destructive" />;
    case 'same':
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    case 'variable':
      return <MoreHorizontal className="h-4 w-4 text-amber-500" />;
    default:
      return null;
  }
}

function formatValue(value: unknown, unit?: string): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'number') {
    const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
    return unit ? `${formatted}${unit}` : formatted;
  }
  return String(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface CompareRow {
  label: string;
  field: string;
  getValue: (exp: CompareResponse['experiments'][0]) => unknown;
  unit?: string;
  section?: 'info' | 'parameters' | 'outcomes';
}

const compareRows: CompareRow[] = [
  // Info section
  {
    label: 'Date',
    field: 'brew_date',
    getValue: (exp) => formatDate(exp.brew_date),
    section: 'info',
  },
  {
    label: 'Coffee',
    field: 'coffee',
    getValue: (exp) => exp.coffee?.name || '—',
    section: 'info',
  },
  {
    label: 'Score',
    field: 'overall_score',
    getValue: (exp) => exp.overall_score,
    section: 'info',
  },
  // Parameters section
  {
    label: 'Dose',
    field: 'coffee_weight',
    getValue: (exp) => exp.coffee_weight,
    unit: 'g',
    section: 'parameters',
  },
  {
    label: 'Water',
    field: 'water_weight',
    getValue: (exp) => exp.water_weight,
    unit: 'g',
    section: 'parameters',
  },
  {
    label: 'Temperature',
    field: 'water_temperature',
    getValue: (exp) => exp.water_temperature,
    unit: '°C',
    section: 'parameters',
  },
  {
    label: 'Grind',
    field: 'grind_size',
    getValue: (exp) => exp.grind_size,
    section: 'parameters',
  },
  {
    label: 'Filter',
    field: 'filter_paper',
    getValue: (exp) => exp.filter_paper?.name || '—',
    section: 'parameters',
  },
  {
    label: 'Days Off Roast',
    field: 'days_off_roast',
    getValue: (exp) => exp.days_off_roast,
    section: 'parameters',
  },
  // Outcomes section
  {
    label: 'Acidity',
    field: 'acidity_intensity',
    getValue: (exp) => exp.acidity_intensity,
    section: 'outcomes',
  },
  {
    label: 'Sweetness',
    field: 'sweetness_intensity',
    getValue: (exp) => exp.sweetness_intensity,
    section: 'outcomes',
  },
  {
    label: 'Bitterness',
    field: 'bitterness_intensity',
    getValue: (exp) => exp.bitterness_intensity,
    section: 'outcomes',
  },
  {
    label: 'Body',
    field: 'body_weight',
    getValue: (exp) => exp.body_weight,
    section: 'outcomes',
  },
  {
    label: 'Aroma',
    field: 'aroma_intensity',
    getValue: (exp) => exp.aroma_intensity,
    section: 'outcomes',
  },
  {
    label: 'Overall',
    field: 'overall_score',
    getValue: (exp) => exp.overall_score,
    section: 'outcomes',
  },
];

export default function CompareView({ result, onClose }: CompareViewProps) {
  const { experiments, deltas } = result;

  const renderDelta = (field: string) => {
    const delta = deltas[field];
    if (!delta) return null;
    return <TrendIndicator trend={getTrendIcon(delta.trend)} />;
  };

  const renderSectionHeader = (title: string) => (
    <tr className="bg-muted/50">
      <td colSpan={experiments.length + 2} className="px-4 py-2 font-medium text-sm">
        {title}
      </td>
    </tr>
  );

  const infoRows = compareRows.filter((r) => r.section === 'info');
  const paramRows = compareRows.filter((r) => r.section === 'parameters');
  const outcomeRows = compareRows.filter((r) => r.section === 'outcomes');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Compare Experiments</h2>
          <p className="text-muted-foreground">
            Comparing {experiments.length} experiments side by side
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1">
          <ArrowUp className="h-3 w-3 text-emerald-500" />
          Increasing
        </Badge>
        <Badge variant="outline" className="gap-1">
          <ArrowDown className="h-3 w-3 text-destructive" />
          Decreasing
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Minus className="h-3 w-3 text-muted-foreground" />
          Same
        </Badge>
        <Badge variant="outline" className="gap-1">
          <MoreHorizontal className="h-3 w-3 text-amber-500" />
          Variable
        </Badge>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium w-[150px]"></th>
              {experiments.map((exp, i) => (
                <th key={exp.id} className="text-left px-4 py-3 font-medium min-w-[120px]">
                  Exp {i + 1}
                </th>
              ))}
              <th className="text-center px-4 py-3 font-medium w-[60px]">Δ</th>
            </tr>
          </thead>
          <tbody>
            {renderSectionHeader('Info')}
            {infoRows.map((row) => (
              <tr key={row.field} className="border-b">
                <td className="px-4 py-2 text-sm font-medium text-muted-foreground">
                  {row.label}
                </td>
                {experiments.map((exp) => (
                  <td key={exp.id} className="px-4 py-2 text-sm tabular-nums">
                    {formatValue(row.getValue(exp), row.unit)}
                  </td>
                ))}
                <td className="px-4 py-2 text-center">
                  {renderDelta(row.field)}
                </td>
              </tr>
            ))}

            {renderSectionHeader('Parameters')}
            {paramRows.map((row) => (
              <tr key={row.field} className="border-b">
                <td className="px-4 py-2 text-sm font-medium text-muted-foreground">
                  {row.label}
                </td>
                {experiments.map((exp) => (
                  <td key={exp.id} className="px-4 py-2 text-sm tabular-nums">
                    {formatValue(row.getValue(exp), row.unit)}
                  </td>
                ))}
                <td className="px-4 py-2 text-center">
                  {renderDelta(row.field)}
                </td>
              </tr>
            ))}

            {renderSectionHeader('Outcomes')}
            {outcomeRows.map((row) => (
              <tr key={row.field} className="border-b last:border-b-0">
                <td className="px-4 py-2 text-sm font-medium text-muted-foreground">
                  {row.label}
                </td>
                {experiments.map((exp) => (
                  <td key={exp.id} className="px-4 py-2 text-sm tabular-nums">
                    {formatValue(row.getValue(exp), row.unit)}
                  </td>
                ))}
                <td className="px-4 py-2 text-center">
                  {renderDelta(row.field)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes comparison */}
      <div className="space-y-4">
        <h3 className="font-medium">Notes</h3>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${experiments.length}, 1fr)` }}>
          {experiments.map((exp, i) => (
            <div key={exp.id} className="rounded-lg border p-4">
              <div className="text-sm font-medium mb-2">Exp {i + 1}</div>
              <p className="text-sm text-muted-foreground">
                {exp.overall_notes || 'No notes'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Back to List
        </Button>
      </div>
    </div>
  );
}
