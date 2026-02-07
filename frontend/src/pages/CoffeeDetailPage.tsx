import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getCoffee, getReference, archiveCoffee, unarchiveCoffee, deleteCoffee, type Coffee, type CoffeeReference } from '@/api/coffees';
import { listBrews, type Brew } from '@/api/brews';
import { listSessions, type Session } from '@/api/sessions';
import CoffeeDetail from '@/components/library/CoffeeDetail';
import CoffeeForm from '@/components/library/CoffeeForm';

export default function CoffeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [coffee, setCoffee] = useState<Coffee | null>(null);
  const [reference, setReference] = useState<CoffeeReference | null>(null);
  const [brews, setBrews] = useState<Brew[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [brewsLoading, setBrewsLoading] = useState(true);
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

  const fetchBrews = useCallback(async () => {
    if (!id) return;

    setBrewsLoading(true);
    try {
      const response = await listBrews({
        coffee_id: id,
        sort: '-brew_date',
        per_page: 20,
      });
      setBrews(response.items);
    } catch (err) {
      console.error('Error fetching brews:', err);
      setBrews([]);
    } finally {
      setBrewsLoading(false);
    }
  }, [id]);

  const fetchSessions = useCallback(async () => {
    if (!id) return;

    try {
      const response = await listSessions(id);
      setSessions(response.items);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setSessions([]);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchBrews();
  }, [fetchBrews]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRefresh = async () => {
    await Promise.all([fetchData(), fetchBrews(), fetchSessions()]);
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

  const handleDelete = async () => {
    if (!id) return;
    await deleteCoffee(id);
    navigate('/');
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
        brews={brews}
        sessions={sessions}
        brewsLoading={brewsLoading}
        onBack={handleBack}
        onEdit={handleEdit}
        onRefresh={handleRefresh}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onDelete={handleDelete}
      />
    </div>
  );
}
