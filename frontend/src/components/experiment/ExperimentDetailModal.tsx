import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Copy, Edit, Loader2, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getExperiment, deleteExperiment, copyExperiment, type Experiment } from '@/api/experiments';
import { setBestExperiment } from '@/api/coffees';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatSeconds(seconds: number | undefined): string {
  if (seconds === undefined) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function DetailRow({ label, value, unit }: { label: string; value: string | number | undefined | null; unit?: string }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-muted/50 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium">
        {value}{unit && <span className="text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function SensoryRow({ label, intensity, notes }: { label: string; intensity: number | undefined | null; notes?: string | null }) {
  if (intensity === undefined || intensity === null) return null;
  return (
    <div className="py-1.5 border-b border-muted/50 last:border-0">
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground text-sm">{label}</span>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${intensity * 10}%` }} />
          </div>
          <span className="text-sm font-medium w-5 text-right">{intensity}</span>
        </div>
      </div>
      {notes && <p className="text-xs text-muted-foreground mt-0.5">{notes}</p>}
    </div>
  );
}

interface ExperimentDetailModalProps {
  experimentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
  /** List of experiment IDs for prev/next navigation */
  experimentIds?: string[];
  /** Called when navigating to a different experiment */
  onNavigate?: (id: string) => void;
}

export default function ExperimentDetailModal({
  experimentId,
  open,
  onOpenChange,
  onRefresh,
  experimentIds,
  onNavigate,
}: ExperimentDetailModalProps) {
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isSettingReference, setIsSettingReference] = useState(false);

  const fetchExperiment = useCallback(async () => {
    if (!experimentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getExperiment(experimentId);
      setExperiment(data);
    } catch {
      setError('Failed to load experiment');
    } finally {
      setLoading(false);
    }
  }, [experimentId]);

  useEffect(() => {
    if (open && experimentId) {
      fetchExperiment();
    }
  }, [open, experimentId, fetchExperiment]);

  // Prev/Next navigation
  const currentIndex = experimentIds && experimentId
    ? experimentIds.indexOf(experimentId)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = experimentIds ? currentIndex < experimentIds.length - 1 && currentIndex >= 0 : false;

  const handlePrev = () => {
    if (hasPrev && experimentIds && onNavigate) {
      onNavigate(experimentIds[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && experimentIds && onNavigate) {
      onNavigate(experimentIds[currentIndex + 1]);
    }
  };

  const handleEdit = () => {
    if (!experiment) return;
    onOpenChange(false);
    navigate(`/experiments/new?edit=${experiment.id}`);
  };

  const handleCopy = async () => {
    if (!experimentId) return;
    setIsCopying(true);
    try {
      const newExperiment = await copyExperiment(experimentId);
      onOpenChange(false);
      navigate(`/experiments/new?edit=${newExperiment.id}`);
    } catch {
      setError('Failed to copy experiment');
    } finally {
      setIsCopying(false);
    }
  };

  const handleMarkAsReference = async () => {
    if (!experiment) return;
    setIsSettingReference(true);
    try {
      await setBestExperiment(experiment.coffee_id, experiment.id);
      onRefresh?.();
    } catch {
      setError('Failed to set as reference');
    } finally {
      setIsSettingReference(false);
    }
  };

  const handleDelete = async () => {
    if (!experimentId) return;
    setIsDeleting(true);
    try {
      await deleteExperiment(experimentId);
      setShowDeleteDialog(false);
      onOpenChange(false);
      onRefresh?.();
    } catch {
      setError('Failed to delete experiment');
    } finally {
      setIsDeleting(false);
    }
  };

  const exp = experiment;

  const hasSensoryData = exp && (exp.aroma_intensity || exp.body_intensity ||
    exp.flavor_intensity || exp.brightness_intensity ||
    exp.sweetness_intensity || exp.cleanliness_intensity ||
    exp.complexity_intensity || exp.balance_intensity ||
    exp.aftertaste_intensity);

  const hasQuantitativeData = exp && (exp.coffee_ml || exp.tds || exp.extraction_yield);

  const hasPreBrewData = exp && (exp.coffee_weight || exp.water_weight ||
    exp.ratio || exp.grind_size || exp.water_temperature || exp.filter_paper);

  const hasBrewData = exp && (exp.bloom_water || exp.bloom_time ||
    exp.total_brew_time || exp.drawdown_time ||
    (exp.pours && exp.pours.length > 0) || exp.technique_notes);

  const hasPostBrewData = exp && (exp.water_bypass_ml || exp.mineral_profile_id);

  return (
    <>
      <Dialog open={open && !showDeleteDialog} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error || !exp ? (
            <div className="py-8 text-center">
              <p className="text-destructive">{error || 'Experiment not found'}</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {exp.coffee?.name || 'Unknown Coffee'}
                  {exp.is_draft && <Badge variant="outline">Draft</Badge>}
                  {exp.overall_score != null && (
                    <Badge variant="secondary">{exp.overall_score}/10</Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {exp.coffee?.roaster}
                  {' \u00B7 '}
                  {formatDate(exp.brew_date)}
                  {exp.days_off_roast != null && ` \u00B7 ${exp.days_off_roast} days off roast`}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Notes */}
                {exp.overall_notes && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{exp.overall_notes}</p>
                  </div>
                )}

                {/* Pre-Brew & Brew in two columns */}
                {(hasPreBrewData || hasBrewData) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {hasPreBrewData && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Pre-Brew</h4>
                        <DetailRow label="Dose" value={exp.coffee_weight} unit="g" />
                        <DetailRow label="Water" value={exp.water_weight} unit="g" />
                        <DetailRow label="Ratio" value={exp.ratio ? `1:${exp.ratio}` : undefined} />
                        <DetailRow label="Grind" value={exp.grind_size} />
                        <DetailRow label="Temp" value={exp.water_temperature} unit="\u00B0C" />
                        {exp.filter_paper && (
                          <DetailRow label="Filter" value={`${exp.filter_paper.name}${exp.filter_paper.brand ? ` (${exp.filter_paper.brand})` : ''}`} />
                        )}
                      </div>
                    )}
                    {hasBrewData && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Brew</h4>
                        <DetailRow label="Bloom" value={exp.bloom_water != null ? `${exp.bloom_water}g / ${formatSeconds(exp.bloom_time)}` : undefined} />
                        {exp.pours && exp.pours.length > 0 && exp.pours.map((pour) => (
                          <DetailRow
                            key={pour.id}
                            label={`Pour ${pour.pour_number}`}
                            value={[
                              pour.water_amount ? `${pour.water_amount}g` : null,
                              pour.pour_style,
                            ].filter(Boolean).join(' · ') || undefined}
                          />
                        ))}
                        <DetailRow label="Total Time" value={formatSeconds(exp.total_brew_time)} />
                        <DetailRow label="Drawdown" value={formatSeconds(exp.drawdown_time)} />
                      </div>
                    )}
                  </div>
                )}

                {/* Post-Brew & Outcomes in two columns */}
                {(hasPostBrewData || hasQuantitativeData) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {hasPostBrewData && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Post-Brew</h4>
                        <DetailRow label="Bypass" value={exp.water_bypass_ml} unit="ml" />
                        {exp.mineral_profile && (
                          <DetailRow label="Minerals" value={`${exp.mineral_profile.name}${exp.mineral_profile.brand ? ` (${exp.mineral_profile.brand})` : ''}`} />
                        )}
                      </div>
                    )}
                    {hasQuantitativeData && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Outcomes</h4>
                        <DetailRow label="Coffee" value={exp.coffee_ml} unit="ml" />
                        <DetailRow label="TDS" value={exp.tds} unit="%" />
                        <DetailRow label="Extraction" value={exp.extraction_yield} unit="%" />
                      </div>
                    )}
                  </div>
                )}

                {/* Sensory */}
                {hasSensoryData && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Sensory</h4>
                    <SensoryRow label="Aroma" intensity={exp.aroma_intensity} notes={exp.aroma_notes} />
                    <SensoryRow label="Body" intensity={exp.body_intensity} notes={exp.body_notes} />
                    <SensoryRow label="Flavor" intensity={exp.flavor_intensity} notes={exp.flavor_notes} />
                    <SensoryRow label="Brightness" intensity={exp.brightness_intensity} notes={exp.brightness_notes} />
                    <SensoryRow label="Sweetness" intensity={exp.sweetness_intensity} notes={exp.sweetness_notes} />
                    <SensoryRow label="Cleanliness" intensity={exp.cleanliness_intensity} notes={exp.cleanliness_notes} />
                    <SensoryRow label="Complexity" intensity={exp.complexity_intensity} notes={exp.complexity_notes} />
                    <SensoryRow label="Balance" intensity={exp.balance_intensity} notes={exp.balance_notes} />
                    <SensoryRow label="Aftertaste" intensity={exp.aftertaste_intensity} notes={exp.aftertaste_notes} />
                  </div>
                )}

                {/* Improvement Notes */}
                {exp.improvement_notes && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Ideas for Next Time</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{exp.improvement_notes}</p>
                  </div>
                )}
              </div>

              {/* Prev/Next Navigation */}
              {experimentIds && experimentIds.length > 1 && (
                <div className="flex items-center justify-between border-t pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrev}
                    disabled={!hasPrev}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNext}
                    disabled={!hasNext}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}

              {/* Actions */}
              <DialogFooter className="flex-row flex-wrap gap-2 sm:justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-1" />
                    {exp.is_draft ? 'Continue Editing' : 'Edit'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCopy} disabled={isCopying}>
                    {isCopying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleMarkAsReference} disabled={isSettingReference}>
                    {isSettingReference ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Star className="h-4 w-4 mr-1" />}
                    Reference
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Experiment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this experiment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
