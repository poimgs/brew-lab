import { useState } from 'react';
import { Plus, FlaskConical, Trash2, Eye, Edit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Session } from '@/api/sessions';
import { deleteSession } from '@/api/sessions';
import SessionForm from './SessionForm';
import SessionDetailModal from './SessionDetailModal';
import type { Brew } from '@/api/brews';

interface SessionListProps {
  coffeeId: string;
  sessions: Session[];
  brews: Brew[];
  onRefresh: () => void;
}

export default function SessionList({ coffeeId, sessions, brews, onRefresh }: SessionListProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [viewSession, setViewSession] = useState<Session | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteSession(deleteConfirm.id);
      setDeleteConfirm(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete session:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    setCreateDialogOpen(false);
    setEditSession(null);
    onRefresh();
  };

  return (
    <div className="pt-4 border-t">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sessions</h3>
        <Button size="sm" variant="outline" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">New Session</span>
        </Button>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sessions yet. Create a session to group brews and track what you learn from testing different variables.
        </p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <h4 className="font-medium text-sm truncate">{session.name}</h4>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {session.brew_count} brew{session.brew_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Variable: {session.variable_tested}
                    </p>
                    {session.hypothesis && (
                      <p className="text-xs text-muted-foreground italic truncate">
                        "{session.hypothesis}"
                      </p>
                    )}
                    {session.conclusion && (
                      <p className="text-xs mt-1 truncate">
                        <span className="text-muted-foreground">Conclusion:</span> {session.conclusion}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewSession(session)}
                      title="View session"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditSession(session)}
                      title="Edit session"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(session)}
                      title="Delete session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Session Dialog */}
      <SessionForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        coffeeId={coffeeId}
        brews={brews}
        onSuccess={handleFormSuccess}
      />

      {/* Edit Session Dialog */}
      {editSession && (
        <SessionForm
          open={true}
          onOpenChange={(open) => { if (!open) setEditSession(null); }}
          coffeeId={coffeeId}
          brews={brews}
          session={editSession}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* View Session Detail Modal */}
      {viewSession && (
        <SessionDetailModal
          sessionId={viewSession.id}
          open={true}
          onOpenChange={(open) => { if (!open) setViewSession(null); }}
          onRefresh={onRefresh}
          brews={brews}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This will remove the session grouping but will not delete any brews.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
