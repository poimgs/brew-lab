import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { SensoryRadarChart } from "./SensoryRadarChart"

describe("SensoryRadarChart", () => {
  it("renders nothing when all attributes are null", () => {
    const { container } = render(<SensoryRadarChart />)
    expect(container.querySelector("svg")).toBeNull()
  })

  it("renders nothing when all attributes are undefined", () => {
    const { container } = render(
      <SensoryRadarChart
        aroma_intensity={undefined}
        body_intensity={undefined}
        sweetness_intensity={undefined}
        brightness_intensity={undefined}
        complexity_intensity={undefined}
        aftertaste_intensity={undefined}
      />
    )
    expect(container.querySelector("svg")).toBeNull()
  })

  it("renders when at least one attribute is present", () => {
    render(<SensoryRadarChart aroma_intensity={7} />)
    expect(screen.getByRole("img")).toBeInTheDocument()
  })

  it("generates correct aria-label with all values", () => {
    render(
      <SensoryRadarChart
        aroma_intensity={7}
        body_intensity={6}
        sweetness_intensity={8}
        brightness_intensity={5}
        complexity_intensity={4}
        aftertaste_intensity={3}
      />
    )
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "Sensory profile: sweetness 8, brightness 5, complexity 4, aftertaste 3, body 6, aroma 7"
    )
  })

  it("uses 0 for null attributes in aria-label", () => {
    render(<SensoryRadarChart aroma_intensity={7} body_intensity={null} />)
    const label = screen.getByRole("img").getAttribute("aria-label")!
    expect(label).toContain("aroma 7")
    expect(label).toContain("body 0")
  })

  it("renders concentric gridline hexagons", () => {
    const { container } = render(<SensoryRadarChart aroma_intensity={5} />)
    // 5 grid levels + 2 data polygons (glow + main) = 7 polygons total
    const polygons = container.querySelectorAll("polygon")
    expect(polygons.length).toBe(7)
  })

  it("renders 6 axis lines", () => {
    const { container } = render(<SensoryRadarChart sweetness_intensity={8} />)
    const lines = container.querySelectorAll("line")
    expect(lines.length).toBe(6)
  })

  it("renders data points as circles", () => {
    const { container } = render(<SensoryRadarChart complexity_intensity={6} />)
    const circles = container.querySelectorAll("circle")
    expect(circles.length).toBe(6)
  })

  it("renders vertex labels with values for non-null attributes", () => {
    const { container } = render(
      <SensoryRadarChart
        sweetness_intensity={8}
        brightness_intensity={5}
        complexity_intensity={4}
        aftertaste_intensity={3}
        body_intensity={6}
        aroma_intensity={7}
      />
    )
    const texts = container.querySelectorAll("text")
    const labels = Array.from(texts).map((t) => t.textContent)
    expect(labels).toEqual([
      "Sweetness8",
      "Brightness5",
      "Complexity4",
      "Aftertaste3",
      "Body6",
      "Aroma7",
    ])
  })

  it("renders vertex labels without values for null attributes", () => {
    const { container } = render(<SensoryRadarChart aroma_intensity={5} />)
    const texts = container.querySelectorAll("text")
    const labels = Array.from(texts).map((t) => t.textContent)
    expect(labels).toEqual([
      "Sweetness",
      "Brightness",
      "Complexity",
      "Aftertaste",
      "Body",
      "Aroma5",
    ])
  })

  it("respects custom size prop", () => {
    render(<SensoryRadarChart aroma_intensity={5} size={140} />)
    const svg = screen.getByRole("img")
    expect(svg).toHaveAttribute("width", "140")
    expect(svg).toHaveAttribute("height", "140")
  })

  it("applies custom className", () => {
    render(
      <SensoryRadarChart aroma_intensity={5} className="mt-4" />
    )
    const svg = screen.getByRole("img")
    expect(svg.getAttribute("class")).toContain("mt-4")
  })

  it("plots null attributes at center (radius 0)", () => {
    const { container } = render(
      <SensoryRadarChart sweetness_intensity={10} brightness_intensity={null} />
    )
    // 5 grid + 2 data (glow + main) = 7 polygons; last is main data polygon
    const polygons = container.querySelectorAll("polygon")
    const dataPolygon = polygons[polygons.length - 1]
    const points = dataPolygon.getAttribute("points")!
    // Brightness (null, index 1): should be at center (100, 100)
    expect(points).toContain("100,100")
  })

  it("renders background hexagon as a path element", () => {
    const { container } = render(<SensoryRadarChart aroma_intensity={5} />)
    const paths = container.querySelectorAll("path")
    expect(paths.length).toBe(1)
  })

  it("renders SVG defs with gradient and filter", () => {
    const { container } = render(<SensoryRadarChart aroma_intensity={5} />)
    const defs = container.querySelector("defs")
    expect(defs).not.toBeNull()
    expect(defs!.querySelector("radialGradient")).not.toBeNull()
    expect(defs!.querySelector("filter")).not.toBeNull()
  })
})
