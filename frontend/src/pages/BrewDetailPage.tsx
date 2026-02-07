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
import BrewForm from '@/components/brew/BrewForm';
import { getBrew, deleteBrew, copyBrew, type Brew } from '@/api/brews';

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
      <div className="w-16 sm:w-24 h-2 bg-muted rounded-full overflow-hidden">
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

export default function BrewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [brew, setBrew] = useState<Brew | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    const loadBrew = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);
      try {
        const data = await getBrew(id);
        setBrew(data);
      } catch (err) {
        setError('Failed to load brew');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBrew();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      await deleteBrew(id);
      navigate('/brews');
    } catch (err) {
      console.error(err);
      setError('Failed to delete brew');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleCopy = async () => {
    if (!id) return;

    setIsCopying(true);
    try {
      const newBrew = await copyBrew(id);
      navigate(`/brews/${newBrew.id}`);
    } catch (err) {
      console.error(err);
      setError('Failed to copy brew');
    } finally {
      setIsCopying(false);
    }
  };

  const handleEditSuccess = async () => {
    setIsEditing(false);
    if (id) {
      const data = await getBrew(id);
      setBrew(data);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !brew) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error || 'Brew not found'}</p>
          <Button onClick={() => navigate('/brews')}>Back to Brews</Button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="container mx-auto py-8 px-4">
        <BrewForm
          brew={brew}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  const hasSensoryData = brew.aroma_intensity || brew.body_intensity ||
    brew.flavor_intensity || brew.brightness_intensity ||
    brew.sweetness_intensity || brew.cleanliness_intensity ||
    brew.complexity_intensity || brew.balance_intensity ||
    brew.aftertaste_intensity;

  const hasQuantitativeData = brew.coffee_ml || brew.tds || brew.extraction_yield;

  const hasPreBrewData = brew.coffee_weight || brew.water_weight ||
    brew.ratio || brew.grind_size || brew.water_temperature || brew.filter_paper;

  const hasBrewData = brew.bloom_water || brew.bloom_time ||
    brew.total_brew_time || brew.drawdown_time ||
    (brew.pours && brew.pours.length > 0) || brew.technique_notes;

  const hasPostBrewData = brew.water_bypass_ml || brew.mineral_profile_id;

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/brews')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Brews
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={isCopying}>
            {isCopying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Use as Template</span>
          </Button>
          <Button variant={brew.is_draft ? 'default' : 'outline'} size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">{brew.is_draft ? 'Continue Editing' : 'Edit'}</span>
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
                {brew.coffee?.name || 'Unknown Coffee'}
                {brew.is_draft && (
                  <Badge variant="outline">Draft</Badge>
                )}
                {brew.overall_score && (
                  <Badge variant="secondary" className="text-lg px-2">
                    {brew.overall_score}/10
                  </Badge>
                )}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {brew.coffee?.roaster}
                {brew.days_off_roast !== undefined && ` · ${brew.days_off_roast} days off roast`}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{formatDate(brew.brew_date)}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notes */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Notes</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{brew.overall_notes}</p>
            </div>
            {brew.improvement_notes && (
              <div>
                <h3 className="font-medium mb-2">Ideas for Next Time</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{brew.improvement_notes}</p>
              </div>
            )}
          </div>

          {/* Pre-Brew Variables */}
          {hasPreBrewData && (
            <div>
              <h3 className="font-medium mb-3 pb-2 border-b">Pre-Brew Variables</h3>
              <div className="space-y-0">
                <DetailRow label="Coffee Weight" value={brew.coffee_weight} unit="g" />
                <DetailRow label="Water Weight" value={brew.water_weight} unit="g" />
                <DetailRow label="Ratio" value={brew.ratio ? `1:${brew.ratio}` : undefined} />
                <DetailRow label="Grind Size" value={brew.grind_size} />
                <DetailRow label="Water Temperature" value={brew.water_temperature} unit="°C" />
                {brew.filter_paper && (
                  <DetailRow
                    label="Filter Paper"
                    value={`${brew.filter_paper.name}${brew.filter_paper.brand ? ` (${brew.filter_paper.brand})` : ''}`}
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
                <DetailRow label="Bloom Water" value={brew.bloom_water} unit="g" />
                <DetailRow label="Bloom Time" value={formatSeconds(brew.bloom_time)} />
                {brew.pours && brew.pours.length > 0 && (
                  <div className="py-2 border-b border-muted/50">
                    <span className="text-muted-foreground">Pours</span>
                    <div className="mt-2 space-y-1">
                      {brew.pours.map((pour) => (
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
                <DetailRow label="Total Brew Time" value={formatSeconds(brew.total_brew_time)} />
                <DetailRow label="Drawdown Time" value={formatSeconds(brew.drawdown_time)} />
                {brew.technique_notes && (
                  <div className="py-2 border-b border-muted/50">
                    <span className="text-muted-foreground">Technique Notes</span>
                    <p className="mt-1">{brew.technique_notes}</p>
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
                <DetailRow label="Water Bypass" value={brew.water_bypass_ml} unit="ml" />
                {brew.mineral_profile && (
                  <DetailRow
                    label="Mineral Profile"
                    value={`${brew.mineral_profile.name}${brew.mineral_profile.brand ? ` (${brew.mineral_profile.brand})` : ''}`}
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
                <DetailRow label="Coffee" value={brew.coffee_ml} unit="ml" />
                <DetailRow label="TDS" value={brew.tds} unit="%" />
                <DetailRow label="Extraction Yield" value={brew.extraction_yield} unit="%" />
              </div>
            </div>
          )}

          {/* Sensory Outcomes */}
          {hasSensoryData && (
            <div>
              <h3 className="font-medium mb-3 pb-2 border-b">Sensory Outcomes</h3>
              <div className="space-y-0">
                <SensoryRow label="Aroma" intensity={brew.aroma_intensity} notes={brew.aroma_notes} />
                <SensoryRow label="Body" intensity={brew.body_intensity} notes={brew.body_notes} />
                <SensoryRow label="Flavor" intensity={brew.flavor_intensity} notes={brew.flavor_notes} />
                <SensoryRow label="Brightness" intensity={brew.brightness_intensity} notes={brew.brightness_notes} />
                <SensoryRow label="Sweetness" intensity={brew.sweetness_intensity} notes={brew.sweetness_notes} />
                <SensoryRow label="Cleanliness" intensity={brew.cleanliness_intensity} notes={brew.cleanliness_notes} />
                <SensoryRow label="Complexity" intensity={brew.complexity_intensity} notes={brew.complexity_notes} />
                <SensoryRow label="Balance" intensity={brew.balance_intensity} notes={brew.balance_notes} />
                <SensoryRow label="Aftertaste" intensity={brew.aftertaste_intensity} notes={brew.aftertaste_notes} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Brew</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this brew? This action cannot be undone.
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
