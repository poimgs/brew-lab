import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { SharePage } from "./SharePage"

vi.mock("@/api/shareLink", () => ({
  getSharedCoffees: vi.fn(),
}))

import { getSharedCoffees } from "@/api/shareLink"

const mockedGetSharedCoffees = vi.mocked(getSharedCoffees)

const mockCoffees = [
  {
    roaster: "Cata Coffee",
    name: "Kiamaina",
    country: "Kenya",
    region: null,
    process: "Washed",
    roast_level: "Light",
    tasting_notes: "Apricot Nectar, Lemon Sorbet, Raw Honey",
    roast_date: "2025-11-19",
    reference_brew: {
      overall_score: 8,
      aroma_intensity: 7,
      body_intensity: 7,
      sweetness_intensity: 8,
      brightness_intensity: 7,
      complexity_intensity: 6,
      aftertaste_intensity: 7,
    },
  },
  {
    roaster: "April",
    name: "El Diamante",
    country: "Colombia",
    region: "Huila",
    process: "Natural",
    roast_level: null,
    tasting_notes: null,
    roast_date: null,
    reference_brew: null,
  },
  {
    roaster: null,
    name: "Mystery Bean",
    country: null,
    region: null,
    process: null,
    roast_level: null,
    tasting_notes: null,
    roast_date: null,
    reference_brew: {
      overall_score: null,
      aroma_intensity: 5,
      body_intensity: 6,
      sweetness_intensity: null,
      brightness_intensity: null,
      complexity_intensity: null,
      aftertaste_intensity: null,
    },
  },
]

function renderSharePage(token = "abc123") {
  return render(
    <MemoryRouter initialEntries={[`/share/${token}`]}>
      <Routes>
        <Route path="/share/:token" element={<SharePage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("SharePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading skeletons then renders coffee cards", async () => {
    mockedGetSharedCoffees.mockResolvedValueOnce({ items: mockCoffees })

    renderSharePage()

    // Header is always visible
    expect(screen.getByText("Coffee Collection")).toBeInTheDocument()

    // Cards appear after load
    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(screen.getByText("Cata Coffee")).toBeInTheDocument()
    expect(screen.getByText("El Diamante")).toBeInTheDocument()
    expect(screen.getByText("April")).toBeInTheDocument()
  })

  it("passes the token from the URL to the API call", async () => {
    mockedGetSharedCoffees.mockResolvedValueOnce({ items: [] })

    renderSharePage("my-secret-token")

    await waitFor(() => {
      expect(mockedGetSharedCoffees).toHaveBeenCalledWith("my-secret-token")
    })
  })

  it("shows error message for invalid token (404)", async () => {
    const error = new Error("Not found") as Error & { status: number }
    error.status = 404
    mockedGetSharedCoffees.mockRejectedValueOnce(error)

    renderSharePage()

    await waitFor(() => {
      expect(
        screen.getByText("This share link is no longer active.")
      ).toBeInTheDocument()
    })

    // Should NOT show retry button for 404
    expect(screen.queryByText("Try Again")).not.toBeInTheDocument()
  })

  it("shows generic error with retry for network errors", async () => {
    mockedGetSharedCoffees.mockRejectedValueOnce(new Error("Network error"))

    renderSharePage()

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Please try again.")
      ).toBeInTheDocument()
    })

    expect(screen.getByText("Try Again")).toBeInTheDocument()
  })

  it("retries loading when Try Again is clicked", async () => {
    mockedGetSharedCoffees
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ items: mockCoffees })

    const user = userEvent.setup()
    renderSharePage()

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Please try again.")
      ).toBeInTheDocument()
    })

    await user.click(screen.getByText("Try Again"))

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    expect(mockedGetSharedCoffees).toHaveBeenCalledTimes(2)
  })

  it("shows empty state when no coffees exist", async () => {
    mockedGetSharedCoffees.mockResolvedValueOnce({ items: [] })

    renderSharePage()

    await waitFor(() => {
      expect(screen.getByText("No coffees to show.")).toBeInTheDocument()
    })
  })

  it("renders coffee metadata: origin tags, tasting notes, roast date", async () => {
    mockedGetSharedCoffees.mockResolvedValueOnce({ items: mockCoffees })

    renderSharePage()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    // Origin tags for Kiamaina
    expect(screen.getByText("Kenya")).toBeInTheDocument()
    expect(screen.getByText("Washed")).toBeInTheDocument()
    expect(screen.getByText("Light")).toBeInTheDocument()

    // Tasting notes
    expect(
      screen.getByText("Apricot Nectar, Lemon Sorbet, Raw Honey")
    ).toBeInTheDocument()

    // Origin tags for El Diamante
    expect(screen.getByText("Colombia")).toBeInTheDocument()
    expect(screen.getByText("Natural")).toBeInTheDocument()
  })

  it("renders reference brew score when available", async () => {
    mockedGetSharedCoffees.mockResolvedValueOnce({ items: mockCoffees })

    renderSharePage()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    // Kiamaina has score 8
    expect(screen.getByText("Score: 8/10")).toBeInTheDocument()
  })

  it("does not render score when reference brew is null", async () => {
    mockedGetSharedCoffees.mockResolvedValueOnce({
      items: [mockCoffees[1]], // El Diamante has no reference brew
    })

    renderSharePage()

    await waitFor(() => {
      expect(screen.getByText("El Diamante")).toBeInTheDocument()
    })

    expect(screen.queryByText(/Score:/)).not.toBeInTheDocument()
  })

  it("renders sensory radar chart when sensory scores exist", async () => {
    mockedGetSharedCoffees.mockResolvedValueOnce({
      items: [mockCoffees[0]], // Kiamaina has full sensory scores
    })

    renderSharePage()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    // The radar chart renders as an SVG with role="img"
    const chart = screen.getByRole("img", { name: /sensory profile/i })
    expect(chart).toBeInTheDocument()
  })

  it("does not render radar chart when reference brew is null", async () => {
    mockedGetSharedCoffees.mockResolvedValueOnce({
      items: [mockCoffees[1]], // El Diamante has no reference brew
    })

    renderSharePage()

    await waitFor(() => {
      expect(screen.getByText("El Diamante")).toBeInTheDocument()
    })

    expect(
      screen.queryByRole("img", { name: /sensory profile/i })
    ).not.toBeInTheDocument()
  })

  it("renders cards as articles with proper aria labels", async () => {
    mockedGetSharedCoffees.mockResolvedValueOnce({ items: mockCoffees })

    renderSharePage()

    await waitFor(() => {
      expect(screen.getByText("Kiamaina")).toBeInTheDocument()
    })

    const articles = screen.getAllByRole("article")
    expect(articles).toHaveLength(3)

    expect(
      screen.getByRole("article", { name: "Kiamaina by Cata Coffee" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("article", { name: "El Diamante by April" })
    ).toBeInTheDocument()
    // Mystery Bean has no roaster
    expect(
      screen.getByRole("article", { name: "Mystery Bean" })
    ).toBeInTheDocument()
  })
})
