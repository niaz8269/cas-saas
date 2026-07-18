import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import { organizationJsonLd, useSeo } from "./seo"

function Probe(props: Parameters<typeof useSeo>[0]) {
  useSeo(props)

  return null
}

function renderAt(path: string, props: Parameters<typeof useSeo>[0]) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Probe {...props} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  // Reset head between tests.
  document.head.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], script[type="application/ld+json"]').forEach((n) => n.remove())
})

it("sets the title, description, canonical and Open Graph tags", () => {
  renderAt("/site/programs", {
    title: "Find Programs to Study in China",
    description: "Search programs across partner universities.",
    canonicalPath: "/site/programs",
  })

  expect(document.title).toBe("Find Programs to Study in China | CAS — Consultancy for Abroad Study")
  expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("Search programs across partner universities.")
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toContain("/site/programs")
  expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toContain("Find Programs")
  expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute("content")).toBe("summary_large_image")
})

it("injects JSON-LD structured data and cleans it up on unmount", () => {
  const { unmount } = renderAt("/site", {
    title: "Home",
    jsonLd: organizationJsonLd(),
  })

  const script = document.querySelector('script[type="application/ld+json"]')
  expect(script).not.toBeNull()
  expect(JSON.parse(script!.textContent ?? "{}")["@type"]).toBe("EducationalOrganization")

  unmount()
  expect(document.querySelector('script[type="application/ld+json"]')).toBeNull()
})
