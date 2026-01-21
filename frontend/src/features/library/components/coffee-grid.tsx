import { Coffee as CoffeeIcon } from "lucide-react";
import type { Coffee } from "@/lib/api";
import { CoffeeCard } from "./coffee-card";

interface CoffeeGridProps {
  coffees: Coffee[];
  isLoading: boolean;
  error: string | null;
  onSelectCoffee: (coffee: Coffee) => void;
}

export function CoffeeGrid({
  coffees,
  isLoading,
  error,
  onSelectCoffee,
}: CoffeeGridProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CoffeeIcon className="h-10 w-10 text-primary animate-pulse" />
        <p className="mt-4 text-muted-foreground">Loading coffees...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (coffees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CoffeeIcon className="h-10 w-10 text-muted-foreground" />
        <p className="mt-4 text-lg font-medium">No coffees found</p>
        <p className="text-muted-foreground">
          Add your first coffee to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {coffees.map((coffee) => (
        <CoffeeCard
          key={coffee.id}
          coffee={coffee}
          onClick={() => onSelectCoffee(coffee)}
        />
      ))}
    </div>
  );
}
