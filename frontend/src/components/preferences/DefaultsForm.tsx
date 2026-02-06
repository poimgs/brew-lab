import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type Defaults, getDefaults, updateDefaults, deleteDefault, type DefaultField, type PourDefault } from '@/api/defaults';
import { type FilterPaper, listFilterPapers } from '@/api/filter-papers';

interface FieldConfig {
  key: DefaultField;
  label: string;
  unit?: string;
  type: 'number' | 'text' | 'select';
}

const FIELD_CONFIGS: FieldConfig[] = [
  { key: 'coffee_weight', label: 'Coffee Weight', unit: 'g', type: 'number' },
  { key: 'water_weight', label: 'Water Weight', unit: 'g', type: 'number' },
  { key: 'ratio', label: 'Ratio', type: 'text' },
  { key: 'grind_size', label: 'Grind Size', type: 'text' },
  { key: 'water_temperature', label: 'Temperature', unit: '°C', type: 'number' },
  { key: 'filter_paper_id', label: 'Filter Paper', type: 'select' },
  { key: 'bloom_water', label: 'Bloom Water', unit: 'g', type: 'number' },
  { key: 'bloom_time', label: 'Bloom Time', unit: 's', type: 'number' },
];

export default function DefaultsForm() {
  const [defaults, setDefaults] = useState<Defaults>({});
  const [filterPapers, setFilterPapers] = useState<FilterPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Defaults>({});
  const [deletingField, setDeletingField] = useState<string | null>(null);
  const [pourDefaults, setPourDefaults] = useState<PourDefault[]>([]);
  const [pourDefaultsChanged, setPourDefaultsChanged] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [defaultsData, filterPapersData] = await Promise.all([
        getDefaults(),
        listFilterPapers({ per_page: 100 }),
      ]);
      setDefaults(defaultsData);
      setFilterPapers(filterPapersData.items || []);
      // Parse pour defaults from JSON string
      if (defaultsData.pour_defaults) {
        try {
          const parsed = JSON.parse(defaultsData.pour_defaults) as PourDefault[];
          setPourDefaults(parsed);
        } catch {
          // Ignore parse errors
        }
      }
    } catch (err) {
      setError('Failed to load preferences');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleFieldChange = (field: DefaultField, value: string) => {
    setPendingChanges((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClearField = async (field: DefaultField) => {
    // If the field doesn't exist in saved defaults, just clear the pending change
    if (!defaults[field]) {
      setPendingChanges((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
      return;
    }

    setDeletingField(field);
    setError(null);

    try {
      await deleteDefault(field);
      setDefaults((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
      setPendingChanges((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
      setSuccessMessage(`Cleared ${FIELD_CONFIGS.find((f) => f.key === field)?.label}`);
    } catch (err) {
      setError('Failed to clear default');
      console.error('Error clearing default:', err);
    } finally {
      setDeletingField(null);
    }
  };

  const handleSave = async () => {
    const changes = { ...pendingChanges };
    if (pourDefaultsChanged) {
      changes.pour_defaults = JSON.stringify(pourDefaults);
    }

    if (Object.keys(changes).length === 0) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedDefaults = await updateDefaults(changes);
      setDefaults(updatedDefaults);
      setPendingChanges({});
      setPourDefaultsChanged(false);
      setSuccessMessage('Preferences saved');
    } catch (err) {
      setError('Failed to save preferences');
      console.error('Error saving defaults:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPour = () => {
    setPourDefaults((prev) => [...prev, { water_amount: undefined, pour_style: undefined, notes: undefined }]);
    setPourDefaultsChanged(true);
  };

  const handleRemovePour = (index: number) => {
    setPourDefaults((prev) => prev.filter((_, i) => i !== index));
    setPourDefaultsChanged(true);
  };

  const handlePourChange = (index: number, field: keyof PourDefault, value: string) => {
    setPourDefaults((prev) => {
      const updated = [...prev];
      if (field === 'water_amount') {
        updated[index] = { ...updated[index], water_amount: value ? parseFloat(value) : undefined };
      } else {
        updated[index] = { ...updated[index], [field]: value || undefined };
      }
      return updated;
    });
    setPourDefaultsChanged(true);
  };

  const handleClearPourDefaults = async () => {
    if (!defaults.pour_defaults) {
      setPourDefaults([]);
      setPourDefaultsChanged(false);
      return;
    }

    setDeletingField('pour_defaults');
    setError(null);

    try {
      await deleteDefault('pour_defaults');
      setDefaults((prev) => {
        const updated = { ...prev };
        delete updated.pour_defaults;
        return updated;
      });
      setPourDefaults([]);
      setPourDefaultsChanged(false);
      setSuccessMessage('Cleared pour defaults');
    } catch (err) {
      setError('Failed to clear pour defaults');
      console.error('Error clearing pour defaults:', err);
    } finally {
      setDeletingField(null);
    }
  };

  const getFieldValue = (field: DefaultField): string => {
    // Pending changes take precedence over saved defaults
    if (field in pendingChanges) {
      return pendingChanges[field];
    }
    return defaults[field] || '';
  };

  const hasChanges = Object.keys(pendingChanges).length > 0 || pourDefaultsChanged;

  const getFilterPaperName = (id: string): string => {
    const paper = filterPapers.find((p) => p.id === id);
    return paper ? paper.name : 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Brew Defaults</CardTitle>
            <CardDescription>
              These values will be pre-filled when creating a new experiment.
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Error/success messages */}
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 rounded-lg bg-success-muted p-3 text-success text-sm">
            {successMessage}
          </div>
        )}

        <div className="space-y-4">
          {FIELD_CONFIGS.map((config) => (
            <div key={config.key} className="flex items-center gap-3">
              <Label htmlFor={config.key} className="w-32 shrink-0">
                {config.label}
              </Label>

              <div className="flex-1 flex items-center gap-2">
                {config.type === 'select' ? (
                  <Select
                    value={getFieldValue(config.key) || undefined}
                    onValueChange={(value) => handleFieldChange(config.key, value)}
                  >
                    <SelectTrigger id={config.key} className="flex-1">
                      <SelectValue placeholder="Select filter paper..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filterPapers.map((paper) => (
                        <SelectItem key={paper.id} value={paper.id}>
                          {paper.name}
                          {paper.brand && ` (${paper.brand})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input
                      id={config.key}
                      type={config.type}
                      value={getFieldValue(config.key)}
                      onChange={(e) => handleFieldChange(config.key, e.target.value)}
                      placeholder={config.type === 'number' ? '0' : ''}
                      className="flex-1"
                    />
                    {config.unit && (
                      <span className="text-sm text-muted-foreground w-8">
                        {config.unit}
                      </span>
                    )}
                  </>
                )}

                {/* Clear button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleClearField(config.key)}
                  disabled={
                    deletingField === config.key ||
                    (!defaults[config.key] && !pendingChanges[config.key])
                  }
                  className="shrink-0"
                  title="Clear default"
                >
                  {deletingField === config.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Pour Defaults Section */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-medium">Pour Defaults</h4>
              <p className="text-sm text-muted-foreground">Default pour templates for new experiments.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPour}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Pour
              </Button>
              {(pourDefaults.length > 0 || defaults.pour_defaults) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearPourDefaults}
                  disabled={deletingField === 'pour_defaults'}
                  title="Clear all pour defaults"
                >
                  {deletingField === 'pour_defaults' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {pourDefaults.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No pour defaults set. Add pours to pre-fill them in new experiments.
            </p>
          )}

          {pourDefaults.map((pour, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-muted-foreground w-6 shrink-0">
                {index + 1}.
              </span>
              <Input
                type="number"
                step="0.1"
                placeholder="Water (g)"
                value={pour.water_amount ?? ''}
                onChange={(e) => handlePourChange(index, 'water_amount', e.target.value)}
                className="flex-1"
              />
              <Select
                value={pour.pour_style || ''}
                onValueChange={(value) => handlePourChange(index, 'pour_style', value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="circular">circular</SelectItem>
                  <SelectItem value="center">center</SelectItem>
                  <SelectItem value="pulse">pulse</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Notes"
                value={pour.notes ?? ''}
                onChange={(e) => handlePourChange(index, 'notes', e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemovePour(index)}
                className="shrink-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Show current filter paper name if set */}
        {defaults.filter_paper_id && (
          <p className="mt-4 text-sm text-muted-foreground">
            Current filter paper default: {getFilterPaperName(defaults.filter_paper_id)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
