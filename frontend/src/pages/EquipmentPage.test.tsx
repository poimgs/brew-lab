import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { EquipmentPage } from "./EquipmentPage"

// Mock the filter papers API module
vi.mock("@/api/filterPapers", () => ({
  listFilterPapers: vi.fn(),
  createFilterPaper: vi.fn(),
  updateFilterPaper: vi.fn(),
  deleteFilterPaper: vi.fn(),
}))

import {
  listFilterPapers,
  createFilterPaper,
  updateFilterPaper,
  deleteFilterPaper,
} from "@/api/filterPapers"

const mockedList = vi.mocked(listFilterPapers)
const mockedCreate = vi.mocked(createFilterPaper)
const mockedUpdate = vi.mocked(updateFilterPaper)
const mockedDelete = vi.mocked(deleteFilterPaper)

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

function mockPaginatedResponse(items: typeof mockPapers) {
  return {
    items,
    pagination: { page: 1, per_page: 100, total: items.length, total_pages: 1 },
  }
}

describe("EquipmentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading spinner then renders filter paper cards", async () => {
    mockedList.mockResolvedValueOnce(mockPaginatedResponse(mockPapers))

    render(<EquipmentPage />)

    // Loading state — no heading visible, just a spinner
    expect(screen.queryByRole("heading")).not.toBeInTheDocument()

    // After data loads, cards appear
    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    expect(screen.getByText("Cafec")).toBeInTheDocument()
    expect(screen.getByText("Good for light roasts")).toBeInTheDocument()
    expect(screen.getByText("Tabbed")).toBeInTheDocument()
    expect(screen.getByText("Hario")).toBeInTheDocument()
  })

  it("renders header with responsive stacking layout to prevent overlap on mobile", async () => {
    mockedList.mockResolvedValueOnce(mockPaginatedResponse(mockPapers))

    render(<EquipmentPage />)

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
    mockedList.mockResolvedValueOnce(mockPaginatedResponse([]))

    render(<EquipmentPage />)

    await waitFor(() => {
      expect(screen.getByText("No filter papers yet.")).toBeInTheDocument()
    })

    expect(screen.getByText("Add your first filter paper")).toBeInTheDocument()
  })

  it("shows error state when fetching fails", async () => {
    mockedList.mockRejectedValueOnce(new Error("Network error"))

    render(<EquipmentPage />)

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load filter papers. Please try again.")
      ).toBeInTheDocument()
    })

    expect(screen.getByText("Try Again")).toBeInTheDocument()
  })

  it("opens add form dialog when clicking Add Filter Paper button", async () => {
    mockedList.mockResolvedValueOnce(mockPaginatedResponse(mockPapers))
    const user = userEvent.setup()

    render(<EquipmentPage />)

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
    mockedList
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
    mockedCreate.mockResolvedValueOnce({
      id: "fp-new",
      name: "Sibarist",
      brand: "Sibarist",
      notes: null,
      created_at: "2026-02-01T10:00:00Z",
      updated_at: "2026-02-01T10:00:00Z",
    })

    const user = userEvent.setup()
    render(<EquipmentPage />)

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
      expect(mockedCreate).toHaveBeenCalledWith({
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
    mockedList.mockResolvedValueOnce(mockPaginatedResponse(mockPapers))
    const user = userEvent.setup()

    render(<EquipmentPage />)

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
    mockedList
      .mockResolvedValueOnce(mockPaginatedResponse(mockPapers))
      .mockResolvedValueOnce(mockPaginatedResponse(mockPapers))
    mockedUpdate.mockResolvedValueOnce({
      ...mockPapers[0],
      name: "Abaca V2",
    })

    const user = userEvent.setup()
    render(<EquipmentPage />)

    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Edit Abaca"))

    const nameInput = screen.getByLabelText(/Name/)
    await user.clear(nameInput)
    await user.type(nameInput, "Abaca V2")
    await user.click(screen.getByText("Save"))

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith("fp-1", {
        name: "Abaca V2",
        brand: "Cafec",
        notes: "Good for light roasts",
      })
    })
  })

  it("shows delete confirmation and deletes filter paper", async () => {
    mockedList
      .mockResolvedValueOnce(mockPaginatedResponse(mockPapers))
      .mockResolvedValueOnce(mockPaginatedResponse([mockPapers[1]]))
    mockedDelete.mockResolvedValueOnce(undefined)

    const user = userEvent.setup()
    render(<EquipmentPage />)

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
      expect(mockedDelete).toHaveBeenCalledWith("fp-1")
    })

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("closes form dialog when pressing Escape", async () => {
    mockedList.mockResolvedValueOnce(mockPaginatedResponse(mockPapers))
    const user = userEvent.setup()

    render(<EquipmentPage />)

    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Add Filter Paper"))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    await user.keyboard("{Escape}")

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows validation error when submitting empty name", async () => {
    mockedList.mockResolvedValueOnce(mockPaginatedResponse(mockPapers))
    const user = userEvent.setup()

    render(<EquipmentPage />)

    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Add Filter Paper"))
    await user.click(screen.getByText("Save"))

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument()
    })

    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it("shows server error for duplicate name (409)", async () => {
    mockedList.mockResolvedValueOnce(mockPaginatedResponse(mockPapers))

    // Simulate a 409 Conflict error
    const axiosError = new Error("Conflict") as Error & {
      isAxiosError: boolean
      response: { status: number }
    }
    axiosError.isAxiosError = true
    axiosError.response = { status: 409 }
    // axios.isAxiosError checks for this property
    Object.defineProperty(axiosError, "isAxiosError", { value: true })
    mockedCreate.mockRejectedValueOnce(axiosError)

    const user = userEvent.setup()
    render(<EquipmentPage />)

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
    mockedList
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockPaginatedResponse(mockPapers))

    const user = userEvent.setup()
    render(<EquipmentPage />)

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load filter papers. Please try again.")
      ).toBeInTheDocument()
    })

    await user.click(screen.getByText("Try Again"))

    await waitFor(() => {
      expect(screen.getByText("Abaca")).toBeInTheDocument()
    })

    expect(mockedList).toHaveBeenCalledTimes(2)
  })
})
