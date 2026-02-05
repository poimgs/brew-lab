import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Archive, ArchiveRestore, Trash2, Loader2, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  type Coffee,
  type ListCoffeesParams,
  listCoffees,
  archiveCoffee,
  unarchiveCoffee,
  deleteCoffee,
} from '@/api/coffees';
import CoffeeForm from './CoffeeForm';
import CoffeeDetail from './CoffeeDetail';
import DeleteConfirmDialog from './DeleteConfirmDialog';

type SortField = 'roaster' | 'name' | 'country' | 'roast_date' | 'experiment_count' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function CoffeeList() {
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCoffee, setEditingCoffee] = useState<Coffee | null>(null);
  const [viewingCoffee, setViewingCoffee] = useState<Coffee | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Coffee | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCoffees = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: ListCoffeesParams = {
        page,
        per_page: perPage,
        sort: sortDirection === 'desc' ? `-${sortField}` : sortField,
        include_archived: showArchived,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      const response = await listCoffees(params);
      setCoffees(response.items || []);
      setTotalPages(response.pagination.total_pages);
      setTotal(response.pagination.total);
    } catch (err) {
      setError('Failed to load coffees');
      console.error('Error fetching coffees:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, sortField, sortDirection, showArchived, search]);

  useEffect(() => {
    fetchCoffees();
  }, [fetchCoffees]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const handleArchive = async (coffee: Coffee) => {
    setActionLoading(coffee.id);
    try {
      if (coffee.archived_at) {
        await unarchiveCoffee(coffee.id);
      } else {
        await archiveCoffee(coffee.id);
      }
      await fetchCoffees();
    } catch (err) {
      console.error('Error archiving coffee:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (coffee: Coffee) => {
    setActionLoading(coffee.id);
    try {
      await deleteCoffee(coffee.id);
      setDeleteConfirm(null);
      await fetchCoffees();
    } catch (err) {
      console.error('Error deleting coffee:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFormSuccess = () => {
    setShowAddForm(false);
    setEditingCoffee(null);
    fetchCoffees();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  if (showAddForm) {
    return (
      <CoffeeForm
        onSuccess={handleFormSuccess}
        onCancel={() => setShowAddForm(false)}
      />
    );
  }

  if (editingCoffee) {
    return (
      <CoffeeForm
        coffee={editingCoffee}
        onSuccess={handleFormSuccess}
        onCancel={() => setEditingCoffee(null)}
      />
    );
  }

  if (viewingCoffee) {
    return (
      <CoffeeDetail
        coffee={viewingCoffee}
        onBack={() => setViewingCoffee(null)}
        onEdit={() => {
          setEditingCoffee(viewingCoffee);
          setViewingCoffee(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search coffees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showArchived ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              setShowArchived(!showArchived);
              setPage(1);
            }}
          >
            <Archive className="h-4 w-4 mr-1" />
            {showArchived ? 'Showing Archived' : 'Show Archived'}
          </Button>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Coffee
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error}
          <Button variant="link" size="sm" onClick={fetchCoffees} className="ml-2">
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
      {!isLoading && !error && coffees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {search ? 'No coffees match your search' : 'No coffees in your library yet'}
          </p>
          {!search && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Your First Coffee
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && coffees.length > 0 && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('roaster')}
                  >
                    <div className="flex items-center">
                      Roaster
                      <SortIcon field="roaster" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      <SortIcon field="name" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 hidden sm:table-cell"
                    onClick={() => handleSort('country')}
                  >
                    <div className="flex items-center">
                      Country
                      <SortIcon field="country" />
                    </div>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Process</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 hidden sm:table-cell"
                    onClick={() => handleSort('roast_date')}
                  >
                    <div className="flex items-center">
                      Roast Date
                      <SortIcon field="roast_date" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right tabular-nums hidden sm:table-cell">Days Off</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-right hidden sm:table-cell"
                    onClick={() => handleSort('experiment_count')}
                  >
                    <div className="flex items-center justify-end">
                      Brews
                      <SortIcon field="experiment_count" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coffees.map((coffee) => (
                  <TableRow
                    key={coffee.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setViewingCoffee(coffee)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {coffee.roaster}
                        {coffee.archived_at && (
                          <Badge variant="secondary" className="text-xs">
                            Archived
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{coffee.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{coffee.country || '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{coffee.process || '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(coffee.roast_date)}</TableCell>
                    <TableCell className="text-right tabular-nums hidden sm:table-cell">
                      {coffee.days_off_roast ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden sm:table-cell">
                      {coffee.experiment_count}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingCoffee(coffee)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleArchive(coffee)}
                            disabled={actionLoading === coffee.id}
                          >
                            {coffee.archived_at ? (
                              <>
                                <ArchiveRestore className="h-4 w-4 mr-2" />
                                Unarchive
                              </>
                            ) : (
                              <>
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirm(coffee)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total} coffees
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Coffee?"
        description={`Delete "${deleteConfirm?.name}" by ${deleteConfirm?.roaster}? This coffee will be hidden but your experiment history will be preserved.`}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        isLoading={!!actionLoading}
      />
    </div>
  );
}
