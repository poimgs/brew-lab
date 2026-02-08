import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { toast } from "sonner"
import { PreferencesPage } from "./PreferencesPage"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/api/defaults", () => ({
  getDefaults: vi.fn(),
  updateDefaults: vi.fn(),
  deleteDefault: vi.fn(),
}))

vi.mock("@/api/filterPapers", () => ({
  listFilterPapers: vi.fn(),
}))

import { getDefaults, updateDefaults } from "@/api/defaults"
import { listFilterPapers } from "@/api/filterPapers"

const mockedGetDefaults = vi.mocked(getDefaults)
const mockedUpdateDefaults = vi.mocked(updateDefaults)
const mockedListFilterPapers = vi.mocked(listFilterPapers)

const emptyDefaults = {
  coffee_weight: null,
  ratio: null,
  grind_size: null,
  water_temperature: null,
  filter_paper_id: null,
  pour_defaults: [],
}

const populatedDefaults = {
  coffee_weight: 15,
  ratio: 15,
  grind_size: 3.5,
  water_temperature: 93,
  filter_paper_id: "fp-1",
  pour_defaults: [
    { pour_number: 1, water_amount: 45, pour_style: "center", wait_time: 30 },
    { pour_number: 2, water_amount: 90, pour_style: "circular", wait_time: null },
  ],
}

