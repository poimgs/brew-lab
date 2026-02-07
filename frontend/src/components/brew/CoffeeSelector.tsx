import { useState, useEffect, useCallback } from 'react';
import { Search, Coffee as CoffeeIcon, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listCoffees, type Coffee } from '@/api/coffees';

interface CoffeeSelectorProps {
  value?: string;
  onChange: (coffeeId: string, coffee: Coffee) => void;
  error?: string;
}

export default function CoffeeSelector({ value, onChange, error }: CoffeeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [recentCoffees, setRecentCoffees] = useState<Coffee[]>([]);
  const [selectedCoffee, setSelectedCoffee] = useState<Coffee | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load recent coffees on mount
  useEffect(() => {
    const loadRecentCoffees = async () => {
      try {
        const response = await listCoffees({ per_page: 5 });
        setRecentCoffees(response.items || []);
      } catch {
        // Ignore error for recent coffees
      }
    };
    loadRecentCoffees();
  }, []);

  // Load selected coffee if value is provided
  useEffect(() => {
    if (value && !selectedCoffee) {
      const loadSelectedCoffee = async () => {
        try {
          const response = await listCoffees({ per_page: 100 });
          const coffee = response.items?.find((c) => c.id === value);
          if (coffee) {
            setSelectedCoffee(coffee);
          }
        } catch {
          // Ignore error
        }
      };
      loadSelectedCoffee();
    }
  }, [value, selectedCoffee]);

  // Search coffees with debounce
  const searchCoffees = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCoffees([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await listCoffees({ search: query, per_page: 10 });
      setCoffees(response.items || []);
    } catch {
      setCoffees([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCoffees(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search, searchCoffees]);

  const handleSelect = (coffee: Coffee) => {
    setSelectedCoffee(coffee);
    onChange(coffee.id, coffee);
    setIsOpen(false);
    setSearch('');
  };

  const formatDaysOffRoast = (coffee: Coffee) => {
    if (!coffee.roast_date) return null;
    const roastDate = new Date(coffee.roast_date);
    const today = new Date();
    const days = Math.floor((today.getTime() - roastDate.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  };

  const displayCoffees = search.length >= 2 ? coffees : recentCoffees;

  return (
    <div className="space-y-2">
      <Label className={error ? 'text-destructive' : ''}>Coffee *</Label>

      <div className="relative">
        {/* Selected coffee display / trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 border rounded-md text-left bg-background hover:bg-muted/50 transition-colors ${
            error ? 'border-destructive' : 'border-input'
          }`}
        >
          {selectedCoffee ? (
            <div className="flex items-center gap-2">
              <CoffeeIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{selectedCoffee.name}</span>
              <span className="text-muted-foreground">· {selectedCoffee.roaster}</span>
              {formatDaysOffRoast(selectedCoffee) && (
                <span className="text-xs text-muted-foreground">
                  ({formatDaysOffRoast(selectedCoffee)})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">Select a coffee...</span>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg">
            {/* Search input */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search coffees..."
                  className="pl-8"
                  autoFocus
                />
              </div>
            </div>

            {/* Coffee list */}
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              ) : displayCoffees.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  {search.length >= 2 ? 'No coffees found' : 'Type to search...'}
                </div>
              ) : (
                <>
                  {search.length < 2 && recentCoffees.length > 0 && (
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                      Recent
                    </div>
                  )}
                  {displayCoffees.map((coffee) => (
                    <button
                      key={coffee.id}
                      type="button"
                      onClick={() => handleSelect(coffee)}
                      className={`w-full px-3 py-2 text-left hover:bg-muted focus:bg-muted focus:outline-none ${
                        value === coffee.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CoffeeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{coffee.name}</span>
                            <span className="text-muted-foreground truncate">· {coffee.roaster}</span>
                          </div>
                          {formatDaysOffRoast(coffee) && (
                            <div className="text-xs text-muted-foreground">
                              {formatDaysOffRoast(coffee)} off roast
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
