import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { BrewFormPage } from "./BrewFormPage"

vi.mock("@/api/coffees", () => ({
  listCoffees: vi.fn(),
  setReferenceBrew: vi.fn(),
}))

vi.mock("@/api/filterPapers", () => ({
  listFilterPapers: vi.fn(),
}))

vi.mock("@/api/brews", () => ({
  createBrew: vi.fn(),
  updateBrew: vi.fn(),
  getBrew: vi.fn(),
  getReference: vi.fn(),
}))

vi.mock("@/api/defaults", () => ({
  getDefaults: vi.fn(),
}))

import { listCoffees, setReferenceBrew } from "@/api/coffees"
import { listFilterPapers } from "@/api/filterPapers"
import { createBrew, updateBrew, getBrew, getReference } from "@/api/brews"
import { getDefaults } from "@/api/defaults"

const mockedListCoffees = vi.mocked(listCoffees)
const mockedListFilterPapers = vi.mocked(listFilterPapers)
const mockedCreateBrew = vi.mocked(createBrew)
const mockedUpdateBrew = vi.mocked(updateBrew)
const mockedGetBrew = vi.mocked(getBrew)
const mockedGetReference = vi.mocked(getReference)
const mockedGetDefaults = vi.mocked(getDefaults)
const mockedSetReferenceBrew = vi.mocked(setReferenceBrew)

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
    tasting_notes: "Apricot Nectar",
    roast_date: "2025-11-19",
    notes: null,
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
    brew_count: 0,
    last_brewed: null,
    created_at: "2025-12-01T10:00:00Z",
    updated_at: "2025-12-01T10:00:00Z",
  },
  {
    id: "c-3",
    roaster: "Archived Roaster",
    name: "Old Bean",
    country: null,
    region: null,
    farm: null,
    varietal: null,
    elevation: null,
    process: null,
    roast_level: null,
    tasting_notes: null,
    roast_date: null,
    notes: null,
    reference_brew_id: null,
    archived_at: "2025-12-15T00:00:00Z",
    brew_count: 0,
    last_brewed: null,
    created_at: "2025-12-01T10:00:00Z",
    updated_at: "2025-12-01T10:00:00Z",
  },
]

const mockFilterPapers = [
  {
    id: "fp-1",
    name: "Abaca",
    brand: "Cafec",
    notes: null,
    created_at: "2025-11-22T15:00:00Z",
    updated_at: "2025-11-22T15:00:00Z",
  },
]

const mockExistingBrew = {
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
  pours: [
    { pour_number: 1, water_amount: 45, pour_style: "center", wait_time: 30 },
    { pour_number: 2, water_amount: 90, pour_style: "circular", wait_time: null },
  ],
  total_brew_time: 165,
  technique_notes: "Gentle swirl",
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
  improvement_notes: "Try finer grind",
  created_at: "2026-01-15T10:30:00Z",
  updated_at: "2026-01-15T11:00:00Z",
}

function mockPaginatedResponse<T>(items: T[]) {
  return {
    items,
    pagination: {
      page: 1,
      per_page: 100,
      total: items.length,
      total_pages: 1,
    },
  }
}

function setupMocks() {
  mockedListCoffees.mockResolvedValue(mockPaginatedResponse(mockCoffees))
  mockedListFilterPapers.mockResolvedValue(
    mockPaginatedResponse(mockFilterPapers)
  )
  mockedGetDefaults.mockRejectedValue(new Error("No defaults"))
  mockedGetReference.mockResolvedValue({ brew: null, source: "latest" })
}

function renderNewBrew(initialEntry = "/brews/new") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/brews/new" element={<BrewFormPage />} />
        <Route path="/brews/:id/edit" element={<BrewFormPage />} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/coffees/:id" element={<div>Coffee Detail</div>} />
      </Routes>
    </MemoryRouter>
  )
}

