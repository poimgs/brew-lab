import { render, screen, waitFor, fireEvent } from "@testing-library/react"
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
        <Route path="/brews/compare" element={<BrewComparisonPage />} />
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

  it("redirects to /brews with toast when fewer than 2 brew IDs", async () => {
    renderPage("/brews/compare?brews=b-1")

    await waitFor(() => {
      expect(screen.getByTestId("brews-page")).toBeInTheDocument()
    })

    expect(mockedToast.info).toHaveBeenCalledWith("Select at least 2 brews to compare")
  })

  it("redirects when no brews query param is provided", async () => {
    renderPage("/brews/compare")

    await waitFor(() => {
      expect(screen.getByTestId("brews-page")).toBeInTheDocument()
    })

    expect(mockedToast.info).toHaveBeenCalledWith("Select at least 2 brews to compare")
  })

  it("redirects when more than 4 brew IDs are provided", async () => {
    renderPage("/brews/compare?brews=b-1,b-2,b-3,b-4,b-5")

    await waitFor(() => {
      expect(screen.getByTestId("brews-page")).toBeInTheDocument()
    })

    expect(mockedToast.info).toHaveBeenCalledWith("Maximum 4 brews can be compared")
  })

  it("redirects with error toast when a brew fetch fails (404)", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockRejectedValueOnce(new Error("Not Found"))

    renderPage("/brews/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("brews-page")).toBeInTheDocument()
    })

    expect(mockedToast.error).toHaveBeenCalledWith("One or more brews could not be found")
  })

  it("redirects to /brews when from=brews and fetch fails", async () => {
    mockedGetBrew.mockRejectedValue(new Error("Not Found"))

    renderPage("/brews/compare?brews=b-1,b-2&from=brews")

    await waitFor(() => {
      expect(screen.getByTestId("brews-page")).toBeInTheDocument()
    })
  })

  // --- Loading ---

  it("shows loading skeleton while fetching", () => {
    mockedGetBrew.mockReturnValue(new Promise(() => {})) // Never resolves

    renderPage("/brews/compare?brews=b-1,b-2")

    expect(screen.getByTestId("comparison-skeleton")).toBeInTheDocument()
  })

  // --- Successful render ---

  it("renders comparison table with coffee name and roaster", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/brews/compare?brews=b-1,b-2")

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

    renderPage("/brews/compare?brews=b-1,b-2")

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

    renderPage("/brews/compare?brews=b-1,b-2")

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

    renderPage("/brews/compare?brews=b-1,b-2")

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

    renderPage("/brews/compare?brews=b-1,b-2")

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

    renderPage("/brews/compare?brews=b-1,b-2")

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

    renderPage("/brews/compare?brews=b-1,b-2")

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

    renderPage("/brews/compare?brews=b-1,b-2,b-3")

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

    renderPage("/brews/compare?brews=b-1,b-2")

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

    renderPage("/brews/compare?brews=b-1,b-2")

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
    renderPage("/brews/compare?brews=b-1,b-2")

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

  it("shows 'Back to Brews' link by default", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/brews/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    const backLink = screen.getByText("Back to Brews")
    expect(backLink.closest("a")).toHaveAttribute("href", "/brews")
  })

  it("shows 'Back to {Coffee Name}' link when from=coffee with coffee_id", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/brews/compare?brews=b-1,b-2&from=coffee&coffee_id=c-1")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    const backLink = screen.getByText("Back to Kiamaina")
    expect(backLink.closest("a")).toHaveAttribute("href", "/coffees/c-1")
  })

  it("shows 'Back to Brews' link when from=brews", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/brews/compare?brews=b-1,b-2&from=brews")

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

    renderPage("/brews/compare?brews=b-1,b-2,b-3")

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

    renderPage("/brews/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    expect(mockedGetBrew).toHaveBeenCalledWith("b-1")
    expect(mockedGetBrew).toHaveBeenCalledWith("b-2")
    expect(mockedGetBrew).toHaveBeenCalledTimes(2)
  })

  // --- Cross-coffee comparison ---

  it("shows 'Brew Comparison' title for cross-coffee comparison", async () => {
    const crossCoffeeBrew = makeBrew({
      id: "b-2",
      coffee_id: "c-2",
      coffee_name: "El Diamante",
      coffee_roaster: "April",
      brew_date: "2026-01-15",
    })

    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(crossCoffeeBrew)

    renderPage("/brews/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    expect(screen.getByText("Brew Comparison")).toBeInTheDocument()
    // Should NOT show coffee name as title
    expect(screen.queryByRole("heading", { name: /Kiamaina/ })).not.toBeInTheDocument()
  })

  it("shows coffee name in column headers for cross-coffee comparison", async () => {
    const crossCoffeeBrew = makeBrew({
      id: "b-2",
      coffee_id: "c-2",
      coffee_name: "El Diamante",
      coffee_roaster: "April",
      brew_date: "2026-01-15",
    })

    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(crossCoffeeBrew)

    renderPage("/brews/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    // Column headers should show coffee names
    const headers = screen.getByTestId("comparison-table").querySelectorAll("th")
    const headerTexts = Array.from(headers).map((h) => h.textContent)
    expect(headerTexts.some((t) => t?.includes("Kiamaina"))).toBe(true)
    expect(headerTexts.some((t) => t?.includes("El Diamante"))).toBe(true)
  })

  it("does not show coffee name in column headers for same-coffee comparison", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/brews/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    // Column headers should NOT show coffee name (all same coffee)
    const headers = screen.getByTestId("comparison-table").querySelectorAll("th")
    // The first <th> is the field name column (empty), the rest are brew columns
    const brewHeaders = Array.from(headers).slice(1)
    // None of the brew column headers should contain "Kiamaina" as a separate coffee indicator
    brewHeaders.forEach((h) => {
      const textDivs = h.querySelectorAll("div.text-muted-foreground")
      // The only text-muted-foreground divs should be days-off-roast, not coffee name
      textDivs.forEach((div) => {
        expect(div.textContent).toMatch(/d off roast/)
      })
    })
  })

  it("redirects to coffee detail on fetch error when from=coffee", async () => {
    mockedGetBrew.mockRejectedValue(new Error("Not Found"))

    renderPage("/brews/compare?brews=b-1,b-2&from=coffee&coffee_id=c-1")

    await waitFor(() => {
      expect(screen.getByTestId("coffee-detail")).toBeInTheDocument()
    })

    expect(mockedToast.error).toHaveBeenCalledWith("One or more brews could not be found")
  })

  // --- Drag-to-reorder ---

  it("reorders columns when dragging one brew header onto another", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)
      .mockResolvedValueOnce(brew3)

    renderPage("/brews/compare?brews=b-1,b-2,b-3")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    // Initial order: Jan 19, Jan 15, Jan 12 (columns 0, 1, 2)
    const col0 = screen.getByTestId("brew-column-0")
    const col2 = screen.getByTestId("brew-column-2")

    expect(col0).toHaveTextContent("Jan 19")
    expect(col2).toHaveTextContent("Jan 12")

    // Drag column 0 (Jan 19) onto column 2 (Jan 12)
    fireEvent.dragStart(col0, { dataTransfer: { effectAllowed: "move" } })
    fireEvent.dragOver(col2, { dataTransfer: {} })
    fireEvent.drop(col2, { dataTransfer: {} })
    fireEvent.dragEnd(col0)

    // After reorder: Jan 15, Jan 12, Jan 19 (brew1 moved from index 0 to index 2)
    const newCol0 = screen.getByTestId("brew-column-0")
    const newCol2 = screen.getByTestId("brew-column-2")

    expect(newCol0).toHaveTextContent("Jan 15")
    expect(newCol2).toHaveTextContent("Jan 19")
  })

  it("does not reorder when dropping on the same column", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/brews/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    const col0 = screen.getByTestId("brew-column-0")

    // Drag and drop on itself
    fireEvent.dragStart(col0, { dataTransfer: { effectAllowed: "move" } })
    fireEvent.dragOver(col0, { dataTransfer: {} })
    fireEvent.drop(col0, { dataTransfer: {} })
    fireEvent.dragEnd(col0)

    // Order unchanged
    expect(screen.getByTestId("brew-column-0")).toHaveTextContent("Jan 19")
    expect(screen.getByTestId("brew-column-1")).toHaveTextContent("Jan 15")
  })

  it("column headers have draggable attribute and cursor-grab class", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/brews/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    const col0 = screen.getByTestId("brew-column-0")
    expect(col0).toHaveAttribute("draggable", "true")
    expect(col0.className).toContain("cursor-grab")
  })

  it("applies opacity to the dragged column header", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/brews/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    const col0 = screen.getByTestId("brew-column-0")

    fireEvent.dragStart(col0, { dataTransfer: { effectAllowed: "move" } })

    // The dragged column should have opacity-50
    expect(screen.getByTestId("brew-column-0").className).toContain("opacity-50")

    fireEvent.dragEnd(col0)

    // Opacity removed after drag end
    expect(screen.getByTestId("brew-column-0").className).not.toContain("opacity-50")
  })

  it("shows drop indicator on the target column during drag over", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/brews/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    const col0 = screen.getByTestId("brew-column-0")
    const col1 = screen.getByTestId("brew-column-1")

    fireEvent.dragStart(col0, { dataTransfer: { effectAllowed: "move" } })
    fireEvent.dragOver(col1, { dataTransfer: {} })

    // Target column should have border indicator
    expect(screen.getByTestId("brew-column-1").className).toContain("border-l-2")
    expect(screen.getByTestId("brew-column-1").className).toContain("border-primary")

    // Dragged column should NOT have border indicator
    expect(screen.getByTestId("brew-column-0").className).not.toContain("border-l-2")

    fireEvent.dragEnd(col0)
  })

  it("preserves diff highlighting after reordering columns", async () => {
    mockedGetBrew
      .mockResolvedValueOnce(brew1)
      .mockResolvedValueOnce(brew2)

    renderPage("/brews/compare?brews=b-1,b-2")

    await waitFor(() => {
      expect(screen.getByTestId("comparison-table")).toBeInTheDocument()
    })

    // Reorder columns
    const col0 = screen.getByTestId("brew-column-0")
    const col1 = screen.getByTestId("brew-column-1")
    fireEvent.dragStart(col0, { dataTransfer: { effectAllowed: "move" } })
    fireEvent.dragOver(col1, { dataTransfer: {} })
    fireEvent.drop(col1, { dataTransfer: {} })
    fireEvent.dragEnd(col0)

    // Diff highlighting should still exist (e.g. ratio row still differs)
    const diffRows = screen.getByTestId("comparison-table").querySelectorAll("[data-diff='true']")
    expect(diffRows.length).toBeGreaterThan(0)
  })
})
