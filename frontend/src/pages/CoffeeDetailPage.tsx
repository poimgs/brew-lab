import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getCoffee, getReference, archiveCoffee, unarchiveCoffee, type Coffee, type CoffeeReference } from '@/api/coffees';
import { listExperiments, type Experiment } from '@/api/experiments';
import CoffeeDetail from '@/components/library/CoffeeDetail';
import CoffeeForm from '@/components/library/CoffeeForm';

export default function CoffeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [coffee, setCoffee] = useState<Coffee | null>(null);
  const [reference, setReference] = useState<CoffeeReference | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [experimentsLoading, setExperimentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const [coffeeData, referenceData] = await Promise.all([
        getCoffee(id),
        getReference(id).catch(() => null),
      ]);
      setCoffee(coffeeData);
      setReference(referenceData);
    } catch (err) {
      setError('Failed to load coffee');
      console.error('Error fetching coffee:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchExperiments = useCallback(async () => {
    if (!id) return;

    setExperimentsLoading(true);
    try {
      const response = await listExperiments({
        coffee_id: id,
        sort: '-brew_date',
        per_page: 20,
      });
      setExperiments(response.items);
    } catch (err) {
      console.error('Error fetching experiments:', err);
      setExperiments([]);
    } finally {
      setExperimentsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  const handleRefresh = async () => {
    await Promise.all([fetchData(), fetchExperiments()]);
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleEditSuccess = async () => {
    setIsEditing(false);
    await handleRefresh();
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleArchive = async () => {
    if (!id) return;
    await archiveCoffee(id);
    await handleRefresh();
  };

  const handleUnarchive = async () => {
    if (!id) return;
    await unarchiveCoffee(id);
    await handleRefresh();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !coffee) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          {error || 'Coffee not found'}
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="container mx-auto py-8 px-4">
        <CoffeeForm
          coffee={coffee}
          onSuccess={handleEditSuccess}
          onCancel={handleEditCancel}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <CoffeeDetail
        coffee={coffee}
        reference={reference}
        experiments={experiments}
        experimentsLoading={experimentsLoading}
        onBack={handleBack}
        onEdit={handleEdit}
        onRefresh={handleRefresh}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
      />
    </div>
  );
}
