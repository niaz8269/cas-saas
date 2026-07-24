import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"

import "@/i18n" // initialise i18next so useTranslation() resolves keys in tests
import { useAuthStore } from "@/stores/auth"
import { usePortalAuthStore } from "@/stores/portalAuth"

// Reset the auth stores after every test. They're module-level singletons, so
// a token left by one test would otherwise leak into another — now that the
// public site client (siteApi) reads them, a leftover token could change a
// later render. Keeps the suite deterministic regardless of file order.
afterEach(() => {
  useAuthStore.setState({ token: null, user: null })
  usePortalAuthStore.setState({ token: null, kind: null, profile: null })
})

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
