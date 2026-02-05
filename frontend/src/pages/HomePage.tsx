import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CoffeeCarousel from '@/components/home/CoffeeCarousel';
import { getHome } from '@/api/home';
import type { RecentCoffee } from '@/api/home';

export default function HomePage() {
  const navigate = useNavigate();
  const [recentCoffees, setRecentCoffees] = useState<RecentCoffee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHome = async () => {
      try {
        const data = await getHome(10);
        setRecentCoffees(data.recent_coffees);
      } catch (error) {
        console.error('Failed to fetch home data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHome();
  }, []);

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex flex-col items-center">
        {/* New Experiment Button - Large and prominent */}
        <Button
          size="lg"
          onClick={() => navigate('/experiments/new')}
          className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 text-lg h-auto"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Experiment
        </Button>

        {/* Recently Brewed Coffees Carousel */}
        {!isLoading && recentCoffees.length > 0 && (
          <div className="mt-12 w-full max-w-4xl">
            <CoffeeCarousel coffees={recentCoffees} />
          </div>
        )}
      </div>
    </div>
  );
}
