import "@testing-library/jest-dom/vitest"
import "@/i18n" // initialise i18next so useTranslation() resolves keys in tests

// jsdom lacks the Pointer Capture and scrollIntoView APIs that Radix UI
// primitives (Select, DropdownMenu) call on open. Polyfill them so those
// components can be driven in component tests.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
