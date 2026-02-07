import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock auth context to simulate authenticated user
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

// Mock ThemeToggle
vi.mock('@/components/layout/ThemeToggle', () => ({
  default: () => <div data-testid="theme-toggle" />,
}));

// Mock ProtectedRoute to just render children (auth is mocked above)
vi.mock('@/components/auth/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock CoffeesPage to identify it in the DOM
vi.mock('@/pages/CoffeesPage', () => ({
  default: () => <div data-testid="coffees-page">Coffees Page</div>,
}));

// Mock other pages
vi.mock('@/pages/LoginPage', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}));
vi.mock('@/pages/BrewsPage', () => ({
  default: () => <div data-testid="brews-page">Brews Page</div>,
}));
vi.mock('@/pages/BrewFormPage', () => ({
  default: () => <div data-testid="brew-form-page" />,
}));
vi.mock('@/pages/BrewDetailPage', () => ({
  default: () => <div data-testid="brew-detail-page" />,
}));
vi.mock('@/pages/AnalysisPage', () => ({
  default: () => <div data-testid="analysis-page" />,
}));
vi.mock('@/pages/LibraryPage', () => ({
  default: () => <div data-testid="library-page" />,
}));
vi.mock('@/pages/PreferencesPage', () => ({
  default: () => <div data-testid="preferences-page" />,
}));
vi.mock('@/pages/CoffeeDetailPage', () => ({
  default: () => <div data-testid="coffee-detail-page" />,
}));

// Override BrowserRouter with MemoryRouter for testing
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => {
      const { MemoryRouter } = actual as typeof import('react-router-dom');
      return <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>;
    },
  };
});

describe('App routing after home page cleanup', () => {
  it('renders CoffeesPage at the root route /', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('coffees-page')).toBeInTheDocument();
    });
  });

  it('does not render any HomePage component at /', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('coffees-page')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
  });

  it('does not import HomePage anywhere in App', async () => {
    // Read the App module source to verify no HomePage import exists
    const appModule = await import('./App?raw');
    const source = typeof appModule === 'string' ? appModule : appModule.default;

    expect(source).not.toContain('HomePage');
    expect(source).not.toContain('home');
  });
});
