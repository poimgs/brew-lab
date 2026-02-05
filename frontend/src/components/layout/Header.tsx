import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
}

function NavLink({ to, children }: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <Link
      to={to}
      className={cn(
        'px-3 py-2 text-sm font-medium transition-colors hover:text-foreground',
        isActive
          ? 'text-teal-600 border-b-2 border-teal-600'
          : 'text-muted-foreground'
      )}
    >
      {children}
    </Link>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-6">
            {/* Mobile menu button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <nav className="flex flex-col gap-4 mt-8">
                  <Link
                    to="/"
                    className="text-lg font-medium hover:text-teal-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Home
                  </Link>
                  <Link
                    to="/experiments"
                    className="text-lg font-medium hover:text-teal-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Experiments
                  </Link>
                  <Link
                    to="/analysis"
                    className="text-lg font-medium hover:text-teal-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Analysis
                  </Link>
                  <Link
                    to="/coffees"
                    className="text-lg font-medium hover:text-teal-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Coffees
                  </Link>
                  <Link
                    to="/library"
                    className="text-lg font-medium hover:text-teal-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Library
                  </Link>
                  <Link
                    to="/preferences"
                    className="text-lg font-medium hover:text-teal-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Preferences
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>

            <Link to="/" className="text-lg font-semibold">
              Coffee Tracker
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/">Home</NavLink>
              <NavLink to="/experiments">Experiments</NavLink>
              <NavLink to="/analysis">Analysis</NavLink>
              <NavLink to="/coffees">Coffees</NavLink>
              <NavLink to="/library">Library</NavLink>
            </nav>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user?.email}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/preferences" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Preferences
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
