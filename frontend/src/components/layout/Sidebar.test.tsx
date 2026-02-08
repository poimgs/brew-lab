import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { Sidebar } from "./Sidebar"

const mockSetTheme = vi.fn()

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@example.com" },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: "system" as const,
    resolved: "light" as const,
    setTheme: mockSetTheme,
  }),
}))

function renderSidebar(initialRoute = "/") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Sidebar />
    </MemoryRouter>
  )
}

describe("Sidebar", () => {
  it("renders the app name", () => {
    renderSidebar()
    expect(screen.getByText("Coffee Tracker")).toBeInTheDocument()
  })

  it("renders all navigation items", () => {
    renderSidebar()
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("Coffees")).toBeInTheDocument()
    expect(screen.getByText("Equipment")).toBeInTheDocument()
  })

  it("renders links with correct hrefs", () => {
    renderSidebar()
    expect(screen.getByText("Home").closest("a")).toHaveAttribute("href", "/")
    expect(screen.getByText("Coffees").closest("a")).toHaveAttribute("href", "/coffees")
    expect(screen.getByText("Equipment").closest("a")).toHaveAttribute("href", "/equipment")
  })

  it("renders Preferences link and Logout button", () => {
    renderSidebar()
    expect(screen.getByText("Preferences")).toBeInTheDocument()
    expect(screen.getByText("Preferences").closest("a")).toHaveAttribute("href", "/preferences")
    expect(screen.getByText("Logout")).toBeInTheDocument()
  })

  it("renders theme toggle with Light, Dark, and System options", () => {
    renderSidebar()
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Light" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Dark" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "System" })).toBeInTheDocument()
  })

  it("calls setTheme when a theme option is clicked", async () => {
    const user = userEvent.setup()
    renderSidebar()
    await user.click(screen.getByRole("radio", { name: "Dark" }))
    expect(mockSetTheme).toHaveBeenCalledWith("dark")
  })
})
