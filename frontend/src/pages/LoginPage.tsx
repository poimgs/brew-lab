import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  function handleLoginSuccess() {
    navigate(from, { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <LoginForm onSuccess={handleLoginSuccess} />
    </div>
  );
}
