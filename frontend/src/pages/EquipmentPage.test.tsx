import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { EquipmentPage } from "./EquipmentPage"

// Mock the filter papers API module
vi.mock("@/api/filterPapers", () => ({
  listFilterPapers: vi.fn(),
  createFilterPaper: vi.fn(),
  updateFilterPaper: vi.fn(),
  deleteFilterPaper: vi.fn(),
}))

// Mock the drippers API module
vi.mock("@/api/drippers", () => ({
  listDrippers: vi.fn(),
  createDripper: vi.fn(),
  updateDripper: vi.fn(),
  deleteDripper: vi.fn(),
}))

import {
  listFilterPapers,
  createFilterPaper,
  updateFilterPaper,
  deleteFilterPaper,
} from "@/api/filterPapers"

import {
  listDrippers,
  createDripper,
  updateDripper,
  deleteDripper,
} from "@/api/drippers"

const mockedListPapers = vi.mocked(listFilterPapers)
const mockedCreatePaper = vi.mocked(createFilterPaper)
const mockedUpdatePaper = vi.mocked(updateFilterPaper)
const mockedDeletePaper = vi.mocked(deleteFilterPaper)

const mockedListDrippers = vi.mocked(listDrippers)
const mockedCreateDripper = vi.mocked(createDripper)
const mockedUpdateDripper = vi.mocked(updateDripper)
const mockedDeleteDripper = vi.mocked(deleteDripper)

const mockPapers = [
  {
    id: "fp-1",
    name: "Abaca",
    brand: "Cafec",
    notes: "Good for light roasts",
    created_at: "2026-01-20T10:00:00Z",
    updated_at: "2026-01-20T10:00:00Z",
  },
  {
    id: "fp-2",
    name: "Tabbed",
    brand: "Hario",
    notes: null,
    created_at: "2026-01-19T10:00:00Z",
    updated_at: "2026-01-19T10:00:00Z",
  },
]

const mockDrippers = [
  {
    id: "dr-1",
    name: "V60 02",
    brand: "Hario",
    notes: "Plastic, good heat retention",
    created_at: "2026-01-20T10:00:00Z",
    updated_at: "2026-01-20T10:00:00Z",
  },
  {
    id: "dr-2",
    name: "Origami Air",
    brand: "Origami",
    notes: null,
    created_at: "2026-01-19T10:00:00Z",
    updated_at: "2026-01-19T10:00:00Z",
  },
]

function mockPaginatedResponse<T>(items: T[]) {
  return {
    items,
    pagination: { page: 1, per_page: 100, total: items.length, total_pages: 1 },
  }
}

function renderEquipmentPage(initialRoute = "/equipment") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <EquipmentPage />
    </MemoryRouter>
  )
}

