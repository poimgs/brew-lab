import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { toast } from "sonner"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/api/filterPapers", () => ({
  listFilterPapers: vi.fn(),
  createFilterPaper: vi.fn(),
  updateFilterPaper: vi.fn(),
  deleteFilterPaper: vi.fn(),
}))

vi.mock("@/api/drippers", () => ({
  listDrippers: vi.fn(),
  createDripper: vi.fn(),
  updateDripper: vi.fn(),
  deleteDripper: vi.fn(),
}))

import { listFilterPapers } from "@/api/filterPapers"
import { listDrippers, createDripper, deleteDripper } from "@/api/drippers"
import { EquipmentPage } from "@/pages/EquipmentPage"

const mockedListPapers = vi.mocked(listFilterPapers)
const mockedListDrippers = vi.mocked(listDrippers)
const mockedCreateDripper = vi.mocked(createDripper)
const mockedDeleteDripper = vi.mocked(deleteDripper)

const emptyPaginated = {
  items: [],
  pagination: { page: 1, per_page: 100, total: 0, total_pages: 0 },
}

const mockDripper = {
  id: "dr-1",
  name: "V60 02",
  brand: "Hario",
  notes: null,
  created_at: "2026-01-20T10:00:00Z",
  updated_at: "2026-01-20T10:00:00Z",
}

describe("EquipmentPage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("stays in loading state when only filter papers resolves but drippers is still pending", async () => {
    mockedListPapers.mockResolvedValueOnce(emptyPaginated)
    mockedListDrippers.mockReturnValue(new Promise(() => {})) // never resolves

    render(
      <MemoryRouter>
        <EquipmentPage />
      </MemoryRouter>
    )

    // Skeleton should appear immediately
    expect(screen.getByTestId("equipment-skeleton")).toBeInTheDocument()

    // Wait a tick to let filter papers resolve
    await new Promise((r) => setTimeout(r, 50))

    // Skeleton should STILL be showing because drippers hasn't resolved
    expect(screen.getByTestId("equipment-skeleton")).toBeInTheDocument()
    expect(screen.queryByText("Equipment")).not.toBeInTheDocument()
  })

  it("stays in loading state when only drippers resolves but filter papers is still pending", async () => {
    mockedListPapers.mockReturnValue(new Promise(() => {})) // never resolves
    mockedListDrippers.mockResolvedValueOnce(emptyPaginated)

    render(
      <MemoryRouter>
        <EquipmentPage />
      </MemoryRouter>
    )

    expect(screen.getByTestId("equipment-skeleton")).toBeInTheDocument()

    await new Promise((r) => setTimeout(r, 50))

    expect(screen.getByTestId("equipment-skeleton")).toBeInTheDocument()
  })

  it("exits loading state when both APIs resolve", async () => {
    mockedListPapers.mockResolvedValueOnce(emptyPaginated)
    mockedListDrippers.mockResolvedValueOnce(emptyPaginated)

    render(
      <MemoryRouter>
        <EquipmentPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.queryByTestId("equipment-skeleton")).not.toBeInTheDocument()
    })

    expect(screen.getByText("Equipment")).toBeInTheDocument()
  })

  it("shows success toast when creating a dripper", async () => {
    mockedListPapers.mockResolvedValue(emptyPaginated)
    mockedListDrippers
      .mockResolvedValueOnce(emptyPaginated)
      .mockResolvedValueOnce({
        ...emptyPaginated,
        items: [mockDripper],
      })
    mockedCreateDripper.mockResolvedValueOnce(mockDripper)

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/equipment?tab=drippers"]}>
        <EquipmentPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("Add Dripper")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Add Dripper"))

    await waitFor(() => {
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/Name/), "V60 02")
    await user.click(screen.getByText("Save"))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Dripper added")
    })
  })

  it("shows error toast when dripper delete fails", async () => {
    mockedListPapers.mockResolvedValue(emptyPaginated)
    mockedListDrippers.mockResolvedValue({
      ...emptyPaginated,
      items: [mockDripper],
    })
    mockedDeleteDripper.mockRejectedValueOnce(new Error("Network error"))

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/equipment?tab=drippers"]}>
        <EquipmentPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText("V60 02")).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText("Delete V60 02"))

    await waitFor(() => {
      expect(screen.getByText("Delete Dripper")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to delete dripper",
        { duration: 5000 }
      )
    })
  })
})
