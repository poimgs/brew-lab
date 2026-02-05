import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  type FilterPaper,
  listFilterPapers,
  deleteFilterPaper,
} from '@/api/filter-papers';
import FilterPaperForm from './FilterPaperForm';
import DeleteConfirmDialog from './DeleteConfirmDialog';

export default function FilterPaperList() {
  const [filterPapers, setFilterPapers] = useState<FilterPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPaper, setEditingPaper] = useState<FilterPaper | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FilterPaper | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchFilterPapers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listFilterPapers({ per_page: 100 });
      setFilterPapers(response.items || []);
    } catch (err) {
      setError('Failed to load filter papers');
      console.error('Error fetching filter papers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilterPapers();
  }, [fetchFilterPapers]);

  const handleDelete = async (paper: FilterPaper) => {
    setActionLoading(paper.id);
    try {
      await deleteFilterPaper(paper.id);
      setDeleteConfirm(null);
      await fetchFilterPapers();
    } catch (err) {
      console.error('Error deleting filter paper:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFormSuccess = () => {
    setShowAddForm(false);
    setEditingPaper(null);
    fetchFilterPapers();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Filter Paper
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
          <Button variant="link" size="sm" onClick={fetchFilterPapers} className="ml-2">
            Try again
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filterPapers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No filter papers in your library yet</p>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Your First Filter Paper
          </Button>
        </div>
      )}

      {/* Card grid */}
      {!isLoading && !error && filterPapers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filterPapers.map((paper) => (
            <Card key={paper.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{paper.name}</CardTitle>
                {paper.brand && (
                  <CardDescription>{paper.brand}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {paper.notes && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {paper.notes}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPaper(paper)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirm(paper)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit form dialog */}
      <FilterPaperForm
        open={showAddForm || !!editingPaper}
        filterPaper={editingPaper || undefined}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setShowAddForm(false);
          setEditingPaper(null);
        }}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Filter Paper?"
        description={`Delete "${deleteConfirm?.name}"? This filter paper will be hidden but your experiment history will be preserved.`}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        isLoading={!!actionLoading}
      />
    </div>
  );
}