const mockFilterPapers = {
  items: [
    {
      id: "fp-1",
      name: "Abaca",
      brand: "Cafec",
      notes: null,
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
  ],
  pagination: { page: 1, per_page: 100, total: 2, total_pages: 1 },
}

describe("PreferencesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading spinner then renders page", async () => {
    mockedGetDefaults.mockResolvedValueOnce(emptyDefaults)
    mockedListFilterPapers.mockResolvedValueOnce(mockFilterPapers)

    render(<PreferencesPage />)

    // Loading state
    expect(screen.queryByText("Preferences")).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("Preferences")).toBeInTheDocument()
    })

    expect(screen.getByText("Brew Defaults")).toBeInTheDocument()
    expect(
      screen.getByText("These values are used when no reference brew exists for a coffee.")
    ).toBeInTheDocument()
  })

  it("shows error state when fetching fails", async () => {
    mockedGetDefaults.mockRejectedValueOnce(new Error("Network error"))
    mockedListFilterPapers.mockResolvedValueOnce(mockFilterPapers)

    render(<PreferencesPage />)

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load preferences. Please try again.")
      ).toBeInTheDocument()
    })

    expect(screen.getByText("Try Again")).toBeInTheDocument()
  })

  it("retries loading when Try Again is clicked", async () => {
    mockedGetDefaults
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(emptyDefaults)
    mockedListFilterPapers
      .mockResolvedValueOnce(mockFilterPapers)
      .mockResolvedValueOnce(mockFilterPapers)

    const user = userEvent.setup()
    render(<PreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Try Again"))

    await waitFor(() => {
      expect(screen.getByText("Brew Defaults")).toBeInTheDocument()
    })

    expect(mockedGetDefaults).toHaveBeenCalledTimes(2)
  })

  it("populates form fields from existing defaults", async () => {
    mockedGetDefaults.mockResolvedValueOnce(populatedDefaults)
    mockedListFilterPapers.mockResolvedValueOnce(mockFilterPapers)

    render(<PreferencesPage />)

    await waitFor(() => {
      expect(screen.getByLabelText("Coffee Weight")).toHaveValue(15)
    })

    expect(screen.getByLabelText("Ratio")).toHaveValue(15)
    expect(screen.getByLabelText("Grind Size")).toHaveValue(3.5)
    expect(screen.getByLabelText("Temperature")).toHaveValue(93)
    expect(screen.getByLabelText("Filter Paper")).toHaveValue("fp-1")

    // Pour defaults
    expect(screen.getByText("#1 (Bloom)")).toBeInTheDocument()
    expect(screen.getByText("#2")).toBeInTheDocument()
  })

  it("renders empty form when no defaults exist", async () => {
    mockedGetDefaults.mockResolvedValueOnce(emptyDefaults)
    mockedListFilterPapers.mockResolvedValueOnce(mockFilterPapers)

    render(<PreferencesPage />)

    await waitFor(() => {
      expect(screen.getByLabelText("Coffee Weight")).toHaveValue(null)
    })

    expect(screen.getByLabelText("Ratio")).toHaveValue(null)
    expect(screen.getByLabelText("Grind Size")).toHaveValue(null)
    expect(screen.getByLabelText("Temperature")).toHaveValue(null)
    expect(screen.getByLabelText("Filter Paper")).toHaveValue("")

    // No pours
    expect(screen.queryByText("#1 (Bloom)")).not.toBeInTheDocument()
  })

  it("adds a pour default", async () => {
    mockedGetDefaults.mockResolvedValueOnce(emptyDefaults)
    mockedListFilterPapers.mockResolvedValueOnce(mockFilterPapers)
    const user = userEvent.setup()

    render(<PreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText("Brew Defaults")).toBeInTheDocument()
    })

    await user.click(screen.getByText("Add Pour"))

    expect(screen.getByText("#1 (Bloom)")).toBeInTheDocument()

    await user.click(screen.getByText("Add Pour"))

    expect(screen.getByText("#2")).toBeInTheDocument()
  })

  it("removes a pour default", async () => {
    mockedGetDefaults.mockResolvedValueOnce(populatedDefaults)
    mockedListFilterPapers.mockResolvedValueOnce(mockFilterPapers)
    const user = userEvent.setup()

    render(<PreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText("#1 (Bloom)")).toBeInTheDocument()
    })

    expect(screen.getByText("#2")).toBeInTheDocument()

    // Remove the second pour
    await user.click(screen.getByLabelText("Remove pour 2"))

    expect(screen.queryByText("#2")).not.toBeInTheDocument()
    expect(screen.getByText("#1 (Bloom)")).toBeInTheDocument()
  })

  it("clears a setup default field", async () => {
    mockedGetDefaults.mockResolvedValueOnce(populatedDefaults)
    mockedListFilterPapers.mockResolvedValueOnce(mockFilterPapers)
    const user = userEvent.setup()

    render(<PreferencesPage />)

    await waitFor(() => {
      expect(screen.getByLabelText("Coffee Weight")).toHaveValue(15)
    })

    await user.click(screen.getByLabelText("Clear coffee weight"))

    expect(screen.getByLabelText("Coffee Weight")).toHaveValue(null)
  })

  it("saves defaults successfully", async () => {
    mockedGetDefaults.mockResolvedValueOnce(emptyDefaults)
    mockedListFilterPapers.mockResolvedValueOnce(mockFilterPapers)

    const savedDefaults = {
      coffee_weight: 18,
      ratio: null,
      grind_size: null,
      water_temperature: null,
      filter_paper_id: null,
      pour_defaults: [],
    }
    mockedUpdateDefaults.mockResolvedValueOnce(savedDefaults)

    const user = userEvent.setup()
    render(<PreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText("Brew Defaults")).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText("Coffee Weight"), "18")
    await user.click(screen.getByText("Save"))

    await waitFor(() => {
      expect(mockedUpdateDefaults).toHaveBeenCalledWith(
        expect.objectContaining({ coffee_weight: 18 })
      )
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Preferences saved")
    })
  })

  it("shows error toast when save fails", async () => {
    mockedGetDefaults.mockResolvedValueOnce(emptyDefaults)
    mockedListFilterPapers.mockResolvedValueOnce(mockFilterPapers)
    mockedUpdateDefaults.mockRejectedValueOnce(new Error("Server error"))

    const user = userEvent.setup()
    render(<PreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText("Brew Defaults")).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText("Coffee Weight"), "18")
    await user.click(screen.getByText("Save"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to save preferences",
        { duration: 5000 }
      )
    })
  })

  it("shows filter paper options from equipment", async () => {
    mockedGetDefaults.mockResolvedValueOnce(emptyDefaults)
    mockedListFilterPapers.mockResolvedValueOnce(mockFilterPapers)

    render(<PreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText("Brew Defaults")).toBeInTheDocument()
    })

    const select = screen.getByLabelText("Filter Paper")
    const options = select.querySelectorAll("option")

    // "Select filter..." + 2 papers
    expect(options).toHaveLength(3)
    expect(options[1].textContent).toBe("Abaca (Cafec)")
    expect(options[2].textContent).toBe("Tabbed (Hario)")
  })

  it("saves pour defaults with correct structure", async () => {
    mockedGetDefaults.mockResolvedValueOnce(emptyDefaults)
    mockedListFilterPapers.mockResolvedValueOnce(mockFilterPapers)

    const savedDefaults = {
      ...emptyDefaults,
      pour_defaults: [
        { pour_number: 1, water_amount: 50, pour_style: null, wait_time: null },
      ],
    }
    mockedUpdateDefaults.mockResolvedValueOnce(savedDefaults)

    const user = userEvent.setup()
    render(<PreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText("Brew Defaults")).toBeInTheDocument()
    })

    // Add a pour and fill in water amount
    await user.click(screen.getByText("Add Pour"))
    await user.type(screen.getByLabelText("Pour 1 water amount"), "50")

    await user.click(screen.getByText("Save"))

    await waitFor(() => {
      expect(mockedUpdateDefaults).toHaveBeenCalledWith(
        expect.objectContaining({
          pour_defaults: [
            expect.objectContaining({
              pour_number: 1,
              water_amount: 50,
            }),
          ],
        })
      )
    })
  })

  it("uses stacked layout for setup fields on mobile (no fixed-width labels)", async () => {
    mockedGetDefaults.mockResolvedValueOnce(populatedDefaults)
    mockedListFilterPapers.mockResolvedValueOnce(mockFilterPapers)

    render(<PreferencesPage />)

    await waitFor(() => {
      expect(screen.getByLabelText("Coffee Weight")).toBeInTheDocument()
    })

    // Each setup field row should use flex-col (stacked) by default, sm:flex-row for desktop
    const labels = ["Coffee Weight", "Ratio", "Grind Size", "Temperature", "Filter Paper"]
    for (const labelText of labels) {
      const label = screen.getByText(labelText, { selector: "label" })
      const row = label.parentElement!

      // Row should stack vertically on mobile (flex-col) and go horizontal on sm+
      expect(row.className).toContain("flex-col")
      expect(row.className).toContain("sm:flex-row")

      // Label should NOT have a fixed w-32 at base — only at sm:
      expect(label.className).not.toMatch(/(?<!\S)w-32/)
      expect(label.className).toContain("sm:w-32")
    }
  })

  it("clears filter paper default", async () => {
    mockedGetDefaults.mockResolvedValueOnce(populatedDefaults)
    mockedListFilterPapers.mockResolvedValueOnce(mockFilterPapers)
    const user = userEvent.setup()

    render(<PreferencesPage />)

    await waitFor(() => {
      expect(screen.getByLabelText("Filter Paper")).toHaveValue("fp-1")
    })

    await user.click(screen.getByLabelText("Clear filter paper"))

    expect(screen.getByLabelText("Filter Paper")).toHaveValue("")
  })
})
