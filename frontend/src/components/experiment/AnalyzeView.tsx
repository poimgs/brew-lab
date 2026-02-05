import { useState } from 'react';
import { X, AlertTriangle, Lightbulb, Table2, Grid3X3 } from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type AnalyzeResponse,
  type AnalyzeDetailResponse,
  type CorrelationResult,
  analyzeExperimentsDetail,
} from '@/api/experiments';

interface AnalyzeViewProps {
  result: AnalyzeResponse;
  experimentIds: string[];
  onClose: () => void;
}

type ViewType = 'table' | 'heatmap';

const variableLabels: Record<string, string> = {
  coffee_weight: 'Dose',
  water_weight: 'Water',
  water_temperature: 'Temp',
  grind_size: 'Grind',
  bloom_time: 'Bloom',
  total_brew_time: 'Brew Time',
  days_off_roast: 'Days Off',
  overall_score: 'Overall',
  acidity_intensity: 'Acidity',
  sweetness_intensity: 'Sweet',
  bitterness_intensity: 'Bitter',
  body_weight: 'Body',
  aroma_intensity: 'Aroma',
  tds: 'TDS',
  extraction_yield: 'EY',
};

function getCorrelationColor(r: number | undefined): string {
  if (r === undefined) return 'bg-muted';

  const absR = Math.abs(r);
  if (absR < 0.1) return 'bg-zinc-200 dark:bg-zinc-600';

  if (r > 0) {
    if (absR >= 0.7) return 'bg-emerald-600 text-white';
    if (absR >= 0.4) return 'bg-emerald-400';
    return 'bg-emerald-200 dark:bg-emerald-700';
  } else {
    if (absR >= 0.7) return 'bg-red-600 text-white';
    if (absR >= 0.4) return 'bg-red-400';
    return 'bg-red-200 dark:bg-red-700';
  }
}

function formatCorrelation(r: number | undefined): string {
  if (r === undefined) return 'N/A';
  const sign = r >= 0 ? '+' : '';
  return `${sign}${r.toFixed(2)}`;
}

