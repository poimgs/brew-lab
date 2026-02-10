import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { CoffeeFormPage } from "./CoffeeFormPage"

vi.mock("@/api/coffees", () => ({
  getCoffee: vi.fn(),
  createCoffee: vi.fn(),
  updateCoffee: vi.fn(),
  getSuggestions: vi.fn().mockResolvedValue([]),
}))

import {
  getCoffee,
  createCoffee,
  updateCoffee,
} from "@/api/coffees"

const mockedGet = vi.mocked(getCoffee)
const mockedCreate = vi.mocked(createCoffee)
const mockedUpdate = vi.mocked(updateCoffee)

const mockCoffee = {
  id: "c-1",
  roaster: "Cata Coffee",
  name: "Kiamaina",
  country: "Kenya",
  region: "Nyeri",
  farm: "Kiamaina Estate",
  varietal: "SL28",
  elevation: "1800 masl",
  process: "Washed",
  roast_level: "Light",
  tasting_notes: "Apricot Nectar, Lemon Sorbet",
  roast_date: "2025-11-19",
  notes: "Best around 3-4 weeks",
  reference_brew_id: null,
  archived_at: null,
  brew_count: 8,
  last_brewed: "2026-01-19T10:30:00Z",
  created_at: "2025-11-22T15:00:00Z",
  updated_at: "2025-11-22T15:00:00Z",
}

function CoffeeDetailCapture() {
  return <div data-testid="coffee-detail">Coffee Detail</div>
}

function renderNew() {
  return render(
    <MemoryRouter initialEntries={["/coffees/new"]}>
      <Routes>
        <Route path="/coffees/new" element={<CoffeeFormPage />} />
        <Route path="/coffees/:id" element={<CoffeeDetailCapture />} />
      </Routes>
    </MemoryRouter>
  )
}

function renderEdit(id = "c-1") {
  return render(
    <MemoryRouter initialEntries={[`/coffees/${id}/edit`]}>
      <Routes>
        <Route path="/coffees/:id/edit" element={<CoffeeFormPage />} />
        <Route path="/coffees/:id" element={<CoffeeDetailCapture />} />
      </Routes>
    </MemoryRouter>
  )
}

/** Save Coffee button appears twice (desktop + mobile); pick first */
function clickSave(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getAllByText("Save Coffee")[0])
}