function renderEditBrew() {
  return render(
    <MemoryRouter initialEntries={["/brews/b-1/edit"]}>
      <Routes>
        <Route path="/brews/:id/edit" element={<BrewFormPage />} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe("BrewFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows skeleton while data loads", () => {
    mockedListCoffees.mockReturnValue(new Promise(() => {}))
    mockedListFilterPapers.mockReturnValue(new Promise(() => {}))
    mockedGetDefaults.mockReturnValue(new Promise(() => {}))
    renderNewBrew()
    expect(screen.getByTestId("brew-form-skeleton")).toBeInTheDocument()
  })

  it("renders new brew form with title and fields after loading", async () => {
    setupMocks()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    expect(screen.getByText("Coffee")).toBeInTheDocument()
    expect(screen.getByLabelText("Brew Date")).toBeInTheDocument()
    // Desktop header + mobile footer both render buttons
    expect(screen.getAllByText("Save Brew")).toHaveLength(2)
    expect(screen.getAllByText("Cancel")).toHaveLength(2)
  })

  it("renders 3 collapsible sections, all collapsed by default", async () => {
    setupMocks()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    // Section headers visible
    expect(screen.getByText("Setup")).toBeInTheDocument()
    expect(screen.getByText("Brewing")).toBeInTheDocument()
    expect(screen.getByText("Tasting")).toBeInTheDocument()

    // Fields inside sections should NOT be visible since sections are collapsed
    expect(screen.queryByLabelText("Coffee Weight (g)")).not.toBeInTheDocument()
    expect(screen.queryByText("Pours")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("TDS (%)")).not.toBeInTheDocument()
  })

  it("expands Setup section when clicked", async () => {
    setupMocks()
    const user = userEvent.setup()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Setup"))

    expect(screen.getByLabelText("Coffee Weight (g)")).toBeInTheDocument()
    expect(screen.getByLabelText("Ratio")).toBeInTheDocument()
    expect(screen.getByLabelText("Grind Size")).toBeInTheDocument()
    expect(screen.getByLabelText("Temperature (C)")).toBeInTheDocument()
    expect(screen.getByLabelText("Filter Paper")).toBeInTheDocument()
  })

  it("expands Brewing section with pour controls", async () => {
    setupMocks()
    const user = userEvent.setup()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Brewing"))

    expect(screen.getByText("Pours")).toBeInTheDocument()
    expect(screen.getByText("Add Pour")).toBeInTheDocument()
    expect(screen.getByLabelText("Total Brew Time (mm:ss)")).toBeInTheDocument()
    expect(screen.getByLabelText("Technique Notes")).toBeInTheDocument()
  })

  it("expands Tasting section with sensory fields", async () => {
    setupMocks()
    const user = userEvent.setup()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Tasting"))

    expect(screen.getByLabelText("Coffee (ml)")).toBeInTheDocument()
    expect(screen.getByLabelText("TDS (%)")).toBeInTheDocument()
    expect(screen.getByText(/Extraction Yield/)).toBeInTheDocument()
    expect(screen.getByLabelText("Aroma")).toBeInTheDocument()
    expect(screen.getByLabelText("Body")).toBeInTheDocument()
    expect(screen.getByLabelText("Sweetness")).toBeInTheDocument()
    expect(screen.getByLabelText("Brightness")).toBeInTheDocument()
    expect(screen.getByLabelText("Complexity")).toBeInTheDocument()
    expect(screen.getByLabelText("Aftertaste")).toBeInTheDocument()
    expect(screen.getByLabelText("Overall Score")).toBeInTheDocument()
    expect(screen.getByLabelText("Overall Notes")).toBeInTheDocument()
    expect(screen.getByLabelText("Improvement Notes")).toBeInTheDocument()
  })

  it("shows coffee selector dropdown with non-archived coffees", async () => {
    setupMocks()
    const user = userEvent.setup()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    // Click the coffee selector button
    await user.click(screen.getByText("Select coffee..."))

    // Should show non-archived coffees
    expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    expect(screen.getByText("El Diamante")).toBeInTheDocument()
    // Archived coffee should not appear
    expect(screen.queryByText("Old Bean")).not.toBeInTheDocument()
  })

  it("can add and remove pours", async () => {
    setupMocks()
    const user = userEvent.setup()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Brewing"))
    await user.click(screen.getByText("Add Pour"))

    expect(screen.getByText("#1 (Bloom)")).toBeInTheDocument()

    await user.click(screen.getByText("Add Pour"))
    expect(screen.getByText("#2")).toBeInTheDocument()

    // Should have 2 remove buttons
    let removeBtns = screen.getAllByLabelText(/Remove pour/)
    expect(removeBtns).toHaveLength(2)

    // Remove second pour
    await user.click(removeBtns[1])

    // Should be back to 1 pour
    removeBtns = screen.getAllByLabelText(/Remove pour/)
    expect(removeBtns).toHaveLength(1)
    expect(screen.queryByText("#2")).not.toBeInTheDocument()
  })

  it("shows filter paper options in setup section", async () => {
    setupMocks()
    const user = userEvent.setup()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Setup"))

    const select = screen.getByLabelText("Filter Paper")
    const options = within(select as HTMLElement).getAllByRole("option")
    expect(options).toHaveLength(2) // "Select filter..." + "Abaca (Cafec)"
    expect(options[1].textContent).toBe("Abaca (Cafec)")
  })

  it("computes water weight when coffee weight and ratio entered", async () => {
    setupMocks()
    const user = userEvent.setup()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Setup"))

    const coffeeWeightInput = screen.getByLabelText("Coffee Weight (g)")
    const ratioInput = screen.getByLabelText("Ratio")

    await user.type(coffeeWeightInput, "15")
    await user.type(ratioInput, "15")

    await waitFor(() => {
      expect(screen.getByText(/Water Weight/)).toBeInTheDocument()
      expect(screen.getByText("225g")).toBeInTheDocument()
    })
  })

  it("computes extraction yield when coffee_ml, tds, and coffee_weight entered", async () => {
    setupMocks()
    const user = userEvent.setup()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    // Enter coffee_weight in Setup
    await user.click(screen.getByText("Setup"))
    await user.type(screen.getByLabelText("Coffee Weight (g)"), "15")

    // Enter tasting fields
    await user.click(screen.getByText("Tasting"))
    await user.type(screen.getByLabelText("Coffee (ml)"), "200")
    await user.type(screen.getByLabelText("TDS (%)"), "1.38")

    await waitFor(() => {
      expect(screen.getByText(/18.4%/)).toBeInTheDocument()
    })
  })

  it("shows validation error when saving without coffee", async () => {
    setupMocks()
    const user = userEvent.setup()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    await user.click(screen.getAllByText("Save Brew")[0])

    await waitFor(() => {
      expect(screen.getByText("Coffee is required")).toBeInTheDocument()
    })
  })

  it("creates a new brew on save and navigates away", async () => {
    setupMocks()
    mockedCreateBrew.mockResolvedValue(mockExistingBrew)
    const user = userEvent.setup()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    // Select coffee
    await user.click(screen.getByText("Select coffee..."))
    await user.click(screen.getByText("Kiamaina"))

    await user.click(screen.getAllByText("Save Brew")[0])

    await waitFor(() => {
      expect(mockedCreateBrew).toHaveBeenCalledTimes(1)
    })

    const payload = mockedCreateBrew.mock.calls[0][0]
    expect(payload.coffee_id).toBe("c-1")
  })

  it("loads existing brew data when editing", async () => {
    setupMocks()
    mockedGetBrew.mockResolvedValue(mockExistingBrew)
    const user = userEvent.setup()
    renderEditBrew()

    await waitFor(() => {
      expect(screen.getByText("Edit Brew")).toBeInTheDocument()
    })

    // Expand Tasting to access overall notes and score
    await user.click(screen.getByText("Tasting"))

    const notesField = screen.getByLabelText("Overall Notes") as HTMLTextAreaElement
    expect(notesField.value).toBe("Bright acidity")

    const scoreField = screen.getByLabelText("Overall Score") as HTMLInputElement
    expect(scoreField.value).toBe("8")
  })

  it("pre-fills only setup/brewing for Brew Again (not outcomes)", async () => {
    setupMocks()
    mockedGetBrew.mockResolvedValue(mockExistingBrew)
    const user = userEvent.setup()
    renderNewBrew("/brews/new?from=b-1")

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    // Expand Tasting to check that outcomes are NOT pre-filled
    await user.click(screen.getByText("Tasting"))

    const notesField = screen.getByLabelText("Overall Notes") as HTMLTextAreaElement
    expect(notesField.value).toBe("")

    const scoreField = screen.getByLabelText("Overall Score") as HTMLInputElement
    expect(scoreField.value).toBe("")

    // But setup fields should be pre-filled when we expand the section
    await user.click(screen.getByText("Setup"))
    const coffeeWeightInput = screen.getByLabelText("Coffee Weight (g)") as HTMLInputElement
    expect(coffeeWeightInput.value).toBe("15")
  })

  it("shows server error on save failure", async () => {
    setupMocks()
    mockedCreateBrew.mockRejectedValue(new Error("Server error"))
    const user = userEvent.setup()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    // Select coffee and save
    await user.click(screen.getByText("Select coffee..."))
    await user.click(screen.getByText("Kiamaina"))
    await user.click(screen.getAllByText("Save Brew")[0])

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Please try again.")
      ).toBeInTheDocument()
    })
  })

  it("shows error state when initial data fails to load", async () => {
    mockedListCoffees.mockRejectedValue(new Error("Network error"))
    mockedListFilterPapers.mockRejectedValue(new Error("Network error"))
    renderNewBrew()

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load data. Please try again.")
      ).toBeInTheDocument()
    })
  })

  it("navigates to coffee detail when saving from coffee context", async () => {
    setupMocks()
    mockedCreateBrew.mockResolvedValue(mockExistingBrew)
    const user = userEvent.setup()
    renderNewBrew("/brews/new?coffee_id=c-1")

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    await user.click(screen.getAllByText("Save Brew")[0])

    await waitFor(() => {
      expect(mockedCreateBrew).toHaveBeenCalled()
    })

    // Should navigate to coffee detail
    await waitFor(() => {
      expect(screen.getByText("Coffee Detail")).toBeInTheDocument()
    })
  })

  it("shows Reference button when coffee is selected", async () => {
    setupMocks()

    const user = userEvent.setup()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    // No Reference button before coffee selection
    expect(screen.queryByRole("button", { name: "Reference" })).not.toBeInTheDocument()

    // Select a coffee
    await user.click(screen.getByText("Select coffee..."))
    await user.click(screen.getByText("Kiamaina"))

    // Reference buttons should appear (desktop header + mobile footer)
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Reference" })).toHaveLength(2)
    })
  })

  it("does not pre-fill defaults before a coffee is selected", async () => {
    const mockDefaults = {
      coffee_weight: 15,
      ratio: 15,
      grind_size: 3.5,
      water_temperature: 93,
      filter_paper_id: "fp-1",
      pour_defaults: [
        { pour_number: 1, water_amount: 45, pour_style: "center", wait_time: 30 },
      ],
    }

    mockedListCoffees.mockResolvedValue(mockPaginatedResponse(mockCoffees))
    mockedListFilterPapers.mockResolvedValue(
      mockPaginatedResponse(mockFilterPapers)
    )
    mockedGetDefaults.mockResolvedValue(mockDefaults)
    mockedGetReference.mockResolvedValue({ brew: null, source: "latest" })

    const user = userEvent.setup()
    renderNewBrew()

    await waitFor(() => {
      expect(screen.getByText("New Brew")).toBeInTheDocument()
    })

    // Expand Setup section to check fields
    await user.click(screen.getByText("Setup"))

    // Fields should be blank — defaults must NOT be applied before coffee selection
    const coffeeWeightInput = screen.getByLabelText("Coffee Weight (g)") as HTMLInputElement
    const ratioInput = screen.getByLabelText("Ratio") as HTMLInputElement
    const grindSizeInput = screen.getByLabelText("Grind Size") as HTMLInputElement
    const tempInput = screen.getByLabelText("Temperature (C)") as HTMLInputElement

    expect(coffeeWeightInput.value).toBe("")
    expect(ratioInput.value).toBe("")
    expect(grindSizeInput.value).toBe("")
    expect(tempInput.value).toBe("")

    // Expand Brewing section — no pours should exist
    await user.click(screen.getByText("Brewing"))
    expect(screen.queryByText("#1 (Bloom)")).not.toBeInTheDocument()
  })

  describe("Set as reference brew checkbox", () => {
    it("shows checkbox when coffee is selected, hides when not", async () => {
      setupMocks()
      const user = userEvent.setup()
      renderNewBrew()

      await waitFor(() => {
        expect(screen.getByText("New Brew")).toBeInTheDocument()
      })

      // No checkbox before coffee selection
      expect(screen.queryByText("Set as reference brew")).not.toBeInTheDocument()

      // Select a coffee
      await user.click(screen.getByText("Select coffee..."))
      await user.click(screen.getByText("Kiamaina"))

      // Checkbox should appear
      await waitFor(() => {
        expect(screen.getByText("Set as reference brew")).toBeInTheDocument()
      })
    })

    it("is unchecked by default for new brews", async () => {
      setupMocks()
      const user = userEvent.setup()
      renderNewBrew()

      await waitFor(() => {
        expect(screen.getByText("New Brew")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Select coffee..."))
      await user.click(screen.getByText("Kiamaina"))

      await waitFor(() => {
        expect(screen.getByText("Set as reference brew")).toBeInTheDocument()
      })

      const checkbox = screen.getByRole("checkbox")
      expect(checkbox).not.toBeChecked()
    })

    it("is pre-checked when editing a brew that IS the reference", async () => {
      setupMocks()
      const brewAsReference = { ...mockExistingBrew, coffee_reference_brew_id: "b-1" }
      mockedGetBrew.mockResolvedValue(brewAsReference)
      renderEditBrew()

      await waitFor(() => {
        expect(screen.getByText("Edit Brew")).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText("Set as reference brew")).toBeInTheDocument()
      })

      const checkbox = screen.getByRole("checkbox")
      expect(checkbox).toBeChecked()
    })

    it("is unchecked when editing a brew that is NOT the reference", async () => {
      setupMocks()
      const brewNotReference = { ...mockExistingBrew, coffee_reference_brew_id: "b-other" }
      mockedGetBrew.mockResolvedValue(brewNotReference)
      renderEditBrew()

      await waitFor(() => {
        expect(screen.getByText("Edit Brew")).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText("Set as reference brew")).toBeInTheDocument()
      })

      const checkbox = screen.getByRole("checkbox")
      expect(checkbox).not.toBeChecked()
    })

    it("calls setReferenceBrew after creating a new brew when checked", async () => {
      setupMocks()
      const savedBrew = { ...mockExistingBrew, id: "b-new" }
      mockedCreateBrew.mockResolvedValue(savedBrew)
      mockedSetReferenceBrew.mockResolvedValue({} as any)
      const user = userEvent.setup()
      renderNewBrew()

      await waitFor(() => {
        expect(screen.getByText("New Brew")).toBeInTheDocument()
      })

      // Select coffee
      await user.click(screen.getByText("Select coffee..."))
      await user.click(screen.getByText("Kiamaina"))

      // Check the reference checkbox
      await waitFor(() => {
        expect(screen.getByText("Set as reference brew")).toBeInTheDocument()
      })
      await user.click(screen.getByRole("checkbox"))

      // Save
      await user.click(screen.getAllByText("Save Brew")[0])

      await waitFor(() => {
        expect(mockedCreateBrew).toHaveBeenCalledTimes(1)
      })

      await waitFor(() => {
        expect(mockedSetReferenceBrew).toHaveBeenCalledWith("c-1", "b-new")
      })
    })

    it("calls setReferenceBrew with null when unchecked on edit (was reference)", async () => {
      setupMocks()
      const brewAsReference = { ...mockExistingBrew, coffee_reference_brew_id: "b-1" }
      mockedGetBrew.mockResolvedValue(brewAsReference)
      mockedUpdateBrew.mockResolvedValue(brewAsReference)
      mockedSetReferenceBrew.mockResolvedValue({} as any)
      const user = userEvent.setup()
      renderEditBrew()

      await waitFor(() => {
        expect(screen.getByText("Edit Brew")).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByRole("checkbox")).toBeChecked()
      })

      // Uncheck the reference checkbox
      await user.click(screen.getByRole("checkbox"))
      expect(screen.getByRole("checkbox")).not.toBeChecked()

      // Save
      await user.click(screen.getAllByText("Save Brew")[0])

      await waitFor(() => {
        expect(mockedUpdateBrew).toHaveBeenCalledTimes(1)
      })

      await waitFor(() => {
        expect(mockedSetReferenceBrew).toHaveBeenCalledWith("c-1", null)
      })
    })

    it("does not call setReferenceBrew when checkbox is unchecked and was not reference", async () => {
      setupMocks()
      mockedCreateBrew.mockResolvedValue(mockExistingBrew)
      const user = userEvent.setup()
      renderNewBrew()

      await waitFor(() => {
        expect(screen.getByText("New Brew")).toBeInTheDocument()
      })

      // Select coffee and save without checking the box
      await user.click(screen.getByText("Select coffee..."))
      await user.click(screen.getByText("Kiamaina"))
      await user.click(screen.getAllByText("Save Brew")[0])

      await waitFor(() => {
        expect(mockedCreateBrew).toHaveBeenCalledTimes(1)
      })

      // Navigate happens — setReferenceBrew should NOT be called
      await waitFor(() => {
        expect(screen.getByText("Home Page")).toBeInTheDocument()
      })
      expect(mockedSetReferenceBrew).not.toHaveBeenCalled()
    })

    it("shows warning toast but navigates when setReferenceBrew fails", async () => {
      setupMocks()
      const savedBrew = { ...mockExistingBrew, id: "b-new" }
      mockedCreateBrew.mockResolvedValue(savedBrew)
      mockedSetReferenceBrew.mockRejectedValue(new Error("Reference API error"))
      const user = userEvent.setup()
      renderNewBrew()

      await waitFor(() => {
        expect(screen.getByText("New Brew")).toBeInTheDocument()
      })

      // Select coffee and check reference
      await user.click(screen.getByText("Select coffee..."))
      await user.click(screen.getByText("Kiamaina"))

      await waitFor(() => {
        expect(screen.getByText("Set as reference brew")).toBeInTheDocument()
      })
      await user.click(screen.getByRole("checkbox"))

      // Save
      await user.click(screen.getAllByText("Save Brew")[0])

      // Should still navigate despite reference API failure
      await waitFor(() => {
        expect(screen.getByText("Home Page")).toBeInTheDocument()
      })

      // setReferenceBrew was called but failed
      expect(mockedSetReferenceBrew).toHaveBeenCalledWith("c-1", "b-new")
    })
  })
})
