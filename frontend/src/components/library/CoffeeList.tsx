import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Archive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type Coffee,
  type ListCoffeesParams,
  listCoffees,
  unarchiveCoffee,
} from '@/api/coffees';
import CoffeeCard from '@/components/coffees/CoffeeCard';
import CoffeeForm from './CoffeeForm';

type SortOption = '-created_at' | 'roaster' | 'name' | 'country' | '-roast_date' | '-experiment_count';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: '-created_at', label: 'Newest' },
  { value: 'roaster', label: 'Roaster' },
  { value: 'name', label: 'Name' },
  { value: 'country', label: 'Country' },
  { value: '-roast_date', label: 'Roast Date' },
  { value: '-experiment_count', label: 'Most Brewed' },
];

export default function CoffeeList() {
  const navigate = useNavigate();
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Sorting
  const [sort, setSort] = useState<SortOption>('-created_at');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCoffee, setEditingCoffee] = useState<Coffee | null>(null);

  const fetchCoffees = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: ListCoffeesParams = {
        page,
        per_page: perPage,
        sort,
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
  }, [page, perPage, sort, showArchived, search]);

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

  const handleReactivate = async (coffeeId: string) => {
    try {
      await unarchiveCoffee(coffeeId);
      await fetchCoffees();
    } catch (err) {
      console.error('Error unarchiving coffee:', err);
    }
  };

  const handleNewExperiment = (coffeeId: string) => {
    navigate(`/experiments/new?coffee_id=${coffeeId}`);
  };

  const handleFormSuccess = () => {
    setShowAddForm(false);
    setEditingCoffee(null);
    fetchCoffees();
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
        <div className="flex gap-2">
          <Select value={sort} onValueChange={(value) => { setSort(value as SortOption); setPage(1); }}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Coffee
          </Button>
        </div>
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

      {/* Card Grid */}
      {!isLoading && !error && coffees.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coffees.map((coffee) => (
              <CoffeeCard
                key={coffee.id}
                coffee={coffee}
                onNewExperiment={handleNewExperiment}
                onReactivate={showArchived ? handleReactivate : undefined}
              />
            ))}
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
    </div>
  );
}
