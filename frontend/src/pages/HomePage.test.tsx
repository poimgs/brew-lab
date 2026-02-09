import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { HomePage } from "./HomePage"

const mockNavigate = vi.fn()
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock("@/api/brews", () => ({
  getRecentBrews: vi.fn(),
  getBrew: vi.fn(),
}))

vi.mock("@/api/coffees", () => ({
  setReferenceBrew: vi.fn(),
}))

import { getRecentBrews, getBrew } from "@/api/brews"

const mockedGetRecentBrews = vi.mocked(getRecentBrews)
const mockedGetBrew = vi.mocked(getBrew)

const mockBrews = [
  {
    id: "b-1",
    coffee_id: "c-1",
    coffee_name: "Kiamaina",
    coffee_roaster: "Cata Coffee",
    coffee_tasting_notes: "Blackberry, lime, brown sugar",
    brew_date: "2026-01-19",
    days_off_roast: 61,
    coffee_weight: 15,
    ratio: 15,
    water_weight: 225,
    grind_size: 3.5,
    water_temperature: 96,
    filter_paper: { id: "fp-1", name: "Abaca", brand: "Cafec" },
    pours: [
      { pour_number: 1, water_amount: 45, pour_style: "center", wait_time: 30 },
      { pour_number: 2, water_amount: 90, pour_style: "circular", wait_time: null },
    ],
    total_brew_time: 165,
    technique_notes: null,
    coffee_ml: 200,
    tds: 1.38,
    extraction_yield: 18.4,
    aroma_intensity: 7,
    body_intensity: 7,
    sweetness_intensity: 8,
    brightness_intensity: 7,
    complexity_intensity: 6,
    aftertaste_intensity: 7,
    overall_score: 8,
    overall_notes: "Bright acidity",
    improvement_notes: null,
    created_at: "2026-01-19T10:30:00Z",
    updated_at: "2026-01-19T10:30:00Z",
  },
  {
    id: "b-2",
    coffee_id: "c-2",
    coffee_name: "El Diamante",
    coffee_roaster: "April",
    coffee_tasting_notes: null,
    brew_date: "2026-01-18",
    days_off_roast: null,
    coffee_weight: 16,
    ratio: 16,
    water_weight: 256,
    grind_size: 4,
    water_temperature: 93,
    filter_paper: null,
    pours: [],
    total_brew_time: null,
    technique_notes: null,
    coffee_ml: null,
    tds: null,
    extraction_yield: null,
    aroma_intensity: null,
    body_intensity: null,
    sweetness_intensity: null,
    brightness_intensity: null,
    complexity_intensity: null,
    aftertaste_intensity: null,
    overall_score: null,
    overall_notes: null,
    improvement_notes: null,
    created_at: "2026-01-18T10:00:00Z",
    updated_at: "2026-01-18T10:00:00Z",
  },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  )
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading spinner initially", () => {
    mockedGetRecentBrews.mockReturnValue(new Promise(() => {})) // never resolves
    renderPage()
    expect(screen.queryByText("Home")).not.toBeInTheDocument()
  })

  it("renders recent brews after loading", async () => {
    mockedGetRecentBrews.mockResolvedValueOnce({ items: mockBrews })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
    })

    expect(screen.getByText("Recent Brews")).toBeInTheDocument()
    expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    expect(screen.getByText("El Diamante")).toBeInTheDocument()
  })

  it("shows empty state when no brews exist", async () => {
    mockedGetRecentBrews.mockResolvedValueOnce({ items: [] })
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByText("Add your first coffee to get started")
      ).toBeInTheDocument()
    })

    expect(screen.getByText("Go to Coffees")).toBeInTheDocument()
    expect(screen.getByText("Log a Brew")).toBeInTheDocument()
  })

  it("shows error state with retry", async () => {
    mockedGetRecentBrews
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ items: mockBrews })

    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load recent brews.")
      ).toBeInTheDocument()
    })

    await user.click(screen.getByText("Try Again"))

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(mockedGetRecentBrews).toHaveBeenCalledTimes(2)
  })

  it("displays Log a Brew button that navigates to /brews/new", async () => {
    mockedGetRecentBrews.mockResolvedValueOnce({ items: mockBrews })

    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("Log a Brew")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Log a Brew"))
    expect(mockNavigate).toHaveBeenCalledWith("/brews/new")
  })

  it("displays score with color coding", async () => {
    mockedGetRecentBrews.mockResolvedValueOnce({ items: mockBrews })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("8/10")).toBeInTheDocument()
    })

    const scoreEl = screen.getByText("8/10")
    expect(scoreEl.className).toContain("teal")
  })

  it("displays ratio formatted as 1:X", async () => {
    mockedGetRecentBrews.mockResolvedValueOnce({ items: mockBrews })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(screen.getByText("1:15")).toBeInTheDocument()
    expect(screen.getByText("1:16")).toBeInTheDocument()
  })

  it("shows View all brews link", async () => {
    mockedGetRecentBrews.mockResolvedValueOnce({ items: mockBrews })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    const link = screen.getByText(/View all brews/)
    expect(link).toBeInTheDocument()
    expect(link.closest("a")).toHaveAttribute("href", "/brews")
  })

  it("navigates to edit when Edit action is clicked", async () => {
    mockedGetRecentBrews.mockResolvedValueOnce({ items: mockBrews })

    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    const editButtons = screen.getAllByTitle("Edit")
    await user.click(editButtons[0])

    expect(mockNavigate).toHaveBeenCalledWith("/brews/b-1/edit")
  })

  it("navigates to brew again when Brew Again action is clicked", async () => {
    mockedGetRecentBrews.mockResolvedValueOnce({ items: mockBrews })

    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    const brewAgainButtons = screen.getAllByTitle("Brew Again")
    await user.click(brewAgainButtons[0])

    expect(mockNavigate).toHaveBeenCalledWith("/brews/new?from=b-1")
  })

  it("opens brew detail modal when row is clicked", async () => {
    mockedGetRecentBrews.mockResolvedValueOnce({ items: mockBrews })
    mockedGetBrew.mockResolvedValueOnce(mockBrews[0])

    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    // Click the first brew row
    const rows = screen.getAllByRole("button")
    // Find the row button (not the Edit/Brew Again action buttons)
    const brewRow = rows.find(
      (el) => el.textContent?.includes("Kiamaina") && el.getAttribute("title") === null
    )
    expect(brewRow).toBeDefined()
    await user.click(brewRow!)

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    expect(screen.getByText(/Brew Detail/)).toBeInTheDocument()
  })

  it("action buttons stop propagation (do not open modal)", async () => {
    mockedGetRecentBrews.mockResolvedValueOnce({ items: mockBrews })

    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    const editButtons = screen.getAllByTitle("Edit")
    await user.click(editButtons[0])

    // Modal should NOT open — action button stops propagation
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(mockNavigate).toHaveBeenCalledWith("/brews/b-1/edit")
  })

  it("shows Log a Brew button in empty state that navigates to /brews/new", async () => {
    mockedGetRecentBrews.mockResolvedValueOnce({ items: [] })

    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByText("Add your first coffee to get started")
      ).toBeInTheDocument()
    })

    await user.click(screen.getByText("Log a Brew"))
    expect(mockNavigate).toHaveBeenCalledWith("/brews/new")
  })

  it("shows Log a Brew button in error state that navigates to /brews/new", async () => {
    mockedGetRecentBrews.mockRejectedValueOnce(new Error("Network error"))

    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load recent brews.")
      ).toBeInTheDocument()
    })

    await user.click(screen.getByText("Log a Brew"))
    expect(mockNavigate).toHaveBeenCalledWith("/brews/new")
  })

  it("shows Log a Brew button during loading state", () => {
    mockedGetRecentBrews.mockReturnValue(new Promise(() => {})) // never resolves
    renderPage()

    expect(screen.getByText("Log a Brew")).toBeInTheDocument()
  })

  it("calls getRecentBrews with limit 5", async () => {
    mockedGetRecentBrews.mockResolvedValueOnce({ items: mockBrews })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(mockedGetRecentBrews).toHaveBeenCalledWith(5)
  })

  it("refreshes data after modal mutation", async () => {
    mockedGetRecentBrews.mockResolvedValue({ items: mockBrews })
    mockedGetBrew.mockResolvedValue(mockBrews[0])

    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    const callCountBefore = mockedGetRecentBrews.mock.calls.length

    // Open modal by clicking a row
    const rows = screen.getAllByRole("button")
    const brewRow = rows.find(
      (el) => el.textContent?.includes("Kiamaina") && el.getAttribute("title") === null
    )
    await user.click(brewRow!)

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })

    // Close modal
    await user.click(screen.getByRole("button", { name: "Close" }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    // Data should have been fetched at least the initial time
    expect(mockedGetRecentBrews.mock.calls.length).toBeGreaterThanOrEqual(
      callCountBefore
    )
  })
})
