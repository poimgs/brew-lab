import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import BrewForm from '@/components/brew/BrewForm';
import { getBrew, type Brew } from '@/api/brews';

export default function BrewFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const coffeeId = searchParams.get('coffee_id');

  const [brew, setBrew] = useState<Brew | null>(null);
  const [isLoading, setIsLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadBrew = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getBrew(id);
        setBrew(data);
      } catch {
        setError('Failed to load brew');
      } finally {
        setIsLoading(false);
      }
    };

    loadBrew();
  }, [id]);

  const handleSuccess = () => {
    if (brew?.coffee_id) {
      navigate(`/coffees/${brew.coffee_id}`);
    } else if (coffeeId) {
      navigate(`/coffees/${coffeeId}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <BrewForm
        brew={brew ?? undefined}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
