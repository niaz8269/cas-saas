import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { expect, it, vi } from "vitest"

import UniversityDirectory from "@/features/site/UniversityDirectory"

vi.mock("@/features/site/api", () => ({
  getSiteUniversityDirectory: () =>
    Promise.resolve({
      data: [
        { name: "Anhui University", slug: "anhui-university", city: "Hefei" },
        { name: "Beijing Normal University", slug: "beijing-normal-university", city: "Beijing" },
        { name: "Bohai University", slug: "bohai-university", city: null },
      ],
    }),
}))

it("links every university, grouped by first letter, as plain links", async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter><UniversityDirectory /></MemoryRouter>
    </QueryClientProvider>,
  )

  expect(await screen.findByRole("link", { name: "Anhui University" }, { timeout: 3000 })).toHaveAttribute("href", "/site/universities/anhui-university")
  expect(screen.getByRole("link", { name: "Bohai University" })).toHaveAttribute("href", "/site/universities/bohai-university")
  expect(screen.getByText("B")).toBeInTheDocument()
})
