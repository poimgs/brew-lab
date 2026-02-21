import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { BrewComparisonPage } from "./BrewComparisonPage"

vi.mock("@/api/brews", () => ({
  getBrew: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

import { getBrew } from "@/api/brews"
import { toast } from "sonner"
import type { Brew } from "@/api/brews"

const mockedGetBrew = vi.mocked(getBrew)
const mockedToast = vi.mocked(toast)

function makeBrew(overrides: Partial<Brew> = {}): Brew {
  return {
    id: "b-1",
    coffee_id: "c-1",
    coffee_name: "Kiamaina",
    coffee_roaster: "Cata Coffee",
    coffee_tasting_notes: "Blackberry, lime",
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
    pours: [
      { pour_number: 1, water_amount: 45, pour_style: "center", wait_time: 30 },
      { pour_number: 2, water_amount: 90, pour_style: "circular", wait_time: null },
      { pour_number: 3, water_amount: 90, pour_style: "circular", wait_time: null },
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
    overall_notes: "Bright acidity, well balanced",
    improvement_notes: null,
    created_at: "2026-01-19T10:30:00Z",
    updated_at: "2026-01-19T10:30:00Z",
    ...overrides,
  }
}

const brew1 = makeBrew({ id: "b-1", brew_date: "2026-01-19", days_off_roast: 61, overall_score: 8, tds: 1.38, extraction_yield: 18.4 })
const brew2 = makeBrew({
  id: "b-2",
  brew_date: "2026-01-15",
  days_off_roast: 57,
  ratio: 16,
  water_weight: 240,
  grind_size: 4.0,
  water_temperature: 94,
  overall_score: 6,
  tds: 1.30,
  extraction_yield: 17.1,
  total_brew_time: 170,
  pours: [
    { pour_number: 1, water_amount: 45, pour_style: "center", wait_time: 30 },
    { pour_number: 2, water_amount: 195, pour_style: "circular", wait_time: null },
  ],
  technique_notes: "Tried coarser grind, lower temp. This is a very long technique note that should be expandable when shown in the comparison table.",
  overall_notes: null,
  improvement_notes: "Grind finer next time",
})
const brew3 = makeBrew({
  id: "b-3",
  brew_date: "2026-01-12",
  days_off_roast: 54,
  overall_score: 7,
  tds: 1.42,
  extraction_yield: 18.5,
})

function renderPage(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/coffees/:id/compare" element={<BrewComparisonPage />} />
        <Route path="/coffees/:id" element={<div data-testid="coffee-detail">Coffee Detail</div>} />
        <Route path="/brews" element={<div data-testid="brews-page">Brews Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe("BrewComparisonPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- Redirect/Validation ---

  it("redirects to coffee detail with toast when fewer than 2 brew IDs", async () => {
    renderPage("/coffees/c-1/compare?brews=b-1")

    await waitFor(() => {
      expect(screen.getByTestId("coffee-detail")).toBeInTheDocument()
    })

    expect(mockedToast.info).toHaveBeenCalledWith("Select at least 2 brews to compare")
  })

  it("redirects when no brews query param is provided", async () => {
    renderPage("/coffees/c-1/compare")

    await waitFor(() => {
      expect(screen.getByTestId("coffee-detail")).toBeInTheDocument()
    })

    expect(mockedToast.info).toHaveBeenCalledWith("Select at least 2 brews to compare")
  })

  it("redirects when more than 4 brew IDs are provided", async () => {
    renderPage("/coffees/c-1/compare?brews=b-1,b-2,b-3,b-4,b-5")

    await waitFor(() => {
      expect(screen.getByTestId("coffee-detail")).toBeInTheDocument()
    })

    expect(mockedToast.info).toHaveBeenCalledWith("Maximum 4 brews can be compared")
  })

  it("redirects with error toast when a brew has wrong coffee_id", async () => {
    const wrongCoffeeBrew = makeBrew({ id: "b-2", coffee_id: "c-999" })
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(wrongCoffeeBrew)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("coffee-detail")).toBeInTheDocument()
    })

    expect(mockedToast.error).toHaveBeenCalledWith("All brews must belong to the same coffee")
  })

  it("redirects with error toast when a brew fetch fails (404)", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockRejectedValueOnce(new Error("Not Found"))

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("coffee-detail")).toBeInTheDocument()
    })

    expect(mockedToast.error).toHaveBeenCalledWith("One or more brews could not be found")
  })

  it("redirects to /brews when from=brews and fetch fails", async () => {
    mockedGetBrew.mockRejectedValue(new Error("Not Found"))

    renderPage("/coffees/c-1/compare?brews=b-1,b-2&from=brews")

    await waitFor(() => {
      expect(screen.getByTestId("brews-page")).toBeInTheDocument()
    })
  })

  // --- Loading ---

  it("shows loading skeleton while fetching", () => {
    mockedGetBrew.mockReturnValue(new Promise(() => {})) // Never resolves

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    expect(screen.getByTestId("comparison-skeleton")).toBeInTheDocument()
  })

  // --- Successful render ---

  it("renders comparison table with coffee name and roaster", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    expect(screen.getByText("Cata Coffee")).toBeInTheDocument()
    expect(screen.getByText("Comparing 2 brews")).toBeInTheDocument()
  })

  it("renders column headers with brew dates", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    // Both brew dates shown (formatted short)
    expect(screen.getByText("Jan 19")).toBeInTheDocument()
    expect(screen.getByText("Jan 15")).toBeInTheDocument()
  })

  it("renders days off roast below column headers", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    expect(screen.getByText("61d off roast")).toBeInTheDocument()
    expect(screen.getByText("57d off roast")).toBeInTheDocument()
  })

  it("renders all four section headers", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    expect(screen.getByText("Setup")).toBeInTheDocument()
    expect(screen.getByText("Brewing")).toBeInTheDocument()
    expect(screen.getByText("Outcomes")).toBeInTheDocument()
    expect(screen.getByText("Notes")).toBeInTheDocument()
  })

  it("shows formatted values in cells", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    // Setup values
    expect(screen.getAllByText("15g").length).toBeGreaterThanOrEqual(1) // coffee weight
    expect(screen.getByText("1:15")).toBeInTheDocument()
    expect(screen.getByText("1:16")).toBeInTheDocument()
    expect(screen.getByText("96°C")).toBeInTheDocument()
    expect(screen.getByText("94°C")).toBeInTheDocument()

    // Brewing
    expect(screen.getByText("3")).toBeInTheDocument() // brew1 pours count
    expect(screen.getByText("2")).toBeInTheDocument() // brew2 pours count

    // Outcomes
    expect(screen.getByText("8/10")).toBeInTheDocument()
    expect(screen.getByText("6/10")).toBeInTheDocument()
  })

  // --- Diff highlighting ---

  it("applies diff background to rows where values differ", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    const diffRows = screen.getByTestId("comparison-table").querySelectorAll("[data-diff='true']")
    expect(diffRows.length).toBeGreaterThan(0)

    // Ratio differs (1:15 vs 1:16) — row should have diff
    // Find the row that contains "Ratio" label
    const ratioRow = Array.from(diffRows).find((row) =>
      row.textContent?.includes("Ratio")
    )
    expect(ratioRow).toBeDefined()
  })

  it("does not apply diff background to rows where values are same", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    // Coffee Weight is the same (15g) — row should NOT have diff
    const allRows = screen.getByTestId("comparison-table").querySelectorAll("tr")
    const coffeeWeightRow = Array.from(allRows).find(
      (row) => row.textContent?.includes("Coffee Weight") && row.textContent?.includes("15g")
    )
    expect(coffeeWeightRow?.getAttribute("data-diff")).toBeNull()
  })

  // --- Best outcome highlighting ---

  it("highlights the best value for outcome fields (TDS, EY, score)", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)
      .mockResolvedValueOnce(brew3)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2,b-3")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    // Brew1: score=8, brew2: score=6, brew3: score=7 → brew1 is best
    const bestCells = screen.getByTestId("comparison-table").querySelectorAll("[data-best='true']")
    expect(bestCells.length).toBeGreaterThan(0)

    // The best score cell should contain "8/10"
    const bestScoreCell = Array.from(bestCells).find((cell) =>
      cell.textContent?.includes("8/10")
    )
    expect(bestScoreCell).toBeDefined()

    // Brew3 has highest TDS (1.42) — check it's highlighted
    const bestTdsCell = Array.from(bestCells).find((cell) =>
      cell.textContent?.includes("1.42%")
    )
    expect(bestTdsCell).toBeDefined()
  })

  it("does not highlight best when all outcome values are the same", async () => {
    const sameBrew1 = makeBrew({ id: "b-1", overall_score: 7 })
    const sameBrew2 = makeBrew({ id: "b-2", overall_score: 7, brew_date: "2026-01-15" })

    mockedGetBrew
      .mockResolvedValueOnce(sameBrew1)
      .mockResolvedValueOnce(sameBrew2)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    // Score is same (7 for both) — no best highlighting on score row
    const allRows = screen.getByTestId("comparison-table").querySelectorAll("tr")
    const scoreRow = Array.from(allRows).find((row) =>
      row.textContent?.includes("Overall Score")
    )
    expect(scoreRow?.querySelectorAll("[data-best='true']").length).toBe(0)
  })

  // --- Null values ---

  it("displays mdash for null values", async () => {
    const brewWithNulls = makeBrew({
      id: "b-2",
      brew_date: "2026-01-15",
      tds: null,
      extraction_yield: null,
      overall_score: null,
      coffee_ml: null,
    })

    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brewWithNulls)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    // There should be mdash characters for null fields
    const mdashes = screen.getByTestId("comparison-table").querySelectorAll(
      "td .text-muted-foreground"
    )
    expect(mdashes.length).toBeGreaterThan(0)
  })

  // --- Expandable cells ---

  it("truncates long text with expand toggle", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    const user = userEvent.setup()
    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    // brew2 has a long technique_notes — should have "(more)" toggle
    const moreButton = screen.getByText("(more)")
    expect(moreButton).toBeInTheDocument()

    // Click to expand
    await user.click(moreButton)

    expect(screen.getByText("(less)")).toBeInTheDocument()
  })

  // --- Back navigation ---

  it("shows 'Back to Coffee' link by default", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    const backLink = screen.getByText("Back to Coffee")
    expect(backLink.closest("a")).toHaveAttribute("href", "/coffees/c-1")
  })

  it("shows 'Back to Brews' link when from=brews", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2&from=brews")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    const backLink = screen.getByText("Back to Brews")
    expect(backLink.closest("a")).toHaveAttribute("href", "/brews")
  })

  // --- 3 brews ---

  it("supports comparing 3 brews", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)
      .mockResolvedValueOnce(brew3)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2,b-3")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    expect(screen.getByText("Comparing 3 brews")).toBeInTheDocument()
    expect(screen.getByText("Jan 19")).toBeInTheDocument()
    expect(screen.getByText("Jan 15")).toBeInTheDocument()
    expect(screen.getByText("Jan 12")).toBeInTheDocument()
  })

  // --- Parallel fetch ---

  it("fetches all brews in parallel", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/coffees/c-1/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    expect(mockedGetBrew).toHaveBeenCalledWith("b-1")
    expect(mockedGetBrew).toHaveBeenCalledWith("b-2")
    expect(mockedGetBrew).toHaveBeenCalledTimes(2)
  })
})
