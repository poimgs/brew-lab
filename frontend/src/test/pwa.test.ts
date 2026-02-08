import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

const distDir = resolve(__dirname, "../../dist")

describe("PWA build output", () => {
  it("generates a valid web app manifest", () => {
    const manifestPath = resolve(distDir, "manifest.webmanifest")
    expect(existsSync(manifestPath)).toBe(true)

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"))

    expect(manifest.name).toBe("Brew Lab")
    expect(manifest.short_name).toBe("Brew Lab")
    expect(manifest.description).toBe(
      "Track and perfect your coffee brewing"
    )
    expect(manifest.start_url).toBe("/")
    expect(manifest.display).toBe("standalone")
    expect(manifest.theme_color).toBe("#0d9488")
    expect(manifest.background_color).toBe("#fafafa")
  })

  it("includes required icon sizes in manifest", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(distDir, "manifest.webmanifest"), "utf-8")
    )

    const sizes = manifest.icons.map(
      (i: { sizes: string }) => i.sizes
    )
    expect(sizes).toContain("192x192")
    expect(sizes).toContain("512x512")
  })

  it("includes a maskable icon in manifest", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(distDir, "manifest.webmanifest"), "utf-8")
    )

    const maskable = manifest.icons.find(
      (i: { purpose?: string }) => i.purpose === "maskable"
    )
    expect(maskable).toBeDefined()
    expect(maskable.sizes).toBe("512x512")
  })

  it("generates a service worker", () => {
    expect(existsSync(resolve(distDir, "sw.js"))).toBe(true)
  })

  it("generates a service worker registration script", () => {
    expect(existsSync(resolve(distDir, "registerSW.js"))).toBe(true)
  })

  it("index.html includes PWA meta tags", () => {
    const html = readFileSync(resolve(distDir, "index.html"), "utf-8")

    expect(html).toContain('name="theme-color" content="#0d9488"')
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain("apple-touch-icon-180x180.png")
  })

  it("index.html links to the manifest", () => {
    const html = readFileSync(resolve(distDir, "index.html"), "utf-8")

    expect(html).toContain("manifest.webmanifest")
  })

  it("index.html includes the service worker registration", () => {
    const html = readFileSync(resolve(distDir, "index.html"), "utf-8")

    expect(html).toContain("registerSW")
  })
})

describe("PWA icon files", () => {
  const publicDir = resolve(__dirname, "../../public")

  it.each([
    "favicon.svg",
    "pwa-64x64.png",
    "pwa-192x192.png",
    "pwa-512x512.png",
    "maskable-icon-512x512.png",
    "apple-touch-icon-180x180.png",
  ])("has %s in public directory", (filename) => {
    expect(existsSync(resolve(publicDir, filename))).toBe(true)
  })
})
