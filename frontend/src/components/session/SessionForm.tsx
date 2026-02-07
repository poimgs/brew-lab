import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createSession, updateSession, type Session } from '@/api/sessions';
import type { Brew } from '@/api/brews';

interface SessionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coffeeId: string;
  brews: Brew[];
  session?: Session;
  onSuccess: () => void;
}

export default function SessionForm({
  open,
  onOpenChange,
  coffeeId,
  brews,
  session,
  onSuccess,
}: SessionFormProps) {
  const isEditing = !!session;
  const [name, setName] = useState('');
  const [variableTested, setVariableTested] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [selectedBrews, setSelectedBrews] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (session) {
        setName(session.name);
        setVariableTested(session.variable_tested);
        setHypothesis(session.hypothesis ?? '');
        setConclusion(session.conclusion ?? '');
        setSelectedBrews(new Set());
      } else {
        setName('');
        setVariableTested('');
        setHypothesis('');
        setConclusion('');
        setSelectedBrews(new Set());
      }
      setError(null);
    }
  }, [open, session]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleToggleBrew = (brewId: string) => {
    setSelectedBrews((prev) => {
      const next = new Set(prev);
      if (next.has(brewId)) {
        next.delete(brewId);
      } else {
        next.add(brewId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!variableTested.trim()) {
      setError('Variable tested is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing) {
        await updateSession(session.id, {
          name: name.trim(),
          variable_tested: variableTested.trim(),
          hypothesis: hypothesis.trim() || undefined,
          conclusion: conclusion.trim() || undefined,
        });
      } else {
        await createSession({
          coffee_id: coffeeId,
          name: name.trim(),
          variable_tested: variableTested.trim(),
          hypothesis: hypothesis.trim() || undefined,
          brew_ids: selectedBrews.size > 0 ? Array.from(selectedBrews) : undefined,
        });
      }
      onSuccess();
    } catch (err) {
      setError('Failed to save session');
      console.error('Failed to save session:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Session' : 'New Session'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update session details.'
              : 'Create a session to group brews testing the same variable.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="session-name">Name *</Label>
            <Input
              id="session-name"
              placeholder="e.g., Grind size sweep"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-variable">Variable Tested *</Label>
            <Input
              id="session-variable"
              placeholder="e.g., grind size"
              value={variableTested}
              onChange={(e) => setVariableTested(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-hypothesis">Hypothesis</Label>
            <Textarea
              id="session-hypothesis"
              placeholder="What do you expect to happen?"
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              rows={2}
            />
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="session-conclusion">Conclusion</Label>
              <Textarea
                id="session-conclusion"
                placeholder="What did you learn?"
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {!isEditing && brews.length > 0 && (
            <div className="space-y-2">
              <Label>Link Brews</Label>
              <p className="text-xs text-muted-foreground">
                Select brews to include in this session.
              </p>
              <div className="border rounded-md max-h-[200px] overflow-y-auto">
                {brews.map((exp) => (
                  <label
                    key={exp.id}
                    className="flex items-center gap-3 p-2 hover:bg-accent/50 cursor-pointer border-b last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedBrews.has(exp.id)}
                      onCheckedChange={() => handleToggleBrew(exp.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">
                        {formatDate(exp.brew_date)}
                        {exp.grind_size != null && ` · ${exp.grind_size} grind`}
                        {exp.overall_score != null && ` · Score ${exp.overall_score}`}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditing ? 'Save Changes' : 'Create Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
