import { vi, describe, it, expect, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"

const mockNavigate = vi.fn()
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock("@/api/brews", () => ({
  listBrewsByCoffee: vi.fn(),
}))

import { listBrewsByCoffee } from "@/api/brews"
import { BrewHistoryTable } from "./BrewHistoryTable"

const mockedList = vi.mocked(listBrewsByCoffee)

function makeBrew(overrides: Record<string, unknown> = {}) {
  return {
    id: "b-1",
    coffee_id: "c-1",
    coffee_name: "Kiamaina",
    coffee_roaster: "Cata",
    coffee_tasting_notes: null,
    coffee_reference_brew_id: null,
    brew_date: "2026-01-19",
    days_off_roast: 61,
    coffee_weight: 15,
    ratio: 15,
    water_weight: 225,
    grind_size: 3.5,
    water_temperature: 96,
    filter_paper: { id: "fp-1", name: "Abaca", brand: "Cafec" },
    dripper: null,
    pours: [],
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
    overall_notes: null,
    improvement_notes: null,
    created_at: "2026-01-19T10:30:00Z",
    updated_at: "2026-01-19T10:30:00Z",
    ...overrides,
  }
}

function makeResponse(brews: ReturnType<typeof makeBrew>[]) {
  return {
    items: brews,
    pagination: { page: 1, per_page: 20, total: brews.length, total_pages: 1 },
  }
}

const defaultProps = {
  coffeeId: "c-1",
  referenceBrewId: null,
  refreshKey: 0,
  onStarBrew: vi.fn(),
  onRowClick: vi.fn(),
  isStarring: false,
}

function renderTable(props = {}) {
  return render(
    <MemoryRouter>
      <BrewHistoryTable {...defaultProps} {...props} />
    </MemoryRouter>
  )
}

describe("BrewHistoryTable — comparison selection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders a checkbox on each brew row", async () => {
    const brews = [
      makeBrew({ id: "b-1", brew_date: "2026-01-19" }),
      makeBrew({ id: "b-2", brew_date: "2026-01-15" }),
    ]
    mockedList.mockResolvedValueOnce(makeResponse(brews))
    renderTable()

    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox")
      expect(checkboxes).toHaveLength(2)
    })
  })

  it("does not show compare bar when no brews are selected", async () => {
    mockedList.mockResolvedValueOnce(
      makeResponse([makeBrew({ id: "b-1" })])
    )
    renderTable()

    await waitFor(() => {
      expect(screen.getByRole("checkbox")).toBeInTheDocument()
    })

    expect(screen.queryByText("Compare")).not.toBeInTheDocument()
  })

  it("shows compare bar with selection count when brews are selected", async () => {
    const user = userEvent.setup()
    const brews = [
      makeBrew({ id: "b-1", brew_date: "2026-01-19" }),
      makeBrew({ id: "b-2", brew_date: "2026-01-15" }),
    ]
    mockedList.mockResolvedValueOnce(makeResponse(brews))
    renderTable()

    await waitFor(() => {
      expect(screen.getAllByRole("checkbox")).toHaveLength(2)
    })

    await user.click(screen.getAllByRole("checkbox")[0])
    expect(screen.getByText("1 selected")).toBeInTheDocument()
    expect(screen.getByText("Compare")).toBeInTheDocument()
  })

  it("disables Compare button when fewer than 2 brews selected", async () => {
    const user = userEvent.setup()
    const brews = [
      makeBrew({ id: "b-1", brew_date: "2026-01-19" }),
      makeBrew({ id: "b-2", brew_date: "2026-01-15" }),
    ]
    mockedList.mockResolvedValueOnce(makeResponse(brews))
    renderTable()

    await waitFor(() => {
      expect(screen.getAllByRole("checkbox")).toHaveLength(2)
    })

    await user.click(screen.getAllByRole("checkbox")[0])
    const compareBtn = screen.getByText("Compare").closest("button")!
    expect(compareBtn).toBeDisabled()
  })

  it("enables Compare button when 2 or more brews are selected", async () => {
    const user = userEvent.setup()
    const brews = [
      makeBrew({ id: "b-1", brew_date: "2026-01-19" }),
      makeBrew({ id: "b-2", brew_date: "2026-01-15" }),
    ]
    mockedList.mockResolvedValueOnce(makeResponse(brews))
    renderTable()

    await waitFor(() => {
      expect(screen.getAllByRole("checkbox")).toHaveLength(2)
    })

    await user.click(screen.getAllByRole("checkbox")[0])
    await user.click(screen.getAllByRole("checkbox")[1])
    const compareBtn = screen.getByText("Compare").closest("button")!
    expect(compareBtn).not.toBeDisabled()
  })

  it("navigates to comparison page with selected brew IDs", async () => {
    const user = userEvent.setup()
    const brews = [
      makeBrew({ id: "b-1", brew_date: "2026-01-19" }),
      makeBrew({ id: "b-2", brew_date: "2026-01-15" }),
    ]
    mockedList.mockResolvedValueOnce(makeResponse(brews))
    renderTable()

    await waitFor(() => {
      expect(screen.getAllByRole("checkbox")).toHaveLength(2)
    })

    await user.click(screen.getAllByRole("checkbox")[0])
    await user.click(screen.getAllByRole("checkbox")[1])
    await user.click(screen.getByText("Compare").closest("button")!)

    expect(mockNavigate).toHaveBeenCalledWith(
      "/brews/compare?brews=b-1,b-2&from=coffee&coffee_id=c-1"
    )
  })

  it("deselects a brew when its checkbox is clicked again", async () => {
    const user = userEvent.setup()
    const brews = [
      makeBrew({ id: "b-1", brew_date: "2026-01-19" }),
      makeBrew({ id: "b-2", brew_date: "2026-01-15" }),
    ]
    mockedList.mockResolvedValueOnce(makeResponse(brews))
    renderTable()

    await waitFor(() => {
      expect(screen.getAllByRole("checkbox")).toHaveLength(2)
    })

    const firstCheckbox = screen.getAllByRole("checkbox")[0]
    await user.click(firstCheckbox)
    expect(screen.getByText("1 selected")).toBeInTheDocument()

    await user.click(firstCheckbox)
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument()
    expect(screen.queryByText("Compare")).not.toBeInTheDocument()
  })

  it("disables 5th checkbox when 4 are already selected", async () => {
    const user = userEvent.setup()
    const brews = [
      makeBrew({ id: "b-1", brew_date: "2026-01-19" }),
      makeBrew({ id: "b-2", brew_date: "2026-01-15" }),
      makeBrew({ id: "b-3", brew_date: "2026-01-12" }),
      makeBrew({ id: "b-4", brew_date: "2026-01-10" }),
      makeBrew({ id: "b-5", brew_date: "2026-01-08" }),
    ]
    mockedList.mockResolvedValueOnce(makeResponse(brews))
    renderTable()

    await waitFor(() => {
      expect(screen.getAllByRole("checkbox")).toHaveLength(5)
    })

    const checkboxes = screen.getAllByRole("checkbox")
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])
    await user.click(checkboxes[2])
    await user.click(checkboxes[3])

    expect(screen.getByText("4 selected")).toBeInTheDocument()
    expect(checkboxes[4]).toBeDisabled()
    expect(checkboxes[4]).toHaveAttribute(
      "title",
      "Maximum 4 brews can be compared"
    )
  })

  it("checkbox click does not trigger row click", async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    mockedList.mockResolvedValueOnce(
      makeResponse([makeBrew({ id: "b-1" })])
    )
    renderTable({ onRowClick })

    await waitFor(() => {
      expect(screen.getByRole("checkbox")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("checkbox"))
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it("Clear button resets all selections", async () => {
    const user = userEvent.setup()
    const brews = [
      makeBrew({ id: "b-1", brew_date: "2026-01-19" }),
      makeBrew({ id: "b-2", brew_date: "2026-01-15" }),
    ]
    mockedList.mockResolvedValueOnce(makeResponse(brews))
    renderTable()

    await waitFor(() => {
      expect(screen.getAllByRole("checkbox")).toHaveLength(2)
    })

    await user.click(screen.getAllByRole("checkbox")[0])
    await user.click(screen.getAllByRole("checkbox")[1])
    expect(screen.getByText("2 selected")).toBeInTheDocument()

    await user.click(screen.getByText("Clear"))
    expect(screen.queryByText("Compare")).not.toBeInTheDocument()

    const checkboxes = screen.getAllByRole("checkbox")
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()
  })

  it("selected checkboxes remain enabled when at max", async () => {
    const user = userEvent.setup()
    const brews = [
      makeBrew({ id: "b-1", brew_date: "2026-01-19" }),
      makeBrew({ id: "b-2", brew_date: "2026-01-15" }),
      makeBrew({ id: "b-3", brew_date: "2026-01-12" }),
      makeBrew({ id: "b-4", brew_date: "2026-01-10" }),
      makeBrew({ id: "b-5", brew_date: "2026-01-08" }),
    ]
    mockedList.mockResolvedValueOnce(makeResponse(brews))
    renderTable()

    await waitFor(() => {
      expect(screen.getAllByRole("checkbox")).toHaveLength(5)
    })

    const checkboxes = screen.getAllByRole("checkbox")
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])
    await user.click(checkboxes[2])
    await user.click(checkboxes[3])

    // Already-selected checkboxes should NOT be disabled
    expect(checkboxes[0]).not.toBeDisabled()
    expect(checkboxes[1]).not.toBeDisabled()
    expect(checkboxes[2]).not.toBeDisabled()
    expect(checkboxes[3]).not.toBeDisabled()

    // Only the unselected 5th is disabled
    expect(checkboxes[4]).toBeDisabled()
  })
})
