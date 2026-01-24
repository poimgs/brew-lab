import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Coffee } from "lucide-react"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/combobox"
import { api, type Coffee as CoffeeType } from "@/lib/api"
import { cn } from "@/lib/utils"

interface CoffeeSelectProps {
  value?: string
  onChange: (value: string | undefined) => void
  disabled?: boolean
  error?: string
}

export function CoffeeSelect({
  value,
  onChange,
  disabled,
  error,
}: CoffeeSelectProps) {
  const [open, setOpen] = useState(false)
  const [coffees, setCoffees] = useState<CoffeeType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchCoffees() {
      try {
        const response = await api.listCoffees({
          page_size: 50,
          sort_by: "roast_date",
          sort_dir: "desc",
        })
        setCoffees(response.coffees)
      } catch (err) {
        console.error("Failed to fetch coffees:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchCoffees()
  }, [])

  const selectedCoffee = coffees.find((c) => c.id === value)

  const filteredCoffees = coffees.filter((coffee) => {
    const searchLower = search.toLowerCase()
    return (
      coffee.name.toLowerCase().includes(searchLower) ||
      coffee.roaster.toLowerCase().includes(searchLower)
    )
  })

  const formatDaysOff = (days?: number) => {
    if (days === undefined || days === null) return ""
    if (days === 0) return "Roasted today"
    if (days === 1) return "1 day off roast"
    return `${days} days off roast`
  }

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus:ring-destructive",
              !selectedCoffee && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Coffee className="h-4 w-4 shrink-0 opacity-50" />
              {selectedCoffee ? (
                <span className="truncate">
                  {selectedCoffee.roaster} - {selectedCoffee.name}
                </span>
              ) : (
                <span>Select a coffee...</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search coffees..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Loading coffees...
                </div>
              ) : filteredCoffees.length === 0 ? (
                <CommandEmpty>No coffees found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredCoffees.map((coffee) => (
                    <CommandItem
                      key={coffee.id}
                      value={coffee.id}
                      onSelect={() => {
                        onChange(coffee.id === value ? undefined : coffee.id)
                        setOpen(false)
                        setSearch("")
                      }}
                      className="flex items-start gap-2 py-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 mt-0.5 shrink-0",
                          value === coffee.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">
                          {coffee.roaster} - {coffee.name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {coffee.days_since_roast !== undefined && (
                            <span>{formatDaysOff(coffee.days_since_roast)}</span>
                          )}
                          {coffee.process && (
                            <>
                              <span>•</span>
                              <span>{coffee.process}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
