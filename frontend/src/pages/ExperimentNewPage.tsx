import { useNavigate } from 'react-router-dom';
import ExperimentForm from '@/components/experiment/ExperimentForm';

export default function ExperimentNewPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/experiments');
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <ExperimentForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}
