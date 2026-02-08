import type { Brew, BrewPour } from "@/api/brews"

export function formatBrewDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function formatBrewDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function formatPours(pours: BrewPour[]): string {
  if (!pours || pours.length === 0) return ""
  return pours
    .sort((a, b) => a.pour_number - b.pour_number)
    .map((p, i) => {
      const parts: string[] = []
      if (p.water_amount != null) parts.push(`${p.water_amount}g`)
      if (p.pour_style) parts.push(p.pour_style)
      if (i === 0 && p.wait_time != null) parts.push(`(${p.wait_time}s bloom)`)
      else if (p.wait_time != null) parts.push(`(${p.wait_time}s)`)
      return parts.join(" ")
    })
    .filter(Boolean)
    .join(", ")
}

export function formatRatio(ratio: number | null): string {
  if (ratio == null) return "—"
  return `1:${ratio}`
}

export function formatTemp(temp: number | null): string {
  if (temp == null) return "—"
  return `${temp}°C`
}

export function scoreColor(score: number): string {
  if (score >= 9) return "text-emerald-600 dark:text-emerald-500"
  if (score >= 7) return "text-teal-600 dark:text-teal-500"
  if (score >= 5) return "text-zinc-500 dark:text-zinc-400"
  if (score >= 3) return "text-amber-600 dark:text-amber-500"
  return "text-red-600 dark:text-red-500"
}

export function formatFilterPaper(brew: Brew): string {
  if (!brew.filter_paper) return "—"
  if (brew.filter_paper.brand) {
    return `${brew.filter_paper.name} (${brew.filter_paper.brand})`
  }
  return brew.filter_paper.name
}