export default function AnalyzeView({
  result,
  experimentIds,
  onClose,
}: AnalyzeViewProps) {
  const [viewType, setViewType] = useState<ViewType>('table');
  const [minSamples] = useState(5);
  const [selectedCell, setSelectedCell] = useState<{
    input: string;
    outcome: string;
  } | null>(null);
  const [detailData, setDetailData] = useState<AnalyzeDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleCellClick = async (input: string, outcome: string) => {
    const correlation = result.correlations[input]?.[outcome];
    if (!correlation) return;

    setSelectedCell({ input, outcome });
    setDetailLoading(true);

    try {
      const detail = await analyzeExperimentsDetail(
        experimentIds,
        input,
        outcome
      );
      setDetailData(detail);
    } catch (err) {
      console.error('Error fetching detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedCell(null);
    setDetailData(null);
  };

  const renderCorrelationCell = (
    input: string,
    outcome: string,
    correlation: CorrelationResult | null | undefined
  ) => {
    const colorClass = getCorrelationColor(correlation?.r);
    const value = formatCorrelation(correlation?.r);
    const n = correlation?.n;

    return (
      <td
        key={`${input}-${outcome}`}
        className={`px-2 py-2 text-center text-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all ${colorClass}`}
        onClick={() => handleCellClick(input, outcome)}
        title={n !== undefined ? `n=${n}` : 'No data'}
      >
        {value}
      </td>
    );
  };

  const renderHeatmapCell = (
    input: string,
    outcome: string,
    correlation: CorrelationResult | null | undefined
  ) => {
    const colorClass = getCorrelationColor(correlation?.r);

    return (
      <td
        key={`${input}-${outcome}`}
        className={`w-10 h-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all ${colorClass}`}
        onClick={() => handleCellClick(input, outcome)}
        title={
          correlation?.r !== undefined
            ? `${variableLabels[input]} → ${variableLabels[outcome]}: ${formatCorrelation(correlation.r)} (n=${correlation.n})`
            : 'No data'
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Analyze Experiments</h2>
          <p className="text-muted-foreground">
            Analyzing {result.experiment_count} experiments for correlations
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewType === 'table' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setViewType('table')}
          >
            <Table2 className="h-4 w-4 mr-1" />
            Table
          </Button>
          <Button
            variant={viewType === 'heatmap' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setViewType('heatmap')}
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            Heatmap
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Min samples:</span>
          <Select value={String(minSamples)} disabled>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 20, 30, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Color Legend */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1">
          <div className="w-3 h-3 rounded bg-emerald-600" />
          Strong +
        </Badge>
        <Badge variant="outline" className="gap-1">
          <div className="w-3 h-3 rounded bg-emerald-400" />
          Moderate +
        </Badge>
        <Badge variant="outline" className="gap-1">
          <div className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-700" />
          Weak +
        </Badge>
        <Badge variant="outline" className="gap-1">
          <div className="w-3 h-3 rounded bg-zinc-200 dark:bg-zinc-600" />
          None
        </Badge>
        <Badge variant="outline" className="gap-1">
          <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-700" />
          Weak -
        </Badge>
        <Badge variant="outline" className="gap-1">
          <div className="w-3 h-3 rounded bg-red-400" />
          Moderate -
        </Badge>
        <Badge variant="outline" className="gap-1">
          <div className="w-3 h-3 rounded bg-red-600" />
          Strong -
        </Badge>
      </div>

      {/* Correlation Matrix */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-left px-4 py-3 font-medium">
                Input ↓ / Outcome →
              </th>
              {result.outcomes.map((outcome) => (
                <th
                  key={outcome}
                  className="text-center px-2 py-3 font-medium text-sm"
                >
                  {variableLabels[outcome] || outcome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.inputs.map((input) => (
              <tr key={input} className="border-t">
                <td className="px-4 py-2 text-sm font-medium">
                  {variableLabels[input] || input}
                </td>
                {result.outcomes.map((outcome) => {
                  const correlation = result.correlations[input]?.[outcome];
                  return viewType === 'table'
                    ? renderCorrelationCell(input, outcome, correlation)
                    : renderHeatmapCell(input, outcome, correlation);
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Click any cell to drill down into the scatter plot
      </p>

      {/* Insights */}
      {result.insights && result.insights.length > 0 && (
        <div className="rounded-lg border p-4 bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="font-medium">Insights</h3>
          </div>
          <ul className="space-y-2">
            {result.insights.map((insight, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                • {insight.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/50 p-4 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="font-medium text-amber-700 dark:text-amber-400">
              Warnings
            </h3>
          </div>
          <ul className="space-y-2">
            {result.warnings.map((warning, i) => (
              <li
                key={i}
                className="text-sm text-amber-700 dark:text-amber-400"
              >
                • {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Back to List
        </Button>
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={!!selectedCell} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCell && (
                <>
                  {variableLabels[selectedCell.input]} →{' '}
                  {variableLabels[selectedCell.outcome]}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {detailData && !detailLoading && (
            <div className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <Badge variant="outline">
                  Correlation: {formatCorrelation(detailData.correlation.r)}
                </Badge>
                <Badge variant="outline">n = {detailData.correlation.n}</Badge>
                <Badge variant="outline">
                  {detailData.correlation.interpretation.replace('_', ' ')}
                </Badge>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name={variableLabels[detailData.input_variable]}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name={variableLabels[detailData.outcome_variable]}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded bg-popover border p-2 shadow-md">
                              <p className="text-sm">
                                {variableLabels[detailData.input_variable]}: {data.x}
                              </p>
                              <p className="text-sm">
                                {variableLabels[detailData.outcome_variable]}: {data.y}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter
                      data={detailData.scatter_data}
                      fill="hsl(var(--primary))"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <p className="text-sm text-muted-foreground">{detailData.insight}</p>

              {detailData.experiments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Contributing Experiments</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {detailData.experiments.slice(0, 10).map((exp) => (
                      <div
                        key={exp.id}
                        className="text-sm text-muted-foreground flex gap-2"
                      >
                        <span>
                          {new Date(exp.brew_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span>-</span>
                        <span>{exp.coffee_name}</span>
                        <span className="tabular-nums">
                          ({variableLabels[detailData.input_variable]}:{' '}
                          {exp.input_value} → {variableLabels[detailData.outcome_variable]}:{' '}
                          {exp.outcome_value})
                        </span>
                      </div>
                    ))}
                    {detailData.experiments.length > 10 && (
                      <p className="text-sm text-muted-foreground">
                        ...and {detailData.experiments.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
