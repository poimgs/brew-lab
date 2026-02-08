import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { MobileHeader } from "./Sidebar"

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
    setTheme: vi.fn(),
  }),
}))

function renderMobileHeader(initialRoute = "/") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <MobileHeader />
    </MemoryRouter>
  )
}

describe("MobileHeader", () => {
  it("renders a hamburger button to open navigation", () => {
    renderMobileHeader()
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toBeInTheDocument()
  })

  it("does not show navigation links before opening the menu", () => {
    renderMobileHeader()
    // The sheet is off-screen (translated), so the links exist in DOM
    // but the dialog should not be marked as modal when closed
    const dialog = screen.getByRole("dialog", { name: "Navigation menu" })
    expect(dialog).toHaveAttribute("aria-modal", "false")
  })

  it("opens the navigation sheet when hamburger is clicked", async () => {
    const user = userEvent.setup()
    renderMobileHeader()

    await user.click(screen.getByRole("button", { name: "Open navigation menu" }))

    const dialog = screen.getByRole("dialog", { name: "Navigation menu" })
    expect(dialog).toHaveAttribute("aria-modal", "true")
    // All nav links should be present
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("Brews")).toBeInTheDocument()
    expect(screen.getByText("Coffees")).toBeInTheDocument()
    expect(screen.getByText("Equipment")).toBeInTheDocument()
    expect(screen.getByText("Preferences")).toBeInTheDocument()
    expect(screen.getByText("Logout")).toBeInTheDocument()
  })

  it("closes the navigation sheet when the close button is clicked", async () => {
    const user = userEvent.setup()
    renderMobileHeader()

    await user.click(screen.getByRole("button", { name: "Open navigation menu" }))
    const dialog = screen.getByRole("dialog", { name: "Navigation menu" })
    expect(dialog).toHaveAttribute("aria-modal", "true")

    await user.click(screen.getByRole("button", { name: "Close navigation menu" }))
    expect(dialog).toHaveAttribute("aria-modal", "false")
  })

  it("closes the navigation sheet when a nav link is clicked", async () => {
    const user = userEvent.setup()
    renderMobileHeader()

    await user.click(screen.getByRole("button", { name: "Open navigation menu" }))
    const dialog = screen.getByRole("dialog", { name: "Navigation menu" })
    expect(dialog).toHaveAttribute("aria-modal", "true")

    await user.click(screen.getByText("Coffees"))
    expect(dialog).toHaveAttribute("aria-modal", "false")
  })

  it("renders navigation links with correct hrefs", async () => {
    const user = userEvent.setup()
    renderMobileHeader()

    await user.click(screen.getByRole("button", { name: "Open navigation menu" }))

    expect(screen.getByText("Home").closest("a")).toHaveAttribute("href", "/")
    expect(screen.getByText("Brews").closest("a")).toHaveAttribute("href", "/brews")
    expect(screen.getByText("Coffees").closest("a")).toHaveAttribute("href", "/coffees")
    expect(screen.getByText("Equipment").closest("a")).toHaveAttribute("href", "/equipment")
    expect(screen.getByText("Preferences").closest("a")).toHaveAttribute("href", "/preferences")
  })

  it("closes the navigation sheet when the backdrop is clicked", async () => {
    const user = userEvent.setup()
    renderMobileHeader()

    await user.click(screen.getByRole("button", { name: "Open navigation menu" }))
    const dialog = screen.getByRole("dialog", { name: "Navigation menu" })
    expect(dialog).toHaveAttribute("aria-modal", "true")

    // Click the backdrop (aria-hidden div)
    const backdrop = dialog.previousElementSibling as HTMLElement
    await user.click(backdrop)
    expect(dialog).toHaveAttribute("aria-modal", "false")
  })

  it("includes theme toggle in the sheet", async () => {
    const user = userEvent.setup()
    renderMobileHeader()

    await user.click(screen.getByRole("button", { name: "Open navigation menu" }))

    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Light" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Dark" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "System" })).toBeInTheDocument()
  })
})
