import { useState, useEffect } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { Home, GlassWater, Coffee, Wrench, Settings, LogOut, Sun, Moon, Monitor, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/brews", label: "Brews", icon: GlassWater },
  { to: "/coffees", label: "Coffees", icon: Coffee },
  { to: "/equipment", label: "Equipment", icon: Wrench },
] as const

const themeOptions = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
] as const

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { logout } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <>
      <div className="flex h-14 items-center border-b border-border px-6">
        <span className="text-lg font-semibold">Coffee Tracker</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-muted text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}

        <div className="mt-auto border-t border-border pt-3">
          <div className="mb-2 flex items-center rounded-md bg-muted p-1" role="radiogroup" aria-label="Theme">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                role="radio"
                aria-checked={theme === opt.value}
                aria-label={opt.label}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "flex flex-1 items-center justify-center rounded-sm py-1.5 text-sm transition-colors",
                  theme === opt.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <opt.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <NavLink
            to="/preferences"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-muted text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Settings className="h-4 w-4" />
            Preferences
          </NavLink>
          <button
            onClick={() => {
              onNavigate?.()
              logout()
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </nav>
    </>
  )
}

export function MobileHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Close sheet on route change
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <>
      <header className="flex h-14 items-center border-b border-border bg-card px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="ml-3 text-lg font-semibold">Coffee Tracker</span>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sheet */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-card shadow-lg transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-label="Navigation menu"
        aria-modal={open}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close navigation menu"
          className="absolute right-3 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </aside>
    </>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 border-r border-border bg-card lg:flex lg:flex-col">
      <SidebarContent />
    </aside>
  )
}
