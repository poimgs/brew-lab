import { describe, it, expect } from "vitest"
import type { Brew } from "@/api/brews"
import {
  formatFilterPaper,
  formatDripper,
} from "./brew-utils"

function makeBrew(overrides: Partial<Brew> = {}): Brew {
  return {
    id: "b-1",
    coffee_id: "c-1",
    coffee_name: "Test Coffee",
    coffee_roaster: "Test Roaster",
    coffee_tasting_notes: null,
    coffee_reference_brew_id: null,
    brew_date: "2026-01-15",
    days_off_roast: null,
    coffee_weight: null,
    ratio: null,
    water_weight: null,
    grind_size: null,
    water_temperature: null,
    filter_paper: null,
    dripper: null,
    pours: [],
    total_brew_time: null,
    technique_notes: null,
    coffee_ml: null,
    tds: null,
    extraction_yield: null,
    aroma_intensity: null,
    body_intensity: null,
    sweetness_intensity: null,
    brightness_intensity: null,
    complexity_intensity: null,
    aftertaste_intensity: null,
    overall_score: null,
    overall_notes: null,
    improvement_notes: null,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    ...overrides,
  }
}

describe("formatFilterPaper", () => {
  it("returns em dash when filter_paper is null", () => {
    const brew = makeBrew({ filter_paper: null })
    expect(formatFilterPaper(brew)).toBe("—")
  })

  it("returns name only when brand is null", () => {
    const brew = makeBrew({
      filter_paper: { id: "fp-1", name: "Abaca", brand: null },
    })
    expect(formatFilterPaper(brew)).toBe("Abaca")
  })

  it("returns name with brand in parentheses when brand exists", () => {
    const brew = makeBrew({
      filter_paper: { id: "fp-1", name: "Abaca", brand: "Cafec" },
    })
    expect(formatFilterPaper(brew)).toBe("Abaca (Cafec)")
  })
})

describe("formatDripper", () => {
  it("returns em dash when dripper is null", () => {
    const brew = makeBrew({ dripper: null })
    expect(formatDripper(brew)).toBe("—")
  })

  it("returns name only when brand is null", () => {
    const brew = makeBrew({
      dripper: { id: "d-1", name: "V60 02", brand: null },
    })
    expect(formatDripper(brew)).toBe("V60 02")
  })

  it("returns name with brand in parentheses when brand exists", () => {
    const brew = makeBrew({
      dripper: { id: "d-1", name: "V60 02", brand: "Hario" },
    })
    expect(formatDripper(brew)).toBe("V60 02 (Hario)")
  })

  it("handles empty string brand as falsy (name only)", () => {
    const brew = makeBrew({
      dripper: { id: "d-1", name: "V60 02", brand: "" as unknown as null },
    })
    expect(formatDripper(brew)).toBe("V60 02")
  })
})
