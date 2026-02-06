import { useState, useEffect, useMemo } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getSession, linkExperiments, unlinkExperiment, type Session } from '@/api/sessions';
import type { Experiment } from '@/api/experiments';
import ExperimentDetailModal from '@/components/experiment/ExperimentDetailModal';

interface SessionDetailModalProps {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  experiments: Experiment[];
}

export default function SessionDetailModal({
  sessionId,
  open,
  onOpenChange,
  onRefresh,
  experiments,
}: SessionDetailModalProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingExperiments, setAddingExperiments] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [experimentModalOpen, setExperimentModalOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSession();
    }
  }, [open, sessionId]);

  const fetchSession = async () => {
    setLoading(true);
    try {
      const data = await getSession(sessionId);
      setSession(data);
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const sessionExperimentIds = useMemo(() => session?.experiments?.map((e) => e.id) ?? [], [session]);

  const handleOpenExperiment = (id: string) => {
    setSelectedExperimentId(id);
    setExperimentModalOpen(true);
  };

  const linkedExperimentIds = new Set(session?.experiments?.map((e) => e.id) ?? []);
  const availableExperiments = experiments.filter((e) => !linkedExperimentIds.has(e.id));

  const handleToggleAdd = (experimentId: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(experimentId)) {
        next.delete(experimentId);
      } else {
        next.add(experimentId);
      }
      return next;
    });
  };

  const handleLinkExperiments = async () => {
    if (selectedToAdd.size === 0) return;
    setSaving(true);
    try {
      await linkExperiments(sessionId, Array.from(selectedToAdd));
      setSelectedToAdd(new Set());
      setAddingExperiments(false);
      await fetchSession();
      onRefresh();
    } catch (error) {
      console.error('Failed to link experiments:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (experimentId: string) => {
    setUnlinking(experimentId);
    try {
      await unlinkExperiment(sessionId, experimentId);
      await fetchSession();
      onRefresh();
    } catch (error) {
      console.error('Failed to unlink experiment:', error);
    } finally {
      setUnlinking(null);
    }
  };

  return (
    <>
    <Dialog open={open && !experimentModalOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : session ? (
          <>
            <DialogHeader>
              <DialogTitle>{session.name}</DialogTitle>
              <DialogDescription>
                Variable: {session.variable_tested} · {session.experiment_count} experiment{session.experiment_count !== 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {session.hypothesis && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Hypothesis</h4>
                  <p className="text-sm italic">"{session.hypothesis}"</p>
                </div>
              )}

              {/* Experiments Table */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Experiments</h4>
                {session.experiments && session.experiments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Grind</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead className="hidden sm:table-cell">Notes</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {session.experiments.map((exp) => (
                        <TableRow key={exp.id} className="cursor-pointer" onClick={() => handleOpenExperiment(exp.id)}>
                          <TableCell className="text-sm">{formatDate(exp.brew_date)}</TableCell>
                          <TableCell className="text-sm tabular-nums">{exp.grind_size ?? '—'}</TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {exp.overall_score != null ? `${exp.overall_score}/10` : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[200px] hidden sm:table-cell">
                            {exp.overall_notes || '—'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleUnlink(exp.id); }}
                              disabled={unlinking === exp.id}
                              title="Remove from session"
                            >
                              {unlinking === exp.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No experiments linked yet.</p>
                )}
              </div>

              {/* Add Experiments Section */}
              {addingExperiments ? (
                <div className="space-y-2 border rounded-md p-3">
                  <h4 className="text-sm font-medium">Add Experiments</h4>
                  {availableExperiments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      All experiments for this coffee are already linked.
                    </p>
                  ) : (
                    <>
                      <div className="max-h-[150px] overflow-y-auto">
                        {availableExperiments.map((exp) => (
                          <label
                            key={exp.id}
                            className="flex items-center gap-3 p-2 hover:bg-accent/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedToAdd.has(exp.id)}
                              onCheckedChange={() => handleToggleAdd(exp.id)}
                            />
                            <span className="text-sm">
                              {formatDate(exp.brew_date)}
                              {exp.grind_size != null && ` · ${exp.grind_size} grind`}
                              {exp.overall_score != null && ` · Score ${exp.overall_score}`}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => { setAddingExperiments(false); setSelectedToAdd(new Set()); }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleLinkExperiments} disabled={saving || selectedToAdd.size === 0}>
                          {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                          Add Selected
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingExperiments(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Experiments
                </Button>
              )}

              {/* Conclusion */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Conclusion</h4>
                {session.conclusion ? (
                  <p className="text-sm">"{session.conclusion}"</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Not yet recorded. Edit the session to add a conclusion.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Failed to load session.
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Nested Experiment Detail Modal */}
    <ExperimentDetailModal
      experimentId={selectedExperimentId}
      open={experimentModalOpen}
      onOpenChange={setExperimentModalOpen}
      onRefresh={() => { fetchSession(); onRefresh(); }}
      experimentIds={sessionExperimentIds}
      onNavigate={(id) => setSelectedExperimentId(id)}
    />
    </>
  );
}
