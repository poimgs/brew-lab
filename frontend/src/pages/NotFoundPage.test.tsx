import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { NotFoundPage } from "./NotFoundPage"

function renderPage() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>
  )
}

describe("NotFoundPage", () => {
  it("renders 404 indicator", () => {
    renderPage()
    expect(screen.getByText("404")).toBeInTheDocument()
  })

  it("renders page not found heading", () => {
    renderPage()
    expect(screen.getByText("Page not found")).toBeInTheDocument()
  })

  it("renders description text", () => {
    renderPage()
    expect(
      screen.getByText("The page you're looking for doesn't exist or has been moved.")
    ).toBeInTheDocument()
  })

  it("renders Go to Home link pointing to /", () => {
    renderPage()
    const link = screen.getByText("Go to Home")
    expect(link).toBeInTheDocument()
    expect(link.closest("a")).toHaveAttribute("href", "/")
  })
})
