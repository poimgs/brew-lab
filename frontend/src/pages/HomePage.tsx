import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-3xl font-semibold">Welcome</h1>
      {user && (
        <p className="text-muted-foreground">Logged in as {user.email}</p>
      )}
      <Button variant="outline" onClick={logout}>
        Logout
      </Button>
    </div>
  );
}
