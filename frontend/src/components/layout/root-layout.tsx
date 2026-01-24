import { Link, useLocation } from "react-router-dom"
import { Coffee, LogOut, Library, FlaskConical, Settings, GitBranch, Database, Lightbulb } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { PageContainer } from "./page-container"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

interface RootLayoutProps {
  children: React.ReactNode
}

export function RootLayout({ children }: RootLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === "/experiments") {
      return location.pathname === "/experiments" || location.pathname.startsWith("/experiments/")
    }
    return location.pathname === path || location.pathname.startsWith(path + "/")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <PageContainer>
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2">
                <Coffee className="h-6 w-6 text-primary" />
                <span className="font-display text-xl font-bold hidden sm:inline">
                  Coffee Tracker
                </span>
              </Link>
              {user && (
                <nav className="flex items-center gap-1">
                  <Link
                    to="/experiments"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive("/experiments")
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <FlaskConical className="h-4 w-4" />
                    <span className="hidden sm:inline">Experiments</span>
                  </Link>
                  <Link
                    to="/library"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive("/library")
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Library className="h-4 w-4" />
                    <span className="hidden sm:inline">Library</span>
                  </Link>
                  <Link
                    to="/effect-mappings"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive("/effect-mappings")
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <GitBranch className="h-4 w-4" />
                    <span className="hidden sm:inline">Effects</span>
                  </Link>
                  <Link
                    to="/recommendations"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive("/recommendations")
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Lightbulb className="h-4 w-4" />
                    <span className="hidden sm:inline">Recommendations</span>
                  </Link>
                  <Link
                    to="/settings/reference-data"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive("/settings/reference-data")
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Database className="h-4 w-4" />
                    <span className="hidden sm:inline">Reference</span>
                  </Link>
                  <Link
                    to="/settings/defaults"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive("/settings/defaults")
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </Link>
                </nav>
              )}
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <>
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {user.email}
                  </span>
                  <Button variant="ghost" size="icon" onClick={logout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              )}
              <ThemeToggle />
            </div>
          </div>
        </PageContainer>
      </header>
      <main className="py-6">
        <PageContainer>{children}</PageContainer>
      </main>
    </div>
  )
}
