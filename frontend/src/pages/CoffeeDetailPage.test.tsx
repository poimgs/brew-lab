import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { CoffeeDetailPage } from "./CoffeeDetailPage"

vi.mock("@/api/coffees", () => ({
  getCoffee: vi.fn(),
  deleteCoffee: vi.fn(),
  archiveCoffee: vi.fn(),
  unarchiveCoffee: vi.fn(),
  setReferenceBrew: vi.fn(),
}))

vi.mock("@/api/brews", () => ({
  getReference: vi.fn(),
  listBrewsByCoffee: vi.fn(),
  getBrew: vi.fn(),
  deleteBrew: vi.fn(),
}))

import {
  getCoffee,
  deleteCoffee,
  archiveCoffee,
  unarchiveCoffee,
  setReferenceBrew,
} from "@/api/coffees"

import {
  getReference,
  listBrewsByCoffee,
  getBrew,
  deleteBrew,
} from "@/api/brews"

const mockedGet = vi.mocked(getCoffee)
const mockedDelete = vi.mocked(deleteCoffee)
const mockedArchive = vi.mocked(archiveCoffee)
const mockedUnarchive = vi.mocked(unarchiveCoffee)
const mockedSetRef = vi.mocked(setReferenceBrew)
const mockedGetReference = vi.mocked(getReference)
const mockedListByCoffee = vi.mocked(listBrewsByCoffee)
const mockedGetBrew = vi.mocked(getBrew)
const mockedDeleteBrew = vi.mocked(deleteBrew)

const mockCoffee = {
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
  reference_brew_id: null as string | null,
  archived_at: null as string | null,
  brew_count: 8,
  last_brewed: "2026-01-19T10:30:00Z",
  created_at: "2025-11-22T15:00:00Z",
  updated_at: "2025-11-22T15:00:00Z",
}

const mockBrew = {
  id: "b-1",
  coffee_id: "c-1",
  coffee_name: "Kiamaina",
  coffee_roaster: "Cata Coffee",
  coffee_tasting_notes: "Blackberry, lime, brown sugar",
  coffee_reference_brew_id: null as string | null,
  brew_date: "2026-01-15",
  days_off_roast: 57,
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
  technique_notes: "Gentle swirl after bloom",
  coffee_ml: 180,
  tds: 1.38,
  extraction_yield: 20.1,
  aroma_intensity: 7,
  body_intensity: 7,
  sweetness_intensity: 8,
  brightness_intensity: 7,
  complexity_intensity: 6,
  aftertaste_intensity: 7,
  overall_score: 8,
  overall_notes: "Bright acidity, lemon notes",
  improvement_notes: "Try finer grind to boost sweetness",
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
}

const mockBrew2 = {
  ...mockBrew,
  id: "b-2",
  brew_date: "2026-01-12",
  overall_score: 7,
  grind_size: 4,
  water_temperature: 94,
  improvement_notes: null,
}

const emptyBrewsResponse = {
  items: [],
  pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 },
}

const brewsResponse = {
  items: [mockBrew, mockBrew2],
  pagination: { page: 1, per_page: 20, total: 2, total_pages: 1 },
}

function CaptureNavigate() {
  return <div data-testid="coffees-list">Coffees List</div>
}

function BrewEditCapture() {
  return <div data-testid="brew-edit">Brew Edit</div>
}

function BrewNewCapture() {
  return <div data-testid="brew-new">Brew New</div>
}

function CoffeeEditCapture() {
  return <div data-testid="coffee-edit">Coffee Edit</div>
}

