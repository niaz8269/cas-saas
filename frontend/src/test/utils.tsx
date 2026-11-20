import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"

export function renderWithProviders(
  ui: ReactElement,
  { route = "/" }: { route?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  )

  return render(ui, { wrapper })
}

export function jsonResponse(body: unknown, status = 200): Response {
  const text = JSON.stringify(body)
  const response = new Response(text, {
    status,
    headers: { "Content-Type": "application/json" },
  })

  // A mock often hands the same Response to several requests of one page (`mockResolvedValue`), and a real body
  // can be read only once. These read from the text instead, so every request gets the full answer.
  Object.defineProperties(response, {
    json: { value: () => Promise.resolve(JSON.parse(text)) },
    text: { value: () => Promise.resolve(text) },
    clone: { value: () => jsonResponse(body, status) },
  })

  return response
}
