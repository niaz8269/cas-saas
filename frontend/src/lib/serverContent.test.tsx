import { render, screen, waitFor } from "@testing-library/react"
import { Suspense } from "react"
import { Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { jsonResponse, renderWithProviders } from "@/test/utils"

const PATH = "/site/bds-in-china"

/** Puts the page in the state the server sends it in, then loads the modules fresh so they capture it. */
async function arriveOn(path: string) {
  window.history.pushState({}, "", path)
  document.title = "BDS in China: Fees & Universities | CAS"
  document.head.insertAdjacentHTML("beforeend", '<meta name="description" content="Server description." />')
  document.body.insertAdjacentHTML("beforeend", '<div id="cas-seed"><main id="cas-seo"><h1>BDS in China for international students</h1><p>Five years of study.</p></main></div>')
  vi.resetModules()

  const modules = {
    ServerContent: (await import("@/components/ServerContent")).default,
    SiteTopic: (await import("@/features/site/SiteTopic")).default,
  }
  // The app replaces the server's markup when it mounts.
  document.getElementById("cas-seed")?.remove()

  return modules
}

beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => {}) })
afterEach(() => {
  document.getElementById("cas-seed")?.remove()
  document.head.querySelector('meta[name="description"]')?.remove()
  window.history.pushState({}, "", "/")
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it("shows the server's content on the page the visitor arrived on, and the fallback anywhere else", async () => {
  const { ServerContent } = await arriveOn(PATH)

  const first = renderWithProviders(<ServerContent fallback={<p>fallback</p>} />, { route: PATH })
  expect(screen.getByRole("heading", { name: "BDS in China for international students" })).toBeInTheDocument()
  expect(screen.queryByText("fallback")).not.toBeInTheDocument()
  first.unmount()

  renderWithProviders(<ServerContent fallback={<p>fallback</p>} />, { route: "/site/other-page" })
  expect(screen.getByText("fallback")).toBeInTheDocument()
})

it("keeps a page's real content and title when its data cannot be fetched", async () => {
  const { SiteTopic } = await arriveOn(PATH)
  vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ message: "Too many requests" }, 429)))

  renderWithProviders(<Routes><Route path="/site/:topic" element={<SiteTopic />} /></Routes>, { route: PATH })

  expect(await screen.findByText("Five years of study.", {}, { timeout: 8000 })).toBeInTheDocument()
  expect(screen.queryByText(/page not found/i)).not.toBeInTheDocument()
  expect(document.title).toBe("BDS in China: Fees & Universities | CAS")
  expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("Server description.")
}, 12000)

it("still says not found when the server says the page does not exist", async () => {
  const { SiteTopic } = await arriveOn(PATH)
  vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ message: "Not found" }, 404)))

  renderWithProviders(<Routes><Route path="/site/:topic" element={<SiteTopic />} /></Routes>, { route: PATH })

  expect(await screen.findByRole("heading", { name: /not found/i })).toBeInTheDocument()
})

it("leaves out an optional widget whose script fails to load instead of crashing the page", async () => {
  const { lazyOptional } = await import("@/lib/lazy")
  const load = vi.fn(async (): Promise<{ default: () => null }> => { throw new TypeError("Failed to fetch dynamically imported module") })
  const Widget = lazyOptional(load, 5)

  render(<div><p>page content</p><Suspense fallback={null}><Widget /></Suspense></div>)

  await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
  expect(screen.getByText("page content")).toBeInTheDocument()
})

it("retries a page script that failed to load once", async () => {
  const { lazyPage } = await import("@/lib/lazy")
  const load = vi.fn()
    .mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module"))
    .mockResolvedValue({ default: () => <p>loaded page</p> })
  const Page = lazyPage(load, 5)

  render(<Suspense fallback={null}><Page /></Suspense>)

  expect(await screen.findByText("loaded page")).toBeInTheDocument()
  expect(load).toHaveBeenCalledTimes(2)
})