describe("CoffeeFormPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("create mode", () => {
    it("renders empty form with correct title", async () => {
      renderNew()

      expect(screen.getByText("New Coffee")).toBeInTheDocument()
      expect(screen.getByLabelText(/Roaster/)).toHaveValue("")
      expect(screen.getByLabelText(/^Name/)).toHaveValue("")
    })

    it("shows validation errors for empty required fields", async () => {
      const user = userEvent.setup()
      renderNew()

      await clickSave(user)

      await waitFor(() => {
        expect(screen.getByText("Roaster is required")).toBeInTheDocument()
      })
      expect(screen.getByText("Name is required")).toBeInTheDocument()
      expect(mockedCreate).not.toHaveBeenCalled()
    })

    it("creates coffee and navigates to detail page", async () => {
      mockedCreate.mockResolvedValueOnce({ ...mockCoffee, id: "c-new" })

      const user = userEvent.setup()
      renderNew()

      await user.type(screen.getByLabelText(/Roaster/), "Square Mile")
      await user.type(screen.getByLabelText(/^Name/), "Red Brick")

      await clickSave(user)

      await waitFor(() => {
        expect(mockedCreate).toHaveBeenCalledWith({
          roaster: "Square Mile",
          name: "Red Brick",
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
        })
      })

      await waitFor(() => {
        expect(screen.getByTestId("coffee-detail")).toBeInTheDocument()
      })
    })

    it("shows server error on create failure", async () => {
      mockedCreate.mockRejectedValueOnce(new Error("Server error"))

      const user = userEvent.setup()
      renderNew()

      await user.type(screen.getByLabelText(/Roaster/), "Test")
      await user.type(screen.getByLabelText(/^Name/), "Test")
      await clickSave(user)

      await waitFor(() => {
        expect(
          screen.getByText("Something went wrong. Please try again.")
        ).toBeInTheDocument()
      })
    })

    it("has Cancel and Save buttons in both desktop and mobile locations", async () => {
      renderNew()

      expect(screen.getAllByText("Cancel")).toHaveLength(2)
      expect(screen.getAllByText("Save Coffee")).toHaveLength(2)
    })

    it("has collapsible Origin and Details sections", async () => {
      renderNew()

      expect(screen.getByText("Origin")).toBeInTheDocument()
      expect(screen.getByText("Details")).toBeInTheDocument()
    })

    it("shows origin fields when Origin section is expanded", async () => {
      const user = userEvent.setup()
      renderNew()

      await user.click(screen.getByText("Origin"))

      await waitFor(() => {
        expect(screen.getByLabelText("Country")).toBeInTheDocument()
      })
      expect(screen.getByLabelText("Region")).toBeInTheDocument()
      expect(screen.getByLabelText("Farm")).toBeInTheDocument()
      expect(screen.getByLabelText("Varietal")).toBeInTheDocument()
      expect(screen.getByLabelText("Elevation")).toBeInTheDocument()
    })

    it("shows details fields when Details section is expanded", async () => {
      const user = userEvent.setup()
      renderNew()

      await user.click(screen.getByText("Details"))

      await waitFor(() => {
        expect(screen.getByLabelText("Process")).toBeInTheDocument()
      })
      expect(screen.getByLabelText("Roast Level")).toBeInTheDocument()
      expect(screen.getByLabelText("Tasting Notes")).toBeInTheDocument()
      expect(screen.getByLabelText("Latest Roast Date")).toBeInTheDocument()
      expect(screen.getByLabelText("Personal Notes")).toBeInTheDocument()
    })
  })

  describe("edit mode", () => {
    it("shows loading skeleton while fetching coffee", async () => {
      mockedGet.mockImplementation(() => new Promise(() => {})) // never resolves

      renderEdit()

      expect(screen.getByTestId("coffee-form-skeleton")).toBeInTheDocument()
    })

    it("loads coffee data and pre-fills the form", async () => {
      mockedGet.mockResolvedValueOnce(mockCoffee)

      renderEdit()

      await waitFor(() => {
        expect(screen.getByText("Edit Coffee")).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/Roaster/)).toHaveValue("Cata Coffee")
      expect(screen.getByLabelText(/^Name/)).toHaveValue("Kiamaina")
    })

    it("updates coffee and navigates to detail page", async () => {
      mockedGet.mockResolvedValueOnce(mockCoffee)
      mockedUpdate.mockResolvedValueOnce({ ...mockCoffee, name: "Kiamaina AA" })

      const user = userEvent.setup()
      renderEdit()

      await waitFor(() => {
        expect(screen.getByLabelText(/^Name/)).toHaveValue("Kiamaina")
      })

      const nameInput = screen.getByLabelText(/^Name/)
      await user.clear(nameInput)
      await user.type(nameInput, "Kiamaina AA")
      await clickSave(user)

      await waitFor(() => {
        expect(mockedUpdate).toHaveBeenCalledWith(
          "c-1",
          expect.objectContaining({
            roaster: "Cata Coffee",
            name: "Kiamaina AA",
          })
        )
      })

      await waitFor(() => {
        expect(screen.getByTestId("coffee-detail")).toBeInTheDocument()
      })
    })

    it("shows error when coffee fails to load", async () => {
      mockedGet.mockRejectedValueOnce(new Error("Not found"))

      renderEdit()

      await waitFor(() => {
        expect(
          screen.getByText("Failed to load coffee. Please try again.")
        ).toBeInTheDocument()
      })
    })

    it("shows server error on update failure", async () => {
      mockedGet.mockResolvedValueOnce(mockCoffee)
      mockedUpdate.mockRejectedValueOnce(new Error("Server error"))

      const user = userEvent.setup()
      renderEdit()

      await waitFor(() => {
        expect(screen.getByLabelText(/^Name/)).toHaveValue("Kiamaina")
      })

      await clickSave(user)

      await waitFor(() => {
        expect(
          screen.getByText("Something went wrong. Please try again.")
        ).toBeInTheDocument()
      })
    })
  })
})
