import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { CoffeesPage } from "./CoffeesPage"

vi.mock("@/api/coffees", () => ({
  listCoffees: vi.fn(),
}))

import { listCoffees } from "@/api/coffees"

const mockedList = vi.mocked(listCoffees)

const mockCoffees = [
  {
    id: "c-1",
    roaster: "Cata Coffee",
    name: "Kiamaina",
    country: "Kenya",
    region: null,
    farm: "Kiamaina Estate",
    varietal: null,
    elevation: null,
    process: "Washed",
    roast_level: "Light",
    tasting_notes: "Apricot Nectar, Lemon Sorbet",
    roast_date: "2025-11-19",
    notes: "Best around 3-4 weeks",
    reference_brew_id: null,
    archived_at: null,
    brew_count: 8,
    last_brewed: "2026-01-19T10:30:00Z",
    created_at: "2025-11-22T15:00:00Z",
    updated_at: "2025-11-22T15:00:00Z",
  },
  {
    id: "c-2",
    roaster: "April",
    name: "El Diamante",
    country: "Colombia",
    region: null,
    farm: null,
    varietal: null,
    elevation: null,
    process: "Natural",
    roast_level: null,
    tasting_notes: null,
    roast_date: null,
    notes: null,
    reference_brew_id: null,
    archived_at: null,
    brew_count: 3,
    last_brewed: null,
    created_at: "2025-12-01T10:00:00Z",
    updated_at: "2025-12-01T10:00:00Z",
  },
]

function mockPaginatedResponse(items: typeof mockCoffees) {
  return {
    items,
    pagination: { page: 1, per_page: 100, total: items.length, total_pages: 1 },
  }
}

function CoffeeFormCapture() {
  return <div data-testid="coffee-form-new">New Coffee Form</div>
}

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/coffees"]}>
      <Routes>
        <Route path="/coffees" element={<CoffeesPage />} />
        <Route path="/coffees/new" element={<CoffeeFormCapture />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("CoffeesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading spinner then renders coffee cards", async () => {
    mockedList.mockResolvedValueOnce(mockPaginatedResponse(mockCoffees))

    renderWithRouter()

    // Loading state
    expect(screen.queryByRole("heading")).not.toBeInTheDocument()

    // Cards appear after load
    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(screen.getByText("Cata Coffee")).toBeInTheDocument()
    expect(screen.getByText("El Diamante")).toBeInTheDocument()
    expect(screen.getByText("April")).toBeInTheDocument()
  })

  it("shows empty state when no coffees exist", async () => {
    mockedList.mockResolvedValueOnce(mockPaginatedResponse([]))

    renderWithRouter()

    await waitFor(() => {
      expect(
        screen.getByText("No coffees in your library yet")
      ).toBeInTheDocument()
    })

    expect(screen.getByText("Add Your First Coffee")).toBeInTheDocument()
  })

  it("shows error state when fetching fails", async () => {
    mockedList.mockRejectedValueOnce(new Error("Network error"))

    renderWithRouter()

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load coffees. Please try again.")
      ).toBeInTheDocument()
    })

    expect(screen.getByText("Try Again")).toBeInTheDocument()
  })

  it("retries loading when Try Again is clicked", async () => {
    mockedList
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockPaginatedResponse(mockCoffees))

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load coffees. Please try again.")
      ).toBeInTheDocument()
    })

    await user.click(screen.getByText("Try Again"))

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it("navigates to /coffees/new when clicking Add Coffee", async () => {
    mockedList.mockResolvedValueOnce(mockPaginatedResponse(mockCoffees))
    const user = userEvent.setup()

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Add Coffee"))

    await waitFor(() => {
      expect(screen.getByTestId("coffee-form-new")).toBeInTheDocument()
    })
  })

  it("navigates to /coffees/new when clicking Add Your First Coffee", async () => {
    mockedList.mockResolvedValueOnce(mockPaginatedResponse([]))
    const user = userEvent.setup()

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("No coffees in your library yet")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Add Your First Coffee"))

    await waitFor(() => {
      expect(screen.getByTestId("coffee-form-new")).toBeInTheDocument()
    })
  })

  it("passes search parameter to API", async () => {
    mockedList.mockResolvedValue(mockPaginatedResponse(mockCoffees))

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText("Search coffees..."), "Cata")

    await waitFor(() => {
      const calls = mockedList.mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[0]).toEqual(
        expect.objectContaining({ search: "Cata" })
      )
    })
  })

  it("passes archived_only parameter when toggle is checked", async () => {
    mockedList
      .mockResolvedValueOnce(mockPaginatedResponse(mockCoffees))
      .mockResolvedValueOnce(mockPaginatedResponse([]))

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Show Archived"))

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalledWith(
        expect.objectContaining({ archived_only: true })
      )
    })
  })

  it("shows archived empty state when filter is on", async () => {
    mockedList
      .mockResolvedValueOnce(mockPaginatedResponse(mockCoffees))
      .mockResolvedValueOnce(mockPaginatedResponse([]))

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Show Archived"))

    await waitFor(() => {
      expect(screen.getByText("No archived coffees.")).toBeInTheDocument()
    })

    // Should NOT show "Add Your First Coffee" in archived mode
    expect(screen.queryByText("Add Your First Coffee")).not.toBeInTheDocument()
  })

  it("renders coffee cards with country and process tags", async () => {
    mockedList.mockResolvedValueOnce(mockPaginatedResponse(mockCoffees))

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(screen.getByText("Kenya")).toBeInTheDocument()
    expect(screen.getByText("Washed")).toBeInTheDocument()
    expect(screen.getByText("Colombia")).toBeInTheDocument()
    expect(screen.getByText("Natural")).toBeInTheDocument()
  })

  it("renders responsive grid layout", async () => {
    mockedList.mockResolvedValueOnce(mockPaginatedResponse(mockCoffees))

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    // Cards should be clickable articles
    const cards = screen.getAllByRole("article")
    expect(cards).toHaveLength(2)
  })
})
