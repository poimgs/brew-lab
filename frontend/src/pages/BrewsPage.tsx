import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Loader2,
  Copy,
  Trash2,
  Eye,
  Edit,
  MoreVertical,
  X,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type Brew,
  type ListBrewsParams,
  listBrews,
  deleteBrew,
  copyBrew,
  compareBrews,
  exportBrews,
  type CompareResponse,
} from '@/api/brews';
import { listCoffees, type Coffee } from '@/api/coffees';
import CompareView from '@/components/brew/CompareView';

type SortField = 'brew_date' | 'overall_score' | 'days_off_roast';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'compare';

export default function BrewsPage() {
  const navigate = useNavigate();
  const [brews, setBrews] = useState<Brew[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [coffeeFilter, setCoffeeFilter] = useState<string | null>(null);
  const [scoreMin, setScoreMin] = useState<string>('');
  const [scoreMax, setScoreMax] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [hasTds, setHasTds] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('brew_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  // Selection & Modes
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Compare result
  const [compareResult, setCompareResult] = useState<CompareResponse | null>(null);

  // UI State
  const [deleteConfirm, setDeleteConfirm] = useState<Brew | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [coffees, setCoffees] = useState<Coffee[]>([]);

  // Fetch coffees for filter dropdown
  useEffect(() => {
    listCoffees({ per_page: 100 }).then((res) => setCoffees(res.items || []));
  }, []);

  const fetchBrews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: ListBrewsParams = {
        page,
        per_page: perPage,
        sort: sortDirection === 'desc' ? `-${sortField}` : sortField,
      };

      if (coffeeFilter) {
        params.coffee_id = coffeeFilter;
      }
      if (scoreMin) {
        params.score_gte = parseInt(scoreMin, 10);
      }
      if (scoreMax) {
        params.score_lte = parseInt(scoreMax, 10);
      }
      if (dateFrom) {
        params.date_from = dateFrom;
      }
      if (dateTo) {
        params.date_to = dateTo;
      }
      if (hasTds) {
        params.has_tds = true;
      }

      const response = await listBrews(params);
      setBrews(response.items || []);
      setTotalPages(response.pagination.total_pages);
      setTotal(response.pagination.total);
    } catch (err) {
      setError('Failed to load brews');
      console.error('Error fetching brews:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, sortField, sortDirection, coffeeFilter, scoreMin, scoreMax, dateFrom, dateTo, hasTds]);

  useEffect(() => {
    fetchBrews();
  }, [fetchBrews]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [coffeeFilter, scoreMin, scoreMax, dateFrom, dateTo, hasTds]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(1);
  };

  const handleDelete = async (brew: Brew) => {
    setActionLoading(brew.id);
    try {
      await deleteBrew(brew.id);
      setDeleteConfirm(null);
      await fetchBrews();
    } catch (err) {
      console.error('Error deleting brew:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopy = async (brew: Brew) => {
    setActionLoading(brew.id);
    try {
      const copied = await copyBrew(brew.id);
      navigate(`/brews/${copied.id}`);
    } catch (err) {
      console.error('Error copying brew:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await exportBrews({
        format,
        coffee_id: coffeeFilter || undefined,
        score_gte: scoreMin ? parseInt(scoreMin, 10) : undefined,
        score_lte: scoreMax ? parseInt(scoreMax, 10) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        has_tds: hasTds || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brews.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting brews:', err);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === brews.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(brews.map((e) => e.id)));
    }
  };

  const handleCompare = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length < 2 || ids.length > 4) return;

    setActionLoading('compare');
    try {
      const result = await compareBrews(ids);
      setCompareResult(result);
      setViewMode('compare');
    } catch (err) {
      console.error('Error comparing brews:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const exitCompareMode = () => {
    setViewMode('list');
    setCompareResult(null);
  };

  const clearFilters = () => {
    setCoffeeFilter(null);
    setScoreMin('');
    setScoreMax('');
    setDateFrom('');
    setDateTo('');
    setHasTds(false);
    setPage(1);
  };

  const applyQuickFilter = (filter: 'this_week' | 'this_month' | 'high_scores') => {
    const today = new Date();
    clearFilters();

    if (filter === 'this_week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      setDateFrom(weekAgo.toISOString().split('T')[0]);
    } else if (filter === 'this_month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      setDateFrom(monthAgo.toISOString().split('T')[0]);
    } else if (filter === 'high_scores') {
      setScoreMin('8');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateNotes = (notes: string, maxLength = 50) => {
    if (notes.length <= maxLength) return notes;
    return notes.substring(0, maxLength) + '...';
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

  const hasActiveFilters = coffeeFilter || scoreMin || scoreMax || dateFrom || dateTo || hasTds;

  // Render compare view
  if (viewMode === 'compare' && compareResult) {
    return (
      <div className="container mx-auto py-8 px-4">
        <CompareView result={compareResult} onClose={exitCompareMode} />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold">Brews</h1>
        <Button onClick={() => navigate('/brews/new')}>
          <Plus className="h-4 w-4 mr-1" />
          New Brew
        </Button>
      </div>

      {/* Toolbar */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  !
                </Badge>
              )}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={compareMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                setCompareMode(!compareMode);
                setSelectedIds(new Set());
              }}
            >
              Compare Mode: {compareMode ? 'On' : 'Off'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter('this_week')}
            >
              This week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter('this_month')}
            >
              This month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter('high_scores')}
            >
              High scores (8+)
            </Button>
          </div>
          <span className="text-sm text-muted-foreground sm:ml-2">
            Looking for patterns?{' '}
            <Link to="/analysis" className="text-primary hover:underline">
              Try the Analysis page
            </Link>
          </span>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="rounded-lg border p-4 bg-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Coffee</label>
                <Select
                  value={coffeeFilter || 'all'}
                  onValueChange={(v) => setCoffeeFilter(v === 'all' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All coffees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All coffees</SelectItem>
                    {coffees.map((coffee) => (
                      <SelectItem key={coffee.id} value={coffee.id}>
                        {coffee.name} ({coffee.roaster})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Score Range</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="Min"
                    value={scoreMin}
                    onChange={(e) => setScoreMin(e.target.value)}
                  />
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="Max"
                    value={scoreMax}
                    onChange={(e) => setScoreMax(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Date Range</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Has Fields</label>
                <div className="flex items-center gap-2 h-10">
                  <Checkbox
                    id="has_tds"
                    checked={hasTds}
                    onCheckedChange={(checked) => setHasTds(!!checked)}
                  />
                  <label htmlFor="has_tds" className="text-sm">
                    TDS recorded
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          </div>
        )}

        {/* Selection Actions */}
        {compareMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            {selectedIds.size >= 2 && selectedIds.size <= 4 && (
              <Button
                size="sm"
                onClick={handleCompare}
                disabled={actionLoading === 'compare'}
              >
                {actionLoading === 'compare' && (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                )}
                Compare Selected
              </Button>
            )}
            {selectedIds.size > 4 && (
              <span className="text-sm text-muted-foreground">
                Select 2-4 brews to compare
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm mb-4">
          {error}
          <Button variant="link" size="sm" onClick={fetchBrews} className="ml-2">
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
      {!isLoading && !error && brews.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters
              ? 'No brews match your filters'
              : 'No brews yet'}
          </p>
          {!hasActiveFilters && (
            <Button onClick={() => navigate('/brews/new')}>
              <Plus className="h-4 w-4 mr-1" />
              Log Your First Brew
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && brews.length > 0 && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {compareMode && (
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          selectedIds.size === brews.length &&
                          brews.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('brew_date')}
                  >
                    <div className="flex items-center">
                      Date
                      <SortIcon field="brew_date" />
                    </div>
                  </TableHead>
                  <TableHead>Coffee</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-right hidden sm:table-cell"
                    onClick={() => handleSort('days_off_roast')}
                  >
                    <div className="flex items-center justify-end">
                      Days Off
                      <SortIcon field="days_off_roast" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort('overall_score')}
                  >
                    <div className="flex items-center justify-end">
                      Score
                      <SortIcon field="overall_score" />
                    </div>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brews.map((brew) => (
                  <TableRow
                    key={brew.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      if (compareMode) {
                        toggleSelection(brew.id);
                      } else {
                        navigate(`/brews/${brew.id}`);
                      }
                    }}
                  >
                    {compareMode && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(brew.id)}
                          onCheckedChange={() => toggleSelection(brew.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {formatDate(brew.brew_date)}
                        {brew.is_draft && (
                          <Badge variant="outline" className="text-xs">Draft</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {brew.coffee ? (
                        <div>
                          <div>{brew.coffee.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {brew.coffee.roaster}
                          </div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden sm:table-cell">
                      {brew.days_off_roast ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {brew.overall_score !== undefined
                        ? `${brew.overall_score}/10`
                        : '—'}
                    </TableCell>
                    <TableCell className="max-w-[200px] hidden sm:table-cell">
                      <span className="text-muted-foreground">
                        {truncateNotes(brew.overall_notes || '')}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/brews/${brew.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/brews/${brew.id}?edit=true`)
                            }
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCopy(brew)}
                            disabled={actionLoading === brew.id}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy as Template
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirm(brew)}
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
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1} to{' '}
                {Math.min(page * perPage, total)} of {total} brews
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
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Brew?</DialogTitle>
            <DialogDescription>
              This will permanently delete the brew from{' '}
              {deleteConfirm && formatDate(deleteConfirm.brew_date)}
              {deleteConfirm?.coffee && ` (${deleteConfirm.coffee.name})`}. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={!!actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
