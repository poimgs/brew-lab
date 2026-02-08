import { NavLink } from "react-router-dom"
import { Home, GlassWater, Coffee, Wrench, Settings, LogOut, Sun, Moon, Monitor } from "lucide-react"
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

export function Sidebar() {
  const { logout } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <aside className="hidden w-60 border-r border-border bg-card lg:flex lg:flex-col">
      <div className="flex h-14 items-center border-b border-border px-6">
        <span className="text-lg font-semibold">Coffee Tracker</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
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
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </nav>
    </aside>
  )
}
