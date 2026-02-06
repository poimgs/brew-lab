import { useState, useMemo } from 'react';
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
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import type { Coffee, CoffeeReference, ReferenceExperiment } from '@/api/coffees';
import { setBestExperiment } from '@/api/coffees';
import { upsertCoffeeGoal, type CoffeeGoalInput } from '@/api/coffee-goals';
import type { Experiment } from '@/api/experiments';
import type { Session } from '@/api/sessions';
import SessionList from '@/components/session/SessionList';
import ExperimentDetailModal from '@/components/experiment/ExperimentDetailModal';

interface CoffeeDetailProps {
  coffee: Coffee;
  reference: CoffeeReference | null;
  experiments: Experiment[];
  sessions: Session[];
  experimentsLoading: boolean;
  onBack: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  onArchive: () => Promise<void>;
  onUnarchive: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function CoffeeDetail({
  coffee,
  reference,
  experiments,
  sessions,
  experimentsLoading,
  onBack,
  onEdit,
  onRefresh,
  onArchive,
  onUnarchive,
  onDelete,
}: CoffeeDetailProps) {
  const navigate = useNavigate();
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [experimentModalOpen, setExperimentModalOpen] = useState(false);
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [changeBestDialogOpen, setChangeBestDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [settingBest, setSettingBest] = useState<string | null>(null);
  const [goalsForm, setGoalsForm] = useState<CoffeeGoalInput>({});

  const experimentIds = useMemo(() => experiments.slice(0, 10).map((e) => e.id), [experiments]);

  const handleOpenExperiment = (id: string) => {
    setSelectedExperimentId(id);
    setExperimentModalOpen(true);
  };

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
      coffee_ml: reference?.goals?.coffee_ml,
      tds: reference?.goals?.tds,
      extraction_yield: reference?.goals?.extraction_yield,
      aroma_intensity: reference?.goals?.aroma_intensity,
      sweetness_intensity: reference?.goals?.sweetness_intensity,
      body_intensity: reference?.goals?.body_intensity,
      flavor_intensity: reference?.goals?.flavor_intensity,
      brightness_intensity: reference?.goals?.brightness_intensity,
      cleanliness_intensity: reference?.goals?.cleanliness_intensity,
      complexity_intensity: reference?.goals?.complexity_intensity,
      balance_intensity: reference?.goals?.balance_intensity,
      aftertaste_intensity: reference?.goals?.aftertaste_intensity,
      overall_score: reference?.goals?.overall_score,
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete coffee:', error);
    } finally {
      setDeleting(false);
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
            {exp.is_best ? 'Reference Brew' : 'Latest Brew'} ({formatShortDate(exp.brew_date)})
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

    const quantitative: string[] = [];
    if (goals.coffee_ml != null) quantitative.push(`Coffee: ${goals.coffee_ml}ml`);
    if (goals.tds != null) quantitative.push(`TDS: ${goals.tds}%`);
    if (goals.extraction_yield != null) quantitative.push(`EY: ${goals.extraction_yield}%`);

    const sensory: string[] = [];
    if (goals.aroma_intensity != null) sensory.push(`Aroma: ${goals.aroma_intensity}/10`);
    if (goals.sweetness_intensity != null) sensory.push(`Sweetness: ${goals.sweetness_intensity}/10`);
    if (goals.body_intensity != null) sensory.push(`Body: ${goals.body_intensity}/10`);
    if (goals.flavor_intensity != null) sensory.push(`Flavor: ${goals.flavor_intensity}/10`);
    if (goals.brightness_intensity != null) sensory.push(`Brightness: ${goals.brightness_intensity}/10`);
    if (goals.cleanliness_intensity != null) sensory.push(`Cleanliness: ${goals.cleanliness_intensity}/10`);
    if (goals.complexity_intensity != null) sensory.push(`Complexity: ${goals.complexity_intensity}/10`);
    if (goals.balance_intensity != null) sensory.push(`Balance: ${goals.balance_intensity}/10`);
    if (goals.aftertaste_intensity != null) sensory.push(`Aftertaste: ${goals.aftertaste_intensity}/10`);
    if (goals.overall_score != null) sensory.push(`Overall: ${goals.overall_score}/10`);

    return (
      <div className="space-y-3">
        {quantitative.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Quantitative</h4>
            <p className="text-sm">{quantitative.join(' · ')}</p>
          </div>
        )}
        {sensory.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Sensory</h4>
            <p className="text-sm">{sensory.join(' · ')}</p>
          </div>
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
            <div className="flex gap-1 sm:gap-2">
              <Button size="sm" onClick={handleNewExperiment}>
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">New Experiment</span>
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              {coffee.archived_at ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnarchive}
                  disabled={archiving}
                >
                  {archiving ? (
                    <Loader2 className="h-4 w-4 animate-spin sm:mr-1" />
                  ) : (
                    <ArchiveRestore className="h-4 w-4 sm:mr-1" />
                  )}
                  <span className="hidden sm:inline">Unarchive</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setArchiveDialogOpen(true)}
                  disabled={archiving}
                >
                  <Archive className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Archive</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="rounded-lg border p-3 sm:p-4 text-center">
              <Calendar className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs sm:text-sm text-muted-foreground">Roasted</p>
              <p className="font-medium text-sm sm:text-base">{formatDate(coffee.roast_date)}</p>
            </div>
            <div className="rounded-lg border p-3 sm:p-4 text-center">
              <CoffeeIcon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs sm:text-sm text-muted-foreground">Days Off Roast</p>
              <p className="font-medium tabular-nums text-sm sm:text-base">{coffee.days_off_roast ?? '—'}</p>
            </div>
            <div className="rounded-lg border p-3 sm:p-4 text-center">
              <FlaskConical className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs sm:text-sm text-muted-foreground">Experiments</p>
              <p className="font-medium tabular-nums text-sm sm:text-base">{coffee.experiment_count}</p>
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

          {/* Reference Brew Section */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Reference Brew</h3>
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

          {/* Sessions */}
          <SessionList
            coffeeId={coffee.id}
            sessions={sessions}
            experiments={experiments}
            onRefresh={onRefresh}
          />

          {/* Brew History */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Brew History</h3>
              {experiments.length > 10 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => navigate(`/dashboard?coffee=${coffee.id}`)}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="hidden sm:table-cell">Grind</TableHead>
                    <TableHead className="hidden sm:table-cell">Ratio</TableHead>
                    <TableHead className="hidden md:table-cell">Temp</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experiments.slice(0, 10).map((exp) => {
                    const isBest = isBestExperiment(exp);

                    return (
                      <TableRow
                        key={exp.id}
                        className="cursor-pointer"
                        onClick={() => handleOpenExperiment(exp.id)}
                      >
                        <TableCell>
                          {isBest && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatShortDate(exp.brew_date)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {exp.overall_score != null ? `${exp.overall_score}/10` : '—'}
                        </TableCell>
                        <TableCell className="tabular-nums hidden sm:table-cell">
                          {exp.grind_size ?? '—'}
                        </TableCell>
                        <TableCell className="tabular-nums hidden sm:table-cell">
                          {exp.ratio != null ? `1:${exp.ratio}` : '—'}
                        </TableCell>
                        <TableCell className="tabular-nums hidden md:table-cell">
                          {exp.water_temperature != null ? `${exp.water_temperature}°C` : '—'}
                        </TableCell>
                        <TableCell className="text-right">
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
                                <Star className="h-3 w-3 sm:mr-1" />
                              )}
                              <span className="hidden sm:inline">Mark as Reference</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Goals Edit Dialog */}
      <Dialog open={goalsDialogOpen} onOpenChange={setGoalsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Target Goals</DialogTitle>
            <DialogDescription>
              Set your target outcomes for this coffee.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Quantitative</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coffee_ml">Coffee (ml)</Label>
                <Input
                  id="coffee_ml"
                  type="number"
                  step="0.1"
                  placeholder="180"
                  value={goalsForm.coffee_ml ?? ''}
                  onChange={(e) =>
                    setGoalsForm({
                      ...goalsForm,
                      coffee_ml: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tds">TDS (%)</Label>
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
                <Label htmlFor="extraction_yield">Extraction (%)</Label>
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
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mt-2">Sensory</h4>
            <div className="grid grid-cols-3 gap-4">
              {([
                ['aroma_intensity', 'Aroma'],
                ['sweetness_intensity', 'Sweetness'],
                ['body_intensity', 'Body'],
                ['flavor_intensity', 'Flavor'],
                ['brightness_intensity', 'Brightness'],
                ['cleanliness_intensity', 'Cleanliness'],
                ['complexity_intensity', 'Complexity'],
                ['balance_intensity', 'Balance'],
                ['aftertaste_intensity', 'Aftertaste'],
                ['overall_score', 'Overall'],
              ] as const).map(([field, label]) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>{label}</Label>
                  <Input
                    id={field}
                    type="number"
                    min="1"
                    max="10"
                    placeholder="—"
                    value={goalsForm[field] ?? ''}
                    onChange={(e) =>
                      setGoalsForm({
                        ...goalsForm,
                        [field]: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </div>
              ))}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Coffee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{coffee.name}" by {coffee.roaster}? This action cannot be undone. Existing experiments will be preserved but this coffee will no longer appear in your library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Best Experiment Dialog */}
      <Dialog open={changeBestDialogOpen} onOpenChange={setChangeBestDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select Reference Brew</DialogTitle>
            <DialogDescription>
              Choose which experiment to use as the reference brew for this coffee.
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

      {/* Experiment Detail Modal */}
      <ExperimentDetailModal
        experimentId={selectedExperimentId}
        open={experimentModalOpen}
        onOpenChange={setExperimentModalOpen}
        onRefresh={onRefresh}
        experimentIds={experimentIds}
        onNavigate={(id) => setSelectedExperimentId(id)}
      />
    </div>
  );
}
