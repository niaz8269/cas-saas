import { render, screen } from "@testing-library/react"

import App from "./App"

it("renders the CAS ERP scaffold screen", () => {
  render(<App />)

  expect(screen.getByRole("heading", { name: "CAS ERP" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument()
})
