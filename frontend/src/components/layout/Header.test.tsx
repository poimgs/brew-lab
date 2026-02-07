import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

// Mock ThemeToggle to avoid theme context dependency
vi.mock('./ThemeToggle', () => ({
  default: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

function renderAtRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Header />
    </MemoryRouter>
  );
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('navigation structure', () => {
    it('does not render a Home nav link', () => {
      renderAtRoute('/');

      const desktopNav = document.querySelector('nav.hidden.md\\:flex') as HTMLElement;
      expect(desktopNav).not.toBeNull();
      expect(within(desktopNav).queryByText('Home')).not.toBeInTheDocument();
    });

    it('renders Coffees as the first desktop nav link pointing to /', () => {
      renderAtRoute('/');

      const desktopNav = document.querySelector('nav.hidden.md\\:flex') as HTMLElement;
      const links = within(desktopNav).getAllByRole('link');

      expect(links[0]).toHaveTextContent('Coffees');
      expect(links[0]).toHaveAttribute('href', '/');
    });

    it('renders all expected desktop nav items in order', () => {
      renderAtRoute('/');

      const desktopNav = document.querySelector('nav.hidden.md\\:flex') as HTMLElement;
      const links = within(desktopNav).getAllByRole('link');
      const labels = links.map((link) => link.textContent);

      expect(labels).toEqual(['Coffees', 'Dashboard', 'Library']);
    });

    it('renders the correct routes for desktop nav items', () => {
      renderAtRoute('/');

      const desktopNav = document.querySelector('nav.hidden.md\\:flex') as HTMLElement;
      const links = within(desktopNav).getAllByRole('link');
      const hrefs = links.map((link) => link.getAttribute('href'));

      expect(hrefs).toEqual(['/', '/dashboard', '/library']);
    });

    it('does not render Brews or Analysis nav items', () => {
      renderAtRoute('/');

      const desktopNav = document.querySelector('nav.hidden.md\\:flex') as HTMLElement;
      expect(within(desktopNav).queryByText('Brews')).not.toBeInTheDocument();
      expect(within(desktopNav).queryByText('Analysis')).not.toBeInTheDocument();
    });

    it('renders Coffee Tracker logo link pointing to /', () => {
      renderAtRoute('/');

      const logoLink = screen.getByText('Coffee Tracker');
      expect(logoLink.closest('a')).toHaveAttribute('href', '/');
    });
  });

  describe('active state', () => {
    it('highlights Coffees when on /', () => {
      renderAtRoute('/');

      const desktopNav = document.querySelector('nav.hidden.md\\:flex') as HTMLElement;
      const coffeesLink = within(desktopNav).getByText('Coffees');

      expect(coffeesLink).toHaveClass('text-primary');
      expect(coffeesLink).toHaveClass('border-primary');
    });

    it('highlights Coffees when on /coffees/:id (detail page)', () => {
      renderAtRoute('/coffees/some-uuid');

      const desktopNav = document.querySelector('nav.hidden.md\\:flex') as HTMLElement;
      const coffeesLink = within(desktopNav).getByText('Coffees');

      expect(coffeesLink).toHaveClass('text-primary');
      expect(coffeesLink).toHaveClass('border-primary');
    });

    it('highlights Dashboard when on /dashboard', () => {
      renderAtRoute('/dashboard');

      const desktopNav = document.querySelector('nav.hidden.md\\:flex') as HTMLElement;
      const dashboardLink = within(desktopNav).getByText('Dashboard');

      expect(dashboardLink).toHaveClass('text-primary');
    });

    it('does not highlight Coffees when on /dashboard', () => {
      renderAtRoute('/dashboard');

      const desktopNav = document.querySelector('nav.hidden.md\\:flex') as HTMLElement;
      const coffeesLink = within(desktopNav).getByText('Coffees');

      expect(coffeesLink).toHaveClass('text-muted-foreground');
      expect(coffeesLink).not.toHaveClass('text-primary');
    });
  });
});