describe("EquipmentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: both APIs succeed with data
    mockedListPapers.mockResolvedValue(mockPaginatedResponse(mockPapers))
    mockedListDrippers.mockResolvedValue(mockPaginatedResponse(mockDrippers))
  })

  it("shows loading spinner then renders filter paper cards", async () => {
    renderEquipmentPage()

    // Loading state — no heading visible, just a spinner
    expect(screen.queryByRole("heading")).not.toBeInTheDocument()

    // After data loads, cards appear (default tab is filter papers)
    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    expect(screen.getByText("Cafec")).toBeInTheDocument()
    expect(screen.getByText("Good for light roasts")).toBeInTheDocument()
    expect(screen.getByText("Tabbed")).toBeInTheDocument()
    expect(screen.getByText("Hario")).toBeInTheDocument()
  })

  it("renders header with responsive stacking layout to prevent overlap on mobile", async () => {
    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("Equipment")).toBeInTheDocument()
    })

    const heading = screen.getByRole("heading", { name: "Equipment" })
    const addButton = screen.getByRole("button", { name: /Add Filter Paper/ })

    // Both should share the same parent container
    const headerContainer = heading.parentElement!
    expect(headerContainer).toContainElement(addButton)

    // Container should use flex-col (stacked on mobile) with sm:flex-row (side-by-side on sm+)
    expect(headerContainer.className).toContain("flex-col")
    expect(headerContainer.className).toContain("sm:flex-row")
  })

  it("shows empty state when no filter papers exist", async () => {
    mockedListPapers.mockResolvedValueOnce(mockPaginatedResponse([]))

    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("No filter papers yet.")).toBeInTheDocument()
    })

    expect(screen.getByText("Add your first filter paper")).toBeInTheDocument()
  })

  it("shows error state when fetching fails", async () => {
    mockedListPapers.mockRejectedValueOnce(new Error("Network error"))

    renderEquipmentPage()

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load filter papers. Please try again.")
      ).toBeInTheDocument()
    })

    expect(screen.getByText("Try Again")).toBeInTheDocument()
  })

  it("opens add form dialog when clicking Add Filter Paper button", async () => {
    const user = userEvent.setup()

    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Add Filter Paper"))

    expect(
      screen.getByRole("dialog", { name: "Add Filter Paper" })
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Name/)).toHaveValue("")
    expect(screen.getByLabelText("Brand")).toHaveValue("")
  })

  it("creates a new filter paper via the form", async () => {
    mockedListPapers
      .mockReset()
      .mockResolvedValueOnce(mockPaginatedResponse([]))
      .mockResolvedValueOnce(
        mockPaginatedResponse([
          {
            id: "fp-new",
            name: "Sibarist",
            brand: "Sibarist",
            notes: null,
            created_at: "2026-02-01T10:00:00Z",
            updated_at: "2026-02-01T10:00:00Z",
          },
        ])
      )
    mockedCreatePaper.mockResolvedValueOnce({
      id: "fp-new",
      name: "Sibarist",
      brand: "Sibarist",
      notes: null,
      created_at: "2026-02-01T10:00:00Z",
      updated_at: "2026-02-01T10:00:00Z",
    })

    const user = userEvent.setup()
    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("No filter papers yet.")).toBeInTheDocument()
    })

    // Open form via empty state link
    await user.click(screen.getByText("Add your first filter paper"))

    // Fill in the form
    await user.type(screen.getByLabelText(/Name/), "Sibarist")
    await user.type(screen.getByLabelText("Brand"), "Sibarist")

    // Submit
    await user.click(screen.getByText("Save"))

    await waitFor(() => {
      expect(mockedCreatePaper).toHaveBeenCalledWith({
        name: "Sibarist",
        brand: "Sibarist",
        notes: null,
      })
    })

    // Dialog should close and list should refresh
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("opens edit form with pre-filled values", async () => {
    const user = userEvent.setup()

    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Edit Abaca"))

    const dialog = screen.getByRole("dialog", { name: "Edit Filter Paper" })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByLabelText(/Name/)).toHaveValue("Abaca")
    expect(screen.getByLabelText("Brand")).toHaveValue("Cafec")
    expect(screen.getByLabelText("Notes")).toHaveValue("Good for light roasts")
  })

  it("updates an existing filter paper", async () => {
    mockedUpdatePaper.mockResolvedValueOnce({
      ...mockPapers[0],
      name: "Abaca V2",
    })

    const user = userEvent.setup()
    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Edit Abaca"))

    const nameInput = screen.getByLabelText(/Name/)
    await user.clear(nameInput)
    await user.type(nameInput, "Abaca V2")
    await user.click(screen.getByText("Save"))

    await waitFor(() => {
      expect(mockedUpdatePaper).toHaveBeenCalledWith("fp-1", {
        name: "Abaca V2",
        brand: "Cafec",
        notes: "Good for light roasts",
      })
    })
  })

  it("shows delete confirmation and deletes filter paper", async () => {
    mockedDeletePaper.mockResolvedValueOnce(undefined)

    const user = userEvent.setup()
    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    // Click delete on Abaca card
    await user.click(screen.getByLabelText("Delete Abaca"))

    // Confirmation dialog
    const dialog = screen.getByRole("dialog", { name: "Delete filter paper" })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText("Abaca")).toBeInTheDocument()

    // Confirm deletion
    await user.click(within(dialog).getByText("Delete"))

    await waitFor(() => {
      expect(mockedDeletePaper).toHaveBeenCalledWith("fp-1")
    })

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("closes form dialog when pressing Escape", async () => {
    const user = userEvent.setup()

    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Add Filter Paper"))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    await user.keyboard("{Escape}")

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows validation error when submitting empty name", async () => {
    const user = userEvent.setup()

    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Add Filter Paper"))
    await user.click(screen.getByText("Save"))

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument()
    })

    expect(mockedCreatePaper).not.toHaveBeenCalled()
  })

  it("shows server error for duplicate name (409)", async () => {
    // Simulate a 409 Conflict error
    const axiosError = new Error("Conflict") as Error & {
      isAxiosError: boolean
      response: { status: number }
    }
    axiosError.isAxiosError = true
    axiosError.response = { status: 409 }
    // axios.isAxiosError checks for this property
    Object.defineProperty(axiosError, "isAxiosError", { value: true })
    mockedCreatePaper.mockRejectedValueOnce(axiosError)

    const user = userEvent.setup()
    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Add Filter Paper"))
    await user.type(screen.getByLabelText(/Name/), "Abaca")
    await user.click(screen.getByText("Save"))

    await waitFor(() => {
      expect(
        screen.getByText("A filter paper with this name already exists.")
      ).toBeInTheDocument()
    })
  })

  it("retries loading when Try Again is clicked", async () => {
    mockedListPapers
      .mockReset()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockPaginatedResponse(mockPapers))
    mockedListDrippers
      .mockReset()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockPaginatedResponse(mockDrippers))

    const user = userEvent.setup()
    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/)).toBeInTheDocument()
    })

    await user.click(screen.getByText("Try Again"))

    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })
  })

  // ─── Tab navigation tests ───

  it("renders tab bar with Filter Papers and Drippers tabs", async () => {
    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("Equipment")).toBeInTheDocument()
    })

    expect(screen.getByRole("button", { name: "Filter Papers" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Drippers" })).toBeInTheDocument()
  })

  it("defaults to filter papers tab", async () => {
    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    // Filter papers visible, drippers not
    expect(screen.getByText("Tabbed")).toBeInTheDocument()
    expect(screen.queryByText("V60 02")).not.toBeInTheDocument()
    expect(screen.queryByText("Origami Air")).not.toBeInTheDocument()
  })

  it("switches to drippers tab and shows dripper cards", async () => {
    const user = userEvent.setup()
    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("Equipment")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Drippers" }))

    // Drippers visible
    expect(screen.getByText("V60 02")).toBeInTheDocument()
    expect(screen.getByText("Plastic, good heat retention")).toBeInTheDocument()
    expect(screen.getByText("Origami Air")).toBeInTheDocument()

    // Filter papers not visible
    expect(screen.queryByText("Abaca")).not.toBeInTheDocument()
  })

  it("shows Add Dripper button when on drippers tab", async () => {
    const user = userEvent.setup()
    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("Equipment")).toBeInTheDocument()
    })

    // Default tab shows Add Filter Paper
    expect(screen.getByRole("button", { name: /Add Filter Paper/ })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Drippers" }))

    // Drippers tab shows Add Dripper
    expect(screen.getByRole("button", { name: /Add Dripper/ })).toBeInTheDocument()
  })

  it("opens drippers tab directly via URL", async () => {
    renderEquipmentPage("/equipment?tab=drippers")

    await waitFor(() => {
      expect(screen.getByText("V60 02")).toBeInTheDocument()
    })

    expect(screen.getByText("Origami Air")).toBeInTheDocument()
    expect(screen.queryByText("Abaca")).not.toBeInTheDocument()
  })

  // ─── Dripper CRUD tests ───

  it("shows empty state when no drippers exist", async () => {
    mockedListDrippers.mockReset().mockResolvedValue(mockPaginatedResponse([]))
    const user = userEvent.setup()

    renderEquipmentPage()

    await waitFor(() => {
      expect(screen.getByText("Equipment")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Drippers" }))

    expect(screen.getByText("No drippers yet.")).toBeInTheDocument()
    expect(screen.getByText("Add your first dripper")).toBeInTheDocument()
  })

  it("creates a new dripper via the form", async () => {
    mockedListDrippers
      .mockReset()
      .mockResolvedValueOnce(mockPaginatedResponse([]))
      .mockResolvedValueOnce(
        mockPaginatedResponse([
          {
            id: "dr-new",
            name: "Kalita Wave 185",
            brand: "Kalita",
            notes: null,
            created_at: "2026-02-01T10:00:00Z",
            updated_at: "2026-02-01T10:00:00Z",
          },
        ])
      )
    mockedCreateDripper.mockResolvedValueOnce({
      id: "dr-new",
      name: "Kalita Wave 185",
      brand: "Kalita",
      notes: null,
      created_at: "2026-02-01T10:00:00Z",
      updated_at: "2026-02-01T10:00:00Z",
    })

    const user = userEvent.setup()
    renderEquipmentPage("/equipment?tab=drippers")

    await waitFor(() => {
      expect(screen.getByText("No drippers yet.")).toBeInTheDocument()
    })

    // Open form via empty state link
    await user.click(screen.getByText("Add your first dripper"))

    expect(
      screen.getByRole("dialog", { name: "Add Dripper" })
    ).toBeInTheDocument()

    // Fill in the form
    await user.type(screen.getByLabelText(/Name/), "Kalita Wave 185")
    await user.type(screen.getByLabelText("Brand"), "Kalita")

    // Submit
    await user.click(screen.getByText("Save"))

    await waitFor(() => {
      expect(mockedCreateDripper).toHaveBeenCalledWith({
        name: "Kalita Wave 185",
        brand: "Kalita",
        notes: null,
      })
    })

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("opens edit form for dripper with pre-filled values", async () => {
    const user = userEvent.setup()
    renderEquipmentPage("/equipment?tab=drippers")

    await waitFor(() => {
      expect(screen.getByText("V60 02")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Edit V60 02"))

    const dialog = screen.getByRole("dialog", { name: "Edit Dripper" })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByLabelText(/Name/)).toHaveValue("V60 02")
    expect(screen.getByLabelText("Brand")).toHaveValue("Hario")
    expect(screen.getByLabelText("Notes")).toHaveValue("Plastic, good heat retention")
  })

  it("updates an existing dripper", async () => {
    mockedUpdateDripper.mockResolvedValueOnce({
      ...mockDrippers[0],
      name: "V60 02 Ceramic",
    })

    const user = userEvent.setup()
    renderEquipmentPage("/equipment?tab=drippers")

    await waitFor(() => {
      expect(screen.getByText("V60 02")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Edit V60 02"))

    const nameInput = screen.getByLabelText(/Name/)
    await user.clear(nameInput)
    await user.type(nameInput, "V60 02 Ceramic")
    await user.click(screen.getByText("Save"))

    await waitFor(() => {
      expect(mockedUpdateDripper).toHaveBeenCalledWith("dr-1", {
        name: "V60 02 Ceramic",
        brand: "Hario",
        notes: "Plastic, good heat retention",
      })
    })
  })

  it("shows delete confirmation and deletes dripper", async () => {
    mockedDeleteDripper.mockResolvedValueOnce(undefined)

    const user = userEvent.setup()
    renderEquipmentPage("/equipment?tab=drippers")

    await waitFor(() => {
      expect(screen.getByText("V60 02")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Delete V60 02"))

    const dialog = screen.getByRole("dialog", { name: "Delete dripper" })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText("V60 02")).toBeInTheDocument()

    await user.click(within(dialog).getByText("Delete"))

    await waitFor(() => {
      expect(mockedDeleteDripper).toHaveBeenCalledWith("dr-1")
    })

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("shows duplicate name error for drippers (409)", async () => {
    const axiosError = new Error("Conflict") as Error & {
      isAxiosError: boolean
      response: { status: number }
    }
    axiosError.isAxiosError = true
    axiosError.response = { status: 409 }
    Object.defineProperty(axiosError, "isAxiosError", { value: true })
    mockedCreateDripper.mockRejectedValueOnce(axiosError)

    const user = userEvent.setup()
    renderEquipmentPage("/equipment?tab=drippers")

    await waitFor(() => {
      expect(screen.getByText("V60 02")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /Add Dripper/ }))
    await user.type(screen.getByLabelText(/Name/), "V60 02")
    await user.click(screen.getByText("Save"))

    await waitFor(() => {
      expect(
        screen.getByText("A dripper with this name already exists.")
      ).toBeInTheDocument()
    })
  })

  it("closes dripper form dialog when pressing Escape", async () => {
    const user = userEvent.setup()
    renderEquipmentPage("/equipment?tab=drippers")

    await waitFor(() => {
      expect(screen.getByText("V60 02")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /Add Dripper/ }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    await user.keyboard("{Escape}")

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
