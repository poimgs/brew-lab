import "@testing-library/jest-dom/vitest"

// Polyfills for Radix UI components in jsdom
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
}
