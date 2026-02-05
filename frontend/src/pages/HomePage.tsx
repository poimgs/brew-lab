import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RecentCarousel from '@/components/home/RecentCarousel';
import { getDashboard } from '@/api/dashboard';
import type { RecentExperiment } from '@/api/dashboard';

export default function HomePage() {
  const navigate = useNavigate();
  const [recentExperiments, setRecentExperiments] = useState<RecentExperiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await getDashboard(10);
        setRecentExperiments(data.recent_experiments);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
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

        {/* Recent Experiments Carousel */}
        {!isLoading && recentExperiments.length > 0 && (
          <div className="mt-12 w-full max-w-3xl">
            <RecentCarousel experiments={recentExperiments} />
          </div>
        )}
      </div>
    </div>
  );
}
