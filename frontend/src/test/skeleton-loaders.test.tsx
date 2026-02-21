import { render, screen, waitFor } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"

// Mock all API modules
vi.mock("@/api/brews", () => ({
  getRecentBrews: vi.fn(),
  listBrews: vi.fn(),
  getBrew: vi.fn(),
  getReference: vi.fn(),
  createBrew: vi.fn(),
  updateBrew: vi.fn(),
  deleteBrew: vi.fn(),
  listBrewsByCoffee: vi.fn(),
}))

vi.mock("@/api/coffees", () => ({
  listCoffees: vi.fn(),
  getCoffee: vi.fn(),
  createCoffee: vi.fn(),
  updateCoffee: vi.fn(),
  deleteCoffee: vi.fn(),
  archiveCoffee: vi.fn(),
  unarchiveCoffee: vi.fn(),
  getSuggestions: vi.fn(),
  setReferenceBrew: vi.fn(),
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

vi.mock("@/api/defaults", () => ({
  getDefaults: vi.fn(),
  updateDefaults: vi.fn(),
  deleteDefault: vi.fn(),
}))

import { getRecentBrews, listBrews } from "@/api/brews"
import { listCoffees, getCoffee } from "@/api/coffees"
import { listFilterPapers } from "@/api/filterPapers"
import { listDrippers } from "@/api/drippers"
import { getDefaults } from "@/api/defaults"

import { HomePage } from "@/pages/HomePage"
import { CoffeesPage } from "@/pages/CoffeesPage"
import { CoffeeDetailPage } from "@/pages/CoffeeDetailPage"
import { BrewsPage } from "@/pages/BrewsPage"
import { EquipmentPage } from "@/pages/EquipmentPage"
import { PreferencesPage } from "@/pages/PreferencesPage"

const mockedGetRecentBrews = vi.mocked(getRecentBrews)
const mockedListBrews = vi.mocked(listBrews)
const mockedListCoffees = vi.mocked(listCoffees)
const mockedGetCoffee = vi.mocked(getCoffee)
const mockedListFilterPapers = vi.mocked(listFilterPapers)
const mockedListDrippers = vi.mocked(listDrippers)
const mockedGetDefaults = vi.mocked(getDefaults)

describe("Skeleton loaders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("HomePage shows skeleton while loading", () => {
    mockedGetRecentBrews.mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    expect(screen.getByTestId("home-skeleton")).toBeInTheDocument()
    // Skeleton should have animate-pulse elements
    const pulsingElements = screen.getByTestId("home-skeleton").querySelectorAll(".animate-pulse")
    expect(pulsingElements.length).toBeGreaterThan(0)
  })

  it("HomePage skeleton disappears after data loads", async () => {
    mockedGetRecentBrews.mockResolvedValueOnce({
      items: [],
    })
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.queryByTestId("home-skeleton")).not.toBeInTheDocument()
    })
  })

  it("CoffeesPage shows skeleton while loading", () => {
    mockedListCoffees.mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter>
        <CoffeesPage />
      </MemoryRouter>
    )
    expect(screen.getByTestId("coffees-skeleton")).toBeInTheDocument()
    // Should show 6 card skeletons in a grid
    const pulsingElements = screen.getByTestId("coffees-skeleton").querySelectorAll(".animate-pulse")
    expect(pulsingElements.length).toBeGreaterThan(0)
  })

  it("CoffeeDetailPage shows skeleton while loading", () => {
    mockedGetCoffee.mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter initialEntries={["/coffees/c-1"]}>
        <Routes>
          <Route path="/coffees/:id" element={<CoffeeDetailPage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByTestId("coffee-detail-skeleton")).toBeInTheDocument()
  })

  it("BrewsPage shows skeleton while loading", () => {
    mockedListBrews.mockReturnValue(new Promise(() => {}))
    mockedListCoffees.mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter>
        <BrewsPage />
      </MemoryRouter>
    )
    expect(screen.getByTestId("brews-skeleton")).toBeInTheDocument()
    // Should show table row skeletons
    const tableRows = screen.getByTestId("brews-skeleton").querySelectorAll("tbody tr")
    expect(tableRows.length).toBe(10)
  })

  it("EquipmentPage shows skeleton while loading", () => {
    mockedListFilterPapers.mockReturnValue(new Promise(() => {}))
    mockedListDrippers.mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter>
        <EquipmentPage />
      </MemoryRouter>
    )
    expect(screen.getByTestId("equipment-skeleton")).toBeInTheDocument()
    // Should show 3 card skeletons
    const cards = screen.getByTestId("equipment-skeleton").querySelectorAll(".rounded-lg")
    expect(cards.length).toBe(3)
  })

  it("PreferencesPage shows skeleton while loading", () => {
    mockedGetDefaults.mockReturnValue(new Promise(() => {}))
    mockedListFilterPapers.mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter>
        <PreferencesPage />
      </MemoryRouter>
    )
    expect(screen.getByTestId("preferences-skeleton")).toBeInTheDocument()
    // Should show form field skeletons (5 setup fields)
    const fieldRows = screen.getByTestId("preferences-skeleton").querySelectorAll(".flex.items-center.gap-3")
    expect(fieldRows.length).toBe(5)
  })
})
