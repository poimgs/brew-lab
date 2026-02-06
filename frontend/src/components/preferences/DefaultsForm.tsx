import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Save } from 'lucide-react';
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
import { type Defaults, getDefaults, updateDefaults, deleteDefault, type DefaultField } from '@/api/defaults';
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
    if (Object.keys(pendingChanges).length === 0) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedDefaults = await updateDefaults(pendingChanges);
      setDefaults(updatedDefaults);
      setPendingChanges({});
      setSuccessMessage('Preferences saved');
    } catch (err) {
      setError('Failed to save preferences');
      console.error('Error saving defaults:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldValue = (field: DefaultField): string => {
    // Pending changes take precedence over saved defaults
    if (field in pendingChanges) {
      return pendingChanges[field];
    }
    return defaults[field] || '';
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

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
