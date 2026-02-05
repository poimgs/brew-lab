import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Edit, Trash2, Copy } from 'lucide-react';
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
import ExperimentForm from '@/components/experiment/ExperimentForm';
import { getExperiment, deleteExperiment, copyExperiment, type Experiment } from '@/api/experiments';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
    <div className="flex justify-between py-2 border-b border-muted/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">
        {value}{unit && <span className="text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function IntensityBar({ value }: { value: number | undefined | null }) {
  if (value === undefined || value === null) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <span className="text-sm font-medium w-6">{value}</span>
    </div>
  );
}

function SensoryRow({ label, intensity, notes }: { label: string; intensity: number | undefined | null; notes?: string | null }) {
  if (intensity === undefined || intensity === null) return null;
  return (
    <div className="py-2 border-b border-muted/50 last:border-0">
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">{label}</span>
        <IntensityBar value={intensity} />
      </div>
      {notes && <p className="text-sm text-muted-foreground mt-1">{notes}</p>}
    </div>
  );
}

export default function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    const loadExperiment = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);
      try {
        const data = await getExperiment(id);
        setExperiment(data);
      } catch (err) {
        setError('Failed to load experiment');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadExperiment();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      await deleteExperiment(id);
      navigate('/experiments');
    } catch (err) {
      console.error(err);
      setError('Failed to delete experiment');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleCopy = async () => {
    if (!id) return;

    setIsCopying(true);
    try {
      const newExperiment = await copyExperiment(id);
      navigate(`/experiments/${newExperiment.id}`);
    } catch (err) {
      console.error(err);
      setError('Failed to copy experiment');
    } finally {
      setIsCopying(false);
    }
  };

  const handleEditSuccess = async () => {
    setIsEditing(false);
    if (id) {
      const data = await getExperiment(id);
      setExperiment(data);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error || 'Experiment not found'}</p>
          <Button onClick={() => navigate('/experiments')}>Back to Experiments</Button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="container mx-auto py-8 px-4">
        <ExperimentForm
          experiment={experiment}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  const hasSensoryData = experiment.aroma_intensity || experiment.acidity_intensity ||
    experiment.sweetness_intensity || experiment.bitterness_intensity ||
    experiment.body_weight || experiment.flavor_intensity ||
    experiment.aftertaste_duration || experiment.aftertaste_intensity;

  const hasQuantitativeData = experiment.final_weight || experiment.tds || experiment.extraction_yield;

  const hasPreBrewData = experiment.coffee_weight || experiment.water_weight ||
    experiment.ratio || experiment.grind_size || experiment.water_temperature || experiment.filter_paper;

  const hasBrewData = experiment.bloom_water || experiment.bloom_time ||
    experiment.total_brew_time || experiment.drawdown_time ||
    (experiment.pours && experiment.pours.length > 0) || experiment.technique_notes;

  const hasPostBrewData = experiment.water_bypass_ml || experiment.mineral_profile_id;

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/experiments')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Experiments
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={isCopying}>
            {isCopying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Use as Template</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Edit</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {experiment.coffee?.name || 'Unknown Coffee'}
                {experiment.overall_score && (
                  <Badge variant="secondary" className="text-lg px-2">
                    {experiment.overall_score}/10
                  </Badge>
                )}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {experiment.coffee?.roaster}
                {experiment.days_off_roast !== undefined && ` · ${experiment.days_off_roast} days off roast`}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{formatDate(experiment.brew_date)}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notes */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Notes</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{experiment.overall_notes}</p>
            </div>
            {experiment.improvement_notes && (
              <div>
                <h3 className="font-medium mb-2">Ideas for Next Time</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{experiment.improvement_notes}</p>
              </div>
            )}
          </div>

          {/* Pre-Brew Variables */}
          {hasPreBrewData && (
            <div>
              <h3 className="font-medium mb-3 pb-2 border-b">Pre-Brew Variables</h3>
              <div className="space-y-0">
                <DetailRow label="Coffee Weight" value={experiment.coffee_weight} unit="g" />
                <DetailRow label="Water Weight" value={experiment.water_weight} unit="g" />
                <DetailRow label="Ratio" value={experiment.ratio ? `1:${experiment.ratio}` : undefined} />
                <DetailRow label="Grind Size" value={experiment.grind_size} />
                <DetailRow label="Water Temperature" value={experiment.water_temperature} unit="°C" />
                {experiment.filter_paper && (
                  <DetailRow
                    label="Filter Paper"
                    value={`${experiment.filter_paper.name}${experiment.filter_paper.brand ? ` (${experiment.filter_paper.brand})` : ''}`}
                  />
                )}
              </div>
            </div>
          )}

          {/* Brew Variables */}
          {hasBrewData && (
            <div>
              <h3 className="font-medium mb-3 pb-2 border-b">Brew Variables</h3>
              <div className="space-y-0">
                <DetailRow label="Bloom Water" value={experiment.bloom_water} unit="g" />
                <DetailRow label="Bloom Time" value={formatSeconds(experiment.bloom_time)} />
                {experiment.pours && experiment.pours.length > 0 && (
                  <div className="py-2 border-b border-muted/50">
                    <span className="text-muted-foreground">Pours</span>
                    <div className="mt-2 space-y-1">
                      {experiment.pours.map((pour) => (
                        <div key={pour.id} className="flex items-center gap-2 text-sm pl-4">
                          <span className="font-medium">{pour.pour_number}.</span>
                          {pour.water_amount && <span>{pour.water_amount}g</span>}
                          {pour.pour_style && <Badge variant="outline" className="text-xs">{pour.pour_style}</Badge>}
                          {pour.notes && <span className="text-muted-foreground">- {pour.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <DetailRow label="Total Brew Time" value={formatSeconds(experiment.total_brew_time)} />
                <DetailRow label="Drawdown Time" value={formatSeconds(experiment.drawdown_time)} />
                {experiment.technique_notes && (
                  <div className="py-2 border-b border-muted/50">
                    <span className="text-muted-foreground">Technique Notes</span>
                    <p className="mt-1">{experiment.technique_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Post-Brew Variables */}
          {hasPostBrewData && (
            <div>
              <h3 className="font-medium mb-3 pb-2 border-b">Post-Brew Variables</h3>
              <div className="space-y-0">
                <DetailRow label="Water Bypass" value={experiment.water_bypass_ml} unit="ml" />
                {experiment.mineral_profile && (
                  <DetailRow
                    label="Mineral Profile"
                    value={`${experiment.mineral_profile.name}${experiment.mineral_profile.brand ? ` (${experiment.mineral_profile.brand})` : ''}`}
                  />
                )}
              </div>
            </div>
          )}

          {/* Quantitative Outcomes */}
          {hasQuantitativeData && (
            <div>
              <h3 className="font-medium mb-3 pb-2 border-b">Quantitative Outcomes</h3>
              <div className="space-y-0">
                <DetailRow label="Final Weight" value={experiment.final_weight} unit="g" />
                <DetailRow label="TDS" value={experiment.tds} unit="%" />
                <DetailRow label="Extraction Yield" value={experiment.extraction_yield} unit="%" />
              </div>
            </div>
          )}

          {/* Sensory Outcomes */}
          {hasSensoryData && (
            <div>
              <h3 className="font-medium mb-3 pb-2 border-b">Sensory Outcomes</h3>
              <div className="space-y-0">
                <SensoryRow label="Aroma" intensity={experiment.aroma_intensity} notes={experiment.aroma_notes} />
                <SensoryRow label="Acidity" intensity={experiment.acidity_intensity} notes={experiment.acidity_notes} />
                <SensoryRow label="Sweetness" intensity={experiment.sweetness_intensity} notes={experiment.sweetness_notes} />
                <SensoryRow label="Bitterness" intensity={experiment.bitterness_intensity} notes={experiment.bitterness_notes} />
                <SensoryRow label="Body" intensity={experiment.body_weight} notes={experiment.body_notes} />
                <SensoryRow label="Flavor" intensity={experiment.flavor_intensity} notes={experiment.flavor_notes} />
                <SensoryRow label="Aftertaste Duration" intensity={experiment.aftertaste_duration} />
                <SensoryRow label="Aftertaste Intensity" intensity={experiment.aftertaste_intensity} notes={experiment.aftertaste_notes} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Experiment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this experiment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
