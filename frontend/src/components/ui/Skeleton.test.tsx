import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Skeleton } from "./Skeleton"

describe("Skeleton", () => {
  it("renders with animate-pulse and bg-muted classes", () => {
    render(<Skeleton data-testid="skeleton" />)
    const el = screen.getByTestId("skeleton")
    expect(el.className).toContain("animate-pulse")
    expect(el.className).toContain("bg-muted")
    expect(el.className).toContain("rounded-md")
  })

  it("merges custom classNames", () => {
    render(<Skeleton data-testid="skeleton" className="h-10 w-20" />)
    const el = screen.getByTestId("skeleton")
    expect(el.className).toContain("animate-pulse")
    expect(el.className).toContain("h-10")
    expect(el.className).toContain("w-20")
  })

  it("passes through HTML attributes", () => {
    render(<Skeleton data-testid="skeleton" role="presentation" />)
    expect(screen.getByTestId("skeleton")).toHaveAttribute("role", "presentation")
  })
})
