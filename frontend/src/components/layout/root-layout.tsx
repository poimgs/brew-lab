import { Coffee, LogOut } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { PageContainer } from "./page-container"
import { useAuth } from "@/contexts/auth-context"

interface RootLayoutProps {
  children: React.ReactNode
}

export function RootLayout({ children }: RootLayoutProps) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <PageContainer>
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Coffee className="h-6 w-6 text-primary" />
              <span className="font-display text-xl font-bold">
                Coffee Tracker
              </span>
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