function renderWithRouter(id = "c-1") {
  return render(
    <MemoryRouter initialEntries={[`/coffees/${id}`]}>
      <Routes>
        <Route path="/coffees/:id/edit" element={<CoffeeEditCapture />} />
        <Route path="/coffees/:id" element={<CoffeeDetailPage />} />
        <Route path="/coffees" element={<CaptureNavigate />} />
        <Route path="/brews/:id/edit" element={<BrewEditCapture />} />
        <Route path="/brews/new" element={<BrewNewCapture />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("CoffeeDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mocks: no reference, no brews
    mockedGetReference.mockResolvedValue({ brew: null, source: "latest" })
    mockedListByCoffee.mockResolvedValue(emptyBrewsResponse)
  })

  it("shows loading spinner then renders coffee details", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)

    renderWithRouter()

    // Loading state
    expect(screen.queryByText("Kiamaina")).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(screen.getByText(/Cata Coffee/)).toBeInTheDocument()
    expect(screen.getByText("8")).toBeInTheDocument() // brew count
    expect(screen.getByText("Apricot Nectar, Lemon Sorbet")).toBeInTheDocument()
    expect(screen.getByText("Best around 3-4 weeks")).toBeInTheDocument()
  })

  it("shows error state when fetching fails", async () => {
    mockedGet.mockRejectedValueOnce(new Error("Network error"))

    renderWithRouter()

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load coffee. Please try again.")
      ).toBeInTheDocument()
    })

    expect(screen.getByText("Try Again")).toBeInTheDocument()
  })

  it("retries loading when Try Again is clicked", async () => {
    mockedGet
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockCoffee)

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load coffee. Please try again.")
      ).toBeInTheDocument()
    })

    await user.click(screen.getByText("Try Again"))

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(mockedGet).toHaveBeenCalledTimes(2)
  })

  it("shows back to coffees link", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(screen.getByText("Back to Coffees")).toBeInTheDocument()
  })

  it("shows action buttons", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(screen.getByText("New Brew")).toBeInTheDocument()
    expect(screen.getByText("Edit")).toBeInTheDocument()
    expect(screen.getByText("Archive")).toBeInTheDocument()
    expect(screen.getByText("Delete")).toBeInTheDocument()
  })

  it("navigates to edit page when clicking Edit", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)
    const user = userEvent.setup()

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Edit"))

    await waitFor(() => {
      expect(screen.getByTestId("coffee-edit")).toBeInTheDocument()
    })
  })

  it("archives a coffee", async () => {
    const archivedCoffee = {
      ...mockCoffee,
      archived_at: "2026-02-01T10:00:00Z",
    }
    mockedGet.mockResolvedValueOnce(mockCoffee)
    mockedArchive.mockResolvedValueOnce(archivedCoffee)

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Archive"))

    await waitFor(() => {
      expect(mockedArchive).toHaveBeenCalledWith("c-1")
    })

    // Should now show Unarchive and Archived badge
    await waitFor(() => {
      expect(screen.getByText("Unarchive")).toBeInTheDocument()
    })
  })

  it("unarchives an archived coffee", async () => {
    const archivedCoffee = {
      ...mockCoffee,
      archived_at: "2026-02-01T10:00:00Z",
    }
    const unarchivedCoffee = { ...mockCoffee, archived_at: null }
    mockedGet.mockResolvedValueOnce(archivedCoffee)
    mockedUnarchive.mockResolvedValueOnce(unarchivedCoffee)

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Unarchive")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Unarchive"))

    await waitFor(() => {
      expect(mockedUnarchive).toHaveBeenCalledWith("c-1")
    })

    await waitFor(() => {
      expect(screen.getByText("Archive")).toBeInTheDocument()
    })
  })

  it("shows delete confirmation dialog", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)
    const user = userEvent.setup()

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Delete coffee"))

    const dialog = screen.getByRole("dialog", { name: "Delete coffee" })
    expect(dialog).toBeInTheDocument()
    expect(
      within(dialog).getByText(/permanently delete the coffee/)
    ).toBeInTheDocument()
  })

  it("deletes coffee and navigates to list", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)
    mockedDelete.mockResolvedValueOnce(undefined)

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Delete coffee"))

    const dialog = screen.getByRole("dialog", { name: "Delete coffee" })
    await user.click(within(dialog).getByText("Delete"))

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith("c-1")
    })

    // Should navigate to coffees list
    await waitFor(() => {
      expect(screen.getByTestId("coffees-list")).toBeInTheDocument()
    })
  })

  it("closes delete dialog when clicking Cancel", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)
    const user = userEvent.setup()

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Delete coffee"))
    expect(screen.getByRole("dialog", { name: "Delete coffee" })).toBeInTheDocument()

    await user.click(screen.getByText("Cancel"))

    expect(screen.queryByRole("dialog", { name: "Delete coffee" })).not.toBeInTheDocument()
  })

  it("displays archived badge for archived coffee", async () => {
    const archivedCoffee = {
      ...mockCoffee,
      archived_at: "2026-02-01T10:00:00Z",
    }
    mockedGet.mockResolvedValueOnce(archivedCoffee)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(screen.getByText("Archived")).toBeInTheDocument()
    expect(screen.getByText("Unarchive")).toBeInTheDocument()
  })

  it("action buttons are accessible via aria-labels when text is hidden on mobile", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    // All 4 action buttons must be accessible by aria-label (used on mobile when text labels are hidden)
    expect(screen.getByLabelText("New brew")).toBeInTheDocument()
    expect(screen.getByLabelText("Edit coffee")).toBeInTheDocument()
    expect(screen.getByLabelText("Archive coffee")).toBeInTheDocument()
    expect(screen.getByLabelText("Delete coffee")).toBeInTheDocument()

    // Each button still contains an icon (svg element)
    expect(screen.getByLabelText("New brew").querySelector("svg")).toBeTruthy()
    expect(screen.getByLabelText("Edit coffee").querySelector("svg")).toBeTruthy()
    expect(screen.getByLabelText("Archive coffee").querySelector("svg")).toBeTruthy()
    expect(screen.getByLabelText("Delete coffee").querySelector("svg")).toBeTruthy()
  })

  it("action buttons container allows wrapping to prevent overflow", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    // The button container should have flex-wrap class to prevent overflow on narrow viewports
    const newBrewBtn = screen.getByLabelText("New brew")
    const buttonContainer = newBrewBtn.parentElement!
    expect(buttonContainer.className).toContain("flex-wrap")
  })

  // --- Reference Brew Section Tests ---

  it("shows reference brew empty state when no brews exist", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)
    mockedGetReference.mockResolvedValueOnce({ brew: null, source: "latest" })

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(screen.getByText("Reference Brew")).toBeInTheDocument()
    expect(
      screen.getByText("No brews yet. Log your first brew to see reference data here.")
    ).toBeInTheDocument()
  })

  it("shows reference brew data with starred source label", async () => {
    const coffeeWithRef = { ...mockCoffee, reference_brew_id: "b-1" }
    mockedGet.mockResolvedValueOnce(coffeeWithRef)
    mockedGetReference.mockResolvedValueOnce({ brew: mockBrew, source: "starred" as const })

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Reference (starred)")).toBeInTheDocument()
    })

    expect(screen.getByText("3.5")).toBeInTheDocument() // grind
    expect(screen.getByText("1:15")).toBeInTheDocument() // ratio
    expect(screen.getByText("96°C")).toBeInTheDocument() // temp
    expect(screen.getByText("1.38")).toBeInTheDocument() // TDS
    expect(screen.getByText("20.1%")).toBeInTheDocument() // extraction
    expect(screen.getByText("8/10")).toBeInTheDocument() // overall
  })

  it("shows reference brew data with latest source label", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee) // no reference_brew_id
    mockedGetReference.mockResolvedValueOnce({ brew: mockBrew, source: "latest" as const })

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Reference (latest)")).toBeInTheDocument()
    })
  })

  it("shows improvement notes on reference brew", async () => {
    const coffeeWithRef = { ...mockCoffee, reference_brew_id: "b-1" }
    mockedGet.mockResolvedValueOnce(coffeeWithRef)
    mockedGetReference.mockResolvedValueOnce({ brew: mockBrew, source: "starred" as const })

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/Try finer grind to boost sweetness/)).toBeInTheDocument()
    })
  })

  // --- Brew History Table Tests ---

  it("shows brew history empty state when no brews exist", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)
    mockedListByCoffee.mockResolvedValueOnce(emptyBrewsResponse)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText("No brews recorded for this coffee yet.")).toBeInTheDocument()
    })
  })

  it("renders brew history table with brews", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)
    mockedListByCoffee.mockResolvedValueOnce(brewsResponse)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Brew History")).toBeInTheDocument()
    })

    // Table headers
    await waitFor(() => {
      expect(screen.getByText("Date")).toBeInTheDocument()
    })
    expect(screen.getByText("Score")).toBeInTheDocument()
    expect(screen.getByText("Ratio")).toBeInTheDocument()
    expect(screen.getByText("Temp")).toBeInTheDocument()
    expect(screen.getByText("Filter")).toBeInTheDocument()

    // Brew data
    await waitFor(() => {
      expect(screen.getByText("8/10")).toBeInTheDocument()
    })
    expect(screen.getByText("7/10")).toBeInTheDocument()
  })

  it("shows starred indicator on reference brew in history table", async () => {
    const coffeeWithRef = { ...mockCoffee, reference_brew_id: "b-1" }
    mockedGet.mockResolvedValueOnce(coffeeWithRef)
    mockedGetReference.mockResolvedValueOnce({ brew: mockBrew, source: "starred" as const })
    mockedListByCoffee.mockResolvedValueOnce(brewsResponse)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Brew History")).toBeInTheDocument()
    })

    // Should have star buttons (one per brew row)
    await waitFor(() => {
      const starButtons = screen.getAllByLabelText(/reference/)
      expect(starButtons.length).toBeGreaterThanOrEqual(2)
    })
  })

  it("opens brew detail modal when clicking a history row", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)
    mockedListByCoffee.mockResolvedValueOnce(brewsResponse)
    mockedGetBrew.mockResolvedValueOnce(mockBrew)

    const user = userEvent.setup()
    renderWithRouter()

    // Wait for brew history to load
    await waitFor(() => {
      expect(screen.getByText("8/10")).toBeInTheDocument()
    })

    // Click the row with score 8/10
    await user.click(screen.getByText("8/10"))

    // Brew detail modal should open
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Brew detail" })).toBeInTheDocument()
    })

    // Should show brew details
    await waitFor(() => {
      expect(screen.getByText(/Kiamaina — Cata Coffee/)).toBeInTheDocument()
    })
  })

  it("shows brew detail modal with Setup, Brewing, Tasting sections", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)
    mockedListByCoffee.mockResolvedValueOnce(brewsResponse)
    mockedGetBrew.mockResolvedValueOnce(mockBrew)

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("8/10")).toBeInTheDocument()
    })

    await user.click(screen.getByText("8/10"))

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Brew detail" })).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText("Setup")).toBeInTheDocument()
    })
    expect(screen.getByText("Brewing")).toBeInTheDocument()
    expect(screen.getByText("Tasting")).toBeInTheDocument()

    // Setup data
    expect(screen.getByText("15g")).toBeInTheDocument() // coffee weight
    expect(screen.getByText("225g")).toBeInTheDocument() // water weight
    expect(screen.getByText("Abaca (Cafec)")).toBeInTheDocument() // filter

    // Brewing data
    expect(screen.getByText("2:45")).toBeInTheDocument() // total brew time
    expect(screen.getByText("Gentle swirl after bloom")).toBeInTheDocument()

    // Tasting data
    expect(screen.getByText("180ml")).toBeInTheDocument() // coffee ml
    expect(screen.getByText("Bright acidity, lemon notes")).toBeInTheDocument()
  })

  it("brew detail modal has Edit, Brew Again, Star, Delete actions", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)
    mockedListByCoffee.mockResolvedValueOnce(brewsResponse)
    mockedGetBrew.mockResolvedValueOnce(mockBrew)

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("8/10")).toBeInTheDocument()
    })

    await user.click(screen.getByText("8/10"))

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Brew detail" })).toBeInTheDocument()
    })

    await waitFor(() => {
      const dialog = screen.getByRole("dialog", { name: "Brew detail" })
      expect(within(dialog).getByText("Edit")).toBeInTheDocument()
      expect(within(dialog).getByText("Brew Again")).toBeInTheDocument()
      expect(within(dialog).getByText("Star as Reference")).toBeInTheDocument()
      expect(within(dialog).getByText("Delete")).toBeInTheDocument()
    })
  })

  it("navigates to edit page from brew detail modal", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)
    mockedListByCoffee.mockResolvedValueOnce(brewsResponse)
    mockedGetBrew.mockResolvedValueOnce(mockBrew)

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("8/10")).toBeInTheDocument()
    })

    await user.click(screen.getByText("8/10"))

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Brew detail" })).toBeInTheDocument()
    })

    await waitFor(() => {
      const dialog = screen.getByRole("dialog", { name: "Brew detail" })
      expect(within(dialog).getByText("Edit")).toBeInTheDocument()
    })

    const dialog = screen.getByRole("dialog", { name: "Brew detail" })
    await user.click(within(dialog).getByText("Edit"))

    await waitFor(() => {
      expect(screen.getByTestId("brew-edit")).toBeInTheDocument()
    })
  })

  it("navigates to brew again from brew detail modal", async () => {
    mockedGet.mockResolvedValueOnce(mockCoffee)
    mockedListByCoffee.mockResolvedValueOnce(brewsResponse)
    mockedGetBrew.mockResolvedValueOnce(mockBrew)

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("8/10")).toBeInTheDocument()
    })

    await user.click(screen.getByText("8/10"))

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Brew detail" })).toBeInTheDocument()
    })

    await waitFor(() => {
      const dialog = screen.getByRole("dialog", { name: "Brew detail" })
      expect(within(dialog).getByText("Brew Again")).toBeInTheDocument()
    })

    const dialog = screen.getByRole("dialog", { name: "Brew detail" })
    await user.click(within(dialog).getByText("Brew Again"))

    await waitFor(() => {
      expect(screen.getByTestId("brew-new")).toBeInTheDocument()
    })
  })

  it("stars a brew as reference from the detail modal", async () => {
    const updatedCoffee = { ...mockCoffee, reference_brew_id: "b-1" }
    mockedGet.mockResolvedValueOnce(mockCoffee)
    mockedListByCoffee.mockResolvedValue(brewsResponse)
    mockedGetBrew.mockResolvedValueOnce(mockBrew2)
    mockedSetRef.mockResolvedValueOnce(updatedCoffee)
    mockedGetReference.mockResolvedValue({ brew: mockBrew, source: "starred" as const })

    const user = userEvent.setup()
    renderWithRouter()

    // Wait for history table to render, click the 7/10 row (unique score)
    await waitFor(() => {
      expect(screen.getByText("7/10")).toBeInTheDocument()
    })

    await user.click(screen.getByText("7/10"))

    await waitFor(() => {
      const dialog = screen.getByRole("dialog", { name: "Brew detail" })
      expect(within(dialog).getByText("Star as Reference")).toBeInTheDocument()
    })

    const dialog = screen.getByRole("dialog", { name: "Brew detail" })
    await user.click(within(dialog).getByText("Star as Reference"))

    await waitFor(() => {
      expect(mockedSetRef).toHaveBeenCalledWith("c-1", "b-2")
    })
  })

  it("deletes a brew from the detail modal", async () => {
    mockedGet.mockResolvedValue(mockCoffee)
    mockedListByCoffee.mockResolvedValue(brewsResponse)
    mockedGetBrew.mockResolvedValueOnce(mockBrew)
    mockedDeleteBrew.mockResolvedValueOnce(undefined)
    mockedGetReference.mockResolvedValue({ brew: null, source: "latest" as const })

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("8/10")).toBeInTheDocument()
    })

    await user.click(screen.getByText("8/10"))

    await waitFor(() => {
      const modal = screen.getByRole("dialog", { name: "Brew detail" })
      expect(within(modal).getByText("Delete")).toBeInTheDocument()
    })

    // Click Delete on the brew detail modal
    const modal = screen.getByRole("dialog", { name: "Brew detail" })
    await user.click(within(modal).getByText("Delete"))

    // Delete confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Delete brew" })).toBeInTheDocument()
    })

    const deleteDialog = screen.getByRole("dialog", { name: "Delete brew" })
    expect(
      within(deleteDialog).getByText(/This action cannot be undone/)
    ).toBeInTheDocument()

    // Confirm deletion
    await user.click(within(deleteDialog).getByText("Delete"))

    await waitFor(() => {
      expect(mockedDeleteBrew).toHaveBeenCalledWith("b-1")
    })
  })

  it("shows reference warning when deleting a starred reference brew", async () => {
    const coffeeWithRef = { ...mockCoffee, reference_brew_id: "b-1" }
    mockedGet.mockResolvedValue(coffeeWithRef)
    mockedListByCoffee.mockResolvedValue(brewsResponse)
    mockedGetBrew.mockResolvedValueOnce(mockBrew)
    mockedGetReference.mockResolvedValue({ brew: mockBrew, source: "starred" as const })

    const user = userEvent.setup()
    renderWithRouter()

    // Use 7/10 row to avoid duplicate "8/10" text (ref section also shows 8/10)
    await waitFor(() => {
      expect(screen.getByText("7/10")).toBeInTheDocument()
    })

    // Click the starred brew's row — use getAllByText and pick the table one
    const scoreElements = screen.getAllByText("8/10")
    // The second one is in the table (first is in reference section)
    await user.click(scoreElements[1])

    await waitFor(() => {
      const modal = screen.getByRole("dialog", { name: "Brew detail" })
      expect(within(modal).getByText("Delete")).toBeInTheDocument()
    })

    const modal = screen.getByRole("dialog", { name: "Brew detail" })
    await user.click(within(modal).getByText("Delete"))

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Delete brew" })).toBeInTheDocument()
    })

    // Should show special warning for starred reference
    const deleteDialog = screen.getByRole("dialog", { name: "Delete brew" })
    expect(
      within(deleteDialog).getByText(/starred reference brew/)
    ).toBeInTheDocument()
  })

  it("opens change reference dialog and shows brew list", async () => {
    const coffeeWithRef = { ...mockCoffee, reference_brew_id: "b-1" }
    mockedGet.mockResolvedValueOnce(coffeeWithRef)
    mockedGetReference.mockResolvedValueOnce({ brew: mockBrew, source: "starred" as const })
    mockedListByCoffee
      .mockResolvedValueOnce(brewsResponse) // initial history table fetch
      .mockResolvedValueOnce(brewsResponse) // change ref dialog fetch

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Reference (starred)")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Change"))

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Change reference brew" })).toBeInTheDocument()
    })

    // Should show "No starred reference" option and brew entries
    const dialog = screen.getByRole("dialog", { name: "Change reference brew" })
    await waitFor(() => {
      expect(within(dialog).getByText(/No starred reference/)).toBeInTheDocument()
    })
  })

  it("selects a new reference brew from change dialog", async () => {
    const coffeeWithRef = { ...mockCoffee, reference_brew_id: "b-1" }
    const updatedCoffee = { ...mockCoffee, reference_brew_id: "b-2" }
    mockedGet.mockResolvedValueOnce(coffeeWithRef)
    mockedGetReference
      .mockResolvedValueOnce({ brew: mockBrew, source: "starred" as const })
      .mockResolvedValueOnce({ brew: mockBrew2, source: "starred" as const })
    mockedListByCoffee
      .mockResolvedValueOnce(brewsResponse) // history table
      .mockResolvedValueOnce(brewsResponse) // change ref dialog
      .mockResolvedValue(brewsResponse) // refresh after change
    mockedSetRef.mockResolvedValueOnce(updatedCoffee)

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Reference (starred)")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Change"))

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Change reference brew" })).toBeInTheDocument()
    })

    // Wait for brews to load in dialog, then click the Jan 12 brew entry
    const dialog = screen.getByRole("dialog", { name: "Change reference brew" })
    await waitFor(() => {
      expect(within(dialog).getByText("7/10")).toBeInTheDocument()
    })
    await user.click(within(dialog).getByText("7/10"))

    await waitFor(() => {
      expect(mockedSetRef).toHaveBeenCalledWith("c-1", "b-2")
    })
  })

  it("clears reference brew from change dialog", async () => {
    const coffeeWithRef = { ...mockCoffee, reference_brew_id: "b-1" }
    const updatedCoffee = { ...mockCoffee, reference_brew_id: null }
    mockedGet.mockResolvedValueOnce(coffeeWithRef)
    mockedGetReference
      .mockResolvedValueOnce({ brew: mockBrew, source: "starred" as const })
      .mockResolvedValueOnce({ brew: mockBrew, source: "latest" as const })
    mockedListByCoffee
      .mockResolvedValueOnce(brewsResponse)
      .mockResolvedValueOnce(brewsResponse)
      .mockResolvedValue(brewsResponse)
    mockedSetRef.mockResolvedValueOnce(updatedCoffee)

    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Reference (starred)")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Change"))

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Change reference brew" })).toBeInTheDocument()
    })

    const dialog = screen.getByRole("dialog", { name: "Change reference brew" })
    await waitFor(() => {
      expect(within(dialog).getByText(/No starred reference/)).toBeInTheDocument()
    })
    await user.click(within(dialog).getByText(/No starred reference/))

    await waitFor(() => {
      expect(mockedSetRef).toHaveBeenCalledWith("c-1", null)
    })
  })
})
