import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Calendar,
  Coffee as CoffeeIcon,
  FlaskConical,
  Plus,
  Star,
  Loader2,
  Pencil,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Coffee, CoffeeReference, ReferenceExperiment } from '@/api/coffees';
import { setBestExperiment } from '@/api/coffees';
import { upsertCoffeeGoal, type CoffeeGoalInput } from '@/api/coffee-goals';
import type { Experiment } from '@/api/experiments';

interface CoffeeDetailProps {
  coffee: Coffee;
  reference: CoffeeReference | null;
  experiments: Experiment[];
  experimentsLoading: boolean;
  onBack: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  onArchive: () => Promise<void>;
  onUnarchive: () => Promise<void>;
}

export default function CoffeeDetail({
  coffee,
  reference,
  experiments,
  experimentsLoading,
  onBack,
  onEdit,
  onRefresh,
  onArchive,
  onUnarchive,
}: CoffeeDetailProps) {
  const navigate = useNavigate();
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [changeBestDialogOpen, setChangeBestDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [settingBest, setSettingBest] = useState<string | null>(null);
  const [goalsForm, setGoalsForm] = useState<CoffeeGoalInput>({});

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatBrewTime = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNewExperiment = () => {
    navigate(`/experiments/new?coffee_id=${coffee.id}`);
  };

  const openGoalsDialog = () => {
    setGoalsForm({
      tds: reference?.goals?.tds,
      extraction_yield: reference?.goals?.extraction_yield,
      brightness_intensity: reference?.goals?.brightness_intensity,
      sweetness_intensity: reference?.goals?.sweetness_intensity,
      overall_score: reference?.goals?.overall_score,
      notes: reference?.goals?.notes,
    });
    setGoalsDialogOpen(true);
  };

  const handleSaveGoals = async () => {
    setSavingGoals(true);
    try {
      await upsertCoffeeGoal(coffee.id, goalsForm);
      setGoalsDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to save goals:', error);
    } finally {
      setSavingGoals(false);
    }
  };

  const handleSetBestExperiment = async (experimentId: string | null) => {
    setSettingBest(experimentId);
    try {
      await setBestExperiment(coffee.id, experimentId);
      setChangeBestDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to set best experiment:', error);
    } finally {
      setSettingBest(null);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await onArchive();
      setArchiveDialogOpen(false);
    } catch (error) {
      console.error('Failed to archive coffee:', error);
    } finally {
      setArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    setArchiving(true);
    try {
      await onUnarchive();
    } catch (error) {
      console.error('Failed to unarchive coffee:', error);
    } finally {
      setArchiving(false);
    }
  };

  const renderBestBrewSection = (exp: ReferenceExperiment | null) => {
    if (!exp) {
      return (
        <div className="text-sm text-muted-foreground">
          No experiments yet. Log your first brew to see it here.
        </div>
      );
    }

    const params: string[] = [];
    if (exp.grind_size != null) params.push(`Grind: ${exp.grind_size}`);
    if (exp.ratio != null) params.push(`1:${exp.ratio}`);
    if (exp.water_temperature != null) params.push(`${exp.water_temperature}°C`);
    if (exp.filter_paper?.name) params.push(exp.filter_paper.name);

    const brewParams: string[] = [];
    if (exp.bloom_water != null || exp.bloom_time != null) {
      const bloom = [
        exp.bloom_water != null ? `${exp.bloom_water}g` : null,
        exp.bloom_time != null ? `${exp.bloom_time}s` : null,
      ]
        .filter(Boolean)
        .join('/');
      if (bloom) brewParams.push(`Bloom: ${bloom}`);
    }
    if (exp.total_brew_time != null) {
      brewParams.push(`Total: ${formatBrewTime(exp.total_brew_time)}`);
    }

    const outcomes: string[] = [];
    if (exp.tds != null) outcomes.push(`TDS: ${exp.tds}%`);
    if (exp.extraction_yield != null) outcomes.push(`EY: ${exp.extraction_yield}%`);

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {exp.is_best ? 'Best Brew' : 'Latest Brew'} ({formatShortDate(exp.brew_date)})
          </span>
          {exp.overall_score != null && (
            <Badge variant="secondary">{exp.overall_score}/10</Badge>
          )}
        </div>
        {params.length > 0 && (
          <p className="text-sm">{params.join(' · ')}</p>
        )}
        {brewParams.length > 0 && (
          <p className="text-sm text-muted-foreground">{brewParams.join(' · ')}</p>
        )}
        {outcomes.length > 0 && (
          <p className="text-sm font-medium">{outcomes.join(' · ')}</p>
        )}
      </div>
    );
  };

  const renderGoalsSection = () => {
    const goals = reference?.goals;
    if (!goals) {
      return (
        <div className="text-sm text-muted-foreground">
          No goals set yet. Set targets to track what you're aiming for.
        </div>
      );
    }

    const targets: string[] = [];
    if (goals.tds != null) targets.push(`TDS: ${goals.tds}%`);
    if (goals.extraction_yield != null) targets.push(`EY: ${goals.extraction_yield}%`);
    if (goals.brightness_intensity != null) targets.push(`Brightness: ${goals.brightness_intensity}/10`);
    if (goals.sweetness_intensity != null) targets.push(`Sweetness: ${goals.sweetness_intensity}/10`);
    if (goals.overall_score != null) targets.push(`Overall: ${goals.overall_score}/10`);

    return (
      <div className="space-y-2">
        {targets.length > 0 && <p className="text-sm">{targets.join(' · ')}</p>}
        {goals.notes && (
          <p className="text-sm italic text-muted-foreground">"{goals.notes}"</p>
        )}
      </div>
    );
  };

  const isBestExperiment = (exp: Experiment) => {
    return coffee.best_experiment_id === exp.id ||
           (!coffee.best_experiment_id && reference?.experiment?.id === exp.id);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Coffees
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{coffee.name}</CardTitle>
              <p className="text-muted-foreground mt-1">
                {coffee.roaster}
                {coffee.country && ` · ${coffee.country}`}
                {coffee.process && ` · ${coffee.process}`}
              </p>
              {coffee.archived_at && (
                <Badge variant="secondary" className="mt-2">
                  Archived
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleNewExperiment}>
                <Plus className="h-4 w-4 mr-1" />
                New Experiment
              </Button>
              <Button variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              {coffee.archived_at ? (
                <Button
                  variant="outline"
                  onClick={handleUnarchive}
                  disabled={archiving}
                >
                  {archiving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <ArchiveRestore className="h-4 w-4 mr-1" />
                  )}
                  Unarchive
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setArchiveDialogOpen(true)}
                  disabled={archiving}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <Calendar className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Roasted</p>
              <p className="font-medium">{formatDate(coffee.roast_date)}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <CoffeeIcon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Days Off Roast</p>
              <p className="font-medium tabular-nums">{coffee.days_off_roast ?? '—'}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <FlaskConical className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Experiments</p>
              <p className="font-medium tabular-nums">{coffee.experiment_count}</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid gap-6 sm:grid-cols-2">
            {coffee.farm && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Farm</h3>
                <p className="mt-1">{coffee.farm}</p>
              </div>
            )}
            {coffee.roast_level && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Roast Level</h3>
                <p className="mt-1">{coffee.roast_level}</p>
              </div>
            )}
            {coffee.last_brewed && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Last Brewed</h3>
                <p className="mt-1">{formatDate(coffee.last_brewed)}</p>
              </div>
            )}
          </div>

          {/* Tasting Notes */}
          {coffee.tasting_notes && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Tasting Notes
              </h3>
              <p className="text-sm leading-relaxed">{coffee.tasting_notes}</p>
            </div>
          )}

          {/* Personal Notes */}
          {coffee.notes && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                My Notes
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{coffee.notes}</p>
            </div>
          )}

          {/* Best Brew Section */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Best Brew</h3>
              {experiments.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChangeBestDialogOpen(true)}
                >
                  Change
                </Button>
              )}
            </div>
            {renderBestBrewSection(reference?.experiment ?? null)}
          </div>

          {/* Target Goals Section */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Target Goals</h3>
              <Button variant="ghost" size="sm" onClick={openGoalsDialog}>
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
            {renderGoalsSection()}
          </div>

          {/* Brew History */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Brew History</h3>
              {experiments.length > 5 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => navigate(`/experiments?coffee_id=${coffee.id}`)}
                >
                  View All Experiments
                </Button>
              )}
            </div>

            {experimentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : experiments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No experiments yet. Click "New Experiment" to log your first brew.
              </p>
            ) : (
              <div className="space-y-2">
                {experiments.slice(0, 5).map((exp) => {
                  const isBest = isBestExperiment(exp);
                  const params: string[] = [];
                  if (exp.overall_score != null) params.push(`${exp.overall_score}/10`);
                  if (exp.grind_size != null) params.push(`Grind ${exp.grind_size}`);
                  if (exp.ratio != null) params.push(`1:${exp.ratio}`);
                  if (exp.water_temperature != null) params.push(`${exp.water_temperature}°C`);

                  return (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/experiments/${exp.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        {isBest ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <span className="w-4" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {formatShortDate(exp.brew_date)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {params.join(' · ')}
                          </p>
                        </div>
                      </div>
                      {!isBest && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetBestExperiment(exp.id);
                          }}
                          disabled={settingBest === exp.id}
                        >
                          {settingBest === exp.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Star className="h-3 w-3 mr-1" />
                          )}
                          Mark as Best
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Goals Edit Dialog */}
      <Dialog open={goalsDialogOpen} onOpenChange={setGoalsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Target Goals</DialogTitle>
            <DialogDescription>
              Set your target outcomes for this coffee.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tds">Target TDS (%)</Label>
                <Input
                  id="tds"
                  type="number"
                  step="0.01"
                  placeholder="1.35"
                  value={goalsForm.tds ?? ''}
                  onChange={(e) =>
                    setGoalsForm({
                      ...goalsForm,
                      tds: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="extraction_yield">Target EY (%)</Label>
                <Input
                  id="extraction_yield"
                  type="number"
                  step="0.1"
                  placeholder="20.5"
                  value={goalsForm.extraction_yield ?? ''}
                  onChange={(e) =>
                    setGoalsForm({
                      ...goalsForm,
                      extraction_yield: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brightness_intensity">Brightness (1-10)</Label>
                <Input
                  id="brightness_intensity"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="7"
                  value={goalsForm.brightness_intensity ?? ''}
                  onChange={(e) =>
                    setGoalsForm({
                      ...goalsForm,
                      brightness_intensity: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sweetness_intensity">Sweetness (1-10)</Label>
                <Input
                  id="sweetness_intensity"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="8"
                  value={goalsForm.sweetness_intensity ?? ''}
                  onChange={(e) =>
                    setGoalsForm({
                      ...goalsForm,
                      sweetness_intensity: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overall_score">Overall (1-10)</Label>
                <Input
                  id="overall_score"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="9"
                  value={goalsForm.overall_score ?? ''}
                  onChange={(e) =>
                    setGoalsForm({
                      ...goalsForm,
                      overall_score: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Improvement Notes</Label>
              <Textarea
                id="notes"
                placeholder="What to change to achieve these goals..."
                value={goalsForm.notes ?? ''}
                onChange={(e) =>
                  setGoalsForm({ ...goalsForm, notes: e.target.value || null })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGoals} disabled={savingGoals}>
              {savingGoals && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Goals
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Archive Coffee</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive "{coffee.name}" by {coffee.roaster}? Archived coffees are hidden from the main list but can still be referenced in experiments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleArchive} disabled={archiving}>
              {archiving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Best Experiment Dialog */}
      <Dialog open={changeBestDialogOpen} onOpenChange={setChangeBestDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select Best Brew</DialogTitle>
            <DialogDescription>
              Choose which experiment represents your best brew for this coffee.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <div className="space-y-2 py-4">
              {experiments.map((exp) => {
                const isBest = isBestExperiment(exp);
                const params: string[] = [];
                if (exp.overall_score != null) params.push(`${exp.overall_score}/10`);
                if (exp.grind_size != null) params.push(`Grind ${exp.grind_size}`);
                if (exp.ratio != null) params.push(`1:${exp.ratio}`);
                if (exp.water_temperature != null) params.push(`${exp.water_temperature}°C`);

                return (
                  <div
                    key={exp.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      isBest ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => handleSetBestExperiment(exp.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isBest ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <Star className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{formatDate(exp.brew_date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {params.join(' · ')}
                        </p>
                      </div>
                    </div>
                    {settingBest === exp.id && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            {coffee.best_experiment_id && (
              <Button
                variant="outline"
                onClick={() => handleSetBestExperiment(null)}
                disabled={settingBest !== null}
              >
                Clear Selection
              </Button>
            )}
            <Button variant="outline" onClick={() => setChangeBestDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
