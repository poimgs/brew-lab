import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { toast } from "sonner"

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock react-router-dom
const mockedNavigate = vi.fn()
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
    useParams: () => ({ id: undefined }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  }
})

// Mock API modules
vi.mock("@/api/filterPapers", () => ({
  listFilterPapers: vi.fn(),
  createFilterPaper: vi.fn(),
  updateFilterPaper: vi.fn(),
  deleteFilterPaper: vi.fn(),
}))

vi.mock("@/api/coffees", () => ({
  listCoffees: vi.fn(),
  createCoffee: vi.fn(),
  getCoffee: vi.fn(),
  updateCoffee: vi.fn(),
  deleteCoffee: vi.fn(),
  archiveCoffee: vi.fn(),
  unarchiveCoffee: vi.fn(),
  setReferenceBrew: vi.fn(),
  getSuggestions: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/api/brews", () => ({
  listBrews: vi.fn(),
  listBrewsByCoffee: vi.fn(),
  getRecentBrews: vi.fn(),
  getBrew: vi.fn(),
  createBrew: vi.fn(),
  updateBrew: vi.fn(),
  deleteBrew: vi.fn(),
  getReference: vi.fn(),
}))

vi.mock("@/api/defaults", () => ({
  getDefaults: vi.fn(),
  updateDefaults: vi.fn(),
}))

import {
  listFilterPapers,
  createFilterPaper,
  updateFilterPaper,
  deleteFilterPaper,
} from "@/api/filterPapers"
import { listCoffees, createCoffee } from "@/api/coffees"

import { EquipmentPage } from "@/pages/EquipmentPage"
import { CoffeesPage } from "@/pages/CoffeesPage"

const mockedListFilterPapers = vi.mocked(listFilterPapers)
const mockedCreateFilterPaper = vi.mocked(createFilterPaper)
const mockedUpdateFilterPaper = vi.mocked(updateFilterPaper)
const mockedDeleteFilterPaper = vi.mocked(deleteFilterPaper)
const mockedListCoffees = vi.mocked(listCoffees)
const mockedCreateCoffee = vi.mocked(createCoffee)

const emptyPaginated = { items: [], pagination: { page: 1, per_page: 100, total: 0, total_pages: 0 } }

const mockFilterPaper = {
  id: "fp-1",
  name: "V60 01",
  brand: "Hario",
  notes: null,
  created_at: "2026-01-20T10:00:00Z",
  updated_at: "2026-01-20T10:00:00Z",
}

const mockCoffee = {
  id: "c-1",
  roaster: "April",
  name: "Ethiopia Chelbesa",
  country: "Ethiopia",
  farm: null,
  process: "Washed",
  roast_level: null,
  tasting_notes: null,
  roast_date: null,
  notes: null,
  reference_brew_id: null,
  brew_count: 0,
  last_brewed: null,
  archived_at: null,
  created_at: "2026-01-20T10:00:00Z",
  updated_at: "2026-01-20T10:00:00Z",
}

describe("Toast notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("EquipmentPage", () => {
    it("shows success toast when creating a filter paper", async () => {
      mockedListFilterPapers
        .mockResolvedValueOnce(emptyPaginated)
        .mockResolvedValueOnce({
          ...emptyPaginated,
          items: [mockFilterPaper],
        })
      mockedCreateFilterPaper.mockResolvedValueOnce(mockFilterPaper)

      const user = userEvent.setup()
      render(<EquipmentPage />)

      await waitFor(() => {
        expect(screen.getByText("Add Filter Paper")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Add Filter Paper"))

      await waitFor(() => {
        expect(screen.getByLabelText(/Name/)).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/Name/), "V60 01")
      await user.click(screen.getByText("Save"))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Filter paper added")
      })
    })

    it("shows success toast when updating a filter paper", async () => {
      mockedListFilterPapers
        .mockResolvedValueOnce({
          ...emptyPaginated,
          items: [mockFilterPaper],
        })
        .mockResolvedValueOnce({
          ...emptyPaginated,
          items: [{ ...mockFilterPaper, name: "V60 02" }],
        })
      mockedUpdateFilterPaper.mockResolvedValueOnce({
        ...mockFilterPaper,
        name: "V60 02",
      })

      const user = userEvent.setup()
      render(<EquipmentPage />)

      await waitFor(() => {
        expect(screen.getByText("V60 01")).toBeInTheDocument()
      })

      await user.click(screen.getByLabelText("Edit V60 01"))

      await waitFor(() => {
        expect(screen.getByLabelText(/Name/)).toHaveValue("V60 01")
      })

      await user.clear(screen.getByLabelText(/Name/))
      await user.type(screen.getByLabelText(/Name/), "V60 02")
      await user.click(screen.getByText("Save"))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Filter paper updated")
      })
    })

    it("shows success toast when deleting a filter paper", async () => {
      mockedListFilterPapers
        .mockResolvedValueOnce({
          ...emptyPaginated,
          items: [mockFilterPaper],
        })
        .mockResolvedValueOnce(emptyPaginated)
      mockedDeleteFilterPaper.mockResolvedValueOnce(undefined)

      const user = userEvent.setup()
      render(<EquipmentPage />)

      await waitFor(() => {
        expect(screen.getByText("V60 01")).toBeInTheDocument()
      })

      await user.click(screen.getByLabelText("Delete V60 01"))

      await waitFor(() => {
        expect(screen.getByText("Delete Filter Paper")).toBeInTheDocument()
      })

      await user.click(screen.getByRole("button", { name: "Delete" }))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Filter paper deleted")
      })
    })

    it("shows error toast when delete fails", async () => {
      mockedListFilterPapers.mockResolvedValueOnce({
        ...emptyPaginated,
        items: [mockFilterPaper],
      })
      mockedDeleteFilterPaper.mockRejectedValueOnce(new Error("Network error"))

      const user = userEvent.setup()
      render(<EquipmentPage />)

      await waitFor(() => {
        expect(screen.getByText("V60 01")).toBeInTheDocument()
      })

      await user.click(screen.getByLabelText("Delete V60 01"))

      await waitFor(() => {
        expect(screen.getByText("Delete Filter Paper")).toBeInTheDocument()
      })

      await user.click(screen.getByRole("button", { name: "Delete" }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to delete filter paper",
          { duration: 5000 }
        )
      })
    })
  })

  describe("CoffeesPage", () => {
    it("shows success toast when creating a coffee", async () => {
      mockedListCoffees
        .mockResolvedValueOnce(emptyPaginated)
        .mockResolvedValueOnce({
          ...emptyPaginated,
          items: [mockCoffee],
        })
      mockedCreateCoffee.mockResolvedValueOnce(mockCoffee)

      const user = userEvent.setup()
      render(<CoffeesPage />)

      await waitFor(() => {
        expect(screen.getByText("Add Coffee")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Add Coffee"))

      await waitFor(() => {
        expect(screen.getByLabelText(/Roaster/)).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/Roaster/), "April")
      await user.type(screen.getByLabelText(/^Name/), "Ethiopia Chelbesa")
      await user.click(screen.getByText("Save Coffee"))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Coffee added")
      })
    })
  })
})
