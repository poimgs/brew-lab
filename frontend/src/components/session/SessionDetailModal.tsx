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
import { getSession, linkBrews, unlinkBrew, type Session } from '@/api/sessions';
import type { Brew } from '@/api/brews';
import BrewDetailModal from '@/components/brew/BrewDetailModal';

interface SessionDetailModalProps {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  brews: Brew[];
}

export default function SessionDetailModal({
  sessionId,
  open,
  onOpenChange,
  onRefresh,
  brews,
}: SessionDetailModalProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingBrews, setAddingBrews] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [selectedBrewId, setSelectedBrewId] = useState<string | null>(null);
  const [brewModalOpen, setBrewModalOpen] = useState(false);

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

  const sessionBrewIds = useMemo(() => session?.brews?.map((e) => e.id) ?? [], [session]);

  const handleOpenBrew = (id: string) => {
    setSelectedBrewId(id);
    setBrewModalOpen(true);
  };

  const linkedBrewIds = new Set(session?.brews?.map((e) => e.id) ?? []);
  const availableBrews = brews.filter((e) => !linkedBrewIds.has(e.id));

  const handleToggleAdd = (brewId: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(brewId)) {
        next.delete(brewId);
      } else {
        next.add(brewId);
      }
      return next;
    });
  };

  const handleLinkBrews = async () => {
    if (selectedToAdd.size === 0) return;
    setSaving(true);
    try {
      await linkBrews(sessionId, Array.from(selectedToAdd));
      setSelectedToAdd(new Set());
      setAddingBrews(false);
      await fetchSession();
      onRefresh();
    } catch (error) {
      console.error('Failed to link brews:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (brewId: string) => {
    setUnlinking(brewId);
    try {
      await unlinkBrew(sessionId, brewId);
      await fetchSession();
      onRefresh();
    } catch (error) {
      console.error('Failed to unlink brew:', error);
    } finally {
      setUnlinking(null);
    }
  };

  return (
    <>
    <Dialog open={open && !brewModalOpen} onOpenChange={onOpenChange}>
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
                Variable: {session.variable_tested} · {session.brew_count} brew{session.brew_count !== 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {session.hypothesis && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Hypothesis</h4>
                  <p className="text-sm italic">"{session.hypothesis}"</p>
                </div>
              )}

              {/* Brews Table */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Brews</h4>
                {session.brews && session.brews.length > 0 ? (
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
                      {session.brews.map((exp) => (
                        <TableRow key={exp.id} className="cursor-pointer" onClick={() => handleOpenBrew(exp.id)}>
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
                  <p className="text-sm text-muted-foreground">No brews linked yet.</p>
                )}
              </div>

              {/* Add Brews Section */}
              {addingBrews ? (
                <div className="space-y-2 border rounded-md p-3">
                  <h4 className="text-sm font-medium">Add Brews</h4>
                  {availableBrews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      All brews for this coffee are already linked.
                    </p>
                  ) : (
                    <>
                      <div className="max-h-[150px] overflow-y-auto">
                        {availableBrews.map((exp) => (
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
                        <Button variant="outline" size="sm" onClick={() => { setAddingBrews(false); setSelectedToAdd(new Set()); }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleLinkBrews} disabled={saving || selectedToAdd.size === 0}>
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
                  onClick={() => setAddingBrews(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Brews
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

    {/* Nested Brew Detail Modal */}
    <BrewDetailModal
      brewId={selectedBrewId}
      open={brewModalOpen}
      onOpenChange={setBrewModalOpen}
      onRefresh={() => { fetchSession(); onRefresh(); }}
      brewIds={sessionBrewIds}
      onNavigate={(id) => setSelectedBrewId(id)}
    />
    </>
  );
}
