import CoffeeList from '@/components/library/CoffeeList';

export default function CoffeesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-semibold mb-6">Coffees</h1>
      <CoffeeList />
    </div>
  );
}
