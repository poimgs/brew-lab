import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeProvider, useTheme } from "./ThemeContext"

// Helper component to expose theme context in tests
function ThemeConsumer() {
  const { theme, resolved, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolved}</span>
      <button onClick={() => setTheme("dark")}>Dark</button>
      <button onClick={() => setTheme("light")}>Light</button>
      <button onClick={() => setTheme("system")}>System</button>
    </div>
  )
}

let matchMediaListeners: Array<() => void> = []
let matchMediaMatches = false

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove("dark")
  matchMediaListeners = []
  matchMediaMatches = false
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? matchMediaMatches : false,
      media: query,
      addEventListener: (_: string, handler: () => void) => {
        matchMediaListeners.push(handler)
      },
      removeEventListener: (_: string, handler: () => void) => {
        matchMediaListeners = matchMediaListeners.filter((h) => h !== handler)
      },
    })),
  })
})

afterEach(() => {
  matchMediaListeners = []
})

describe("ThemeContext", () => {
  it("defaults to system theme when no localStorage value", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId("theme").textContent).toBe("system")
    expect(screen.getByTestId("resolved").textContent).toBe("light")
  })

  it("resolves system theme to dark when prefers-color-scheme is dark", () => {
    matchMediaMatches = true
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId("theme").textContent).toBe("system")
    expect(screen.getByTestId("resolved").textContent).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("reads theme from localStorage", () => {
    localStorage.setItem("coffee-tracker-theme", "dark")
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId("theme").textContent).toBe("dark")
    expect(screen.getByTestId("resolved").textContent).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("persists theme to localStorage on change", async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    await user.click(screen.getByText("Dark"))
    expect(localStorage.getItem("coffee-tracker-theme")).toBe("dark")
    expect(screen.getByTestId("theme").textContent).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("switches from dark to light and removes .dark class", async () => {
    localStorage.setItem("coffee-tracker-theme", "dark")
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    expect(document.documentElement.classList.contains("dark")).toBe(true)

    await user.click(screen.getByText("Light"))
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(screen.getByTestId("resolved").textContent).toBe("light")
  })

  it("responds to system preference changes in system mode", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId("resolved").textContent).toBe("light")

    // Simulate system switching to dark
    matchMediaMatches = true
    act(() => {
      matchMediaListeners.forEach((fn) => fn())
    })
    expect(screen.getByTestId("resolved").textContent).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("ignores system preference changes when not in system mode", async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    await user.click(screen.getByText("Light"))
    expect(matchMediaListeners).toHaveLength(0)
  })

  it("ignores invalid localStorage values", () => {
    localStorage.setItem("coffee-tracker-theme", "invalid-value")
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId("theme").textContent).toBe("system")
  })

  it("throws when useTheme is used outside ThemeProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider"
    )
    consoleSpy.mockRestore()
  })
})
