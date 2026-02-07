import { useNavigate } from 'react-router-dom';
import BrewForm from '@/components/brew/BrewForm';

export default function BrewNewPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/brews');
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <BrewForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}
