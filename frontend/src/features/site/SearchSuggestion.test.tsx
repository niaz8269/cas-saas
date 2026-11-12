import { screen } from "@testing-library/react"
import { expect, it } from "vitest"

import { renderWithProviders } from "@/test/utils"

import SearchSuggestion from "./SearchSuggestion"

it("says what was searched instead of a misspelled word, and shows nothing for a normal search", () => {
  const { rerender } = renderWithProviders(<SearchSuggestion suggestion={{ original: "herbin", query: "harbin" }} />)

  const note = screen.getByRole("status")
  expect(note).toHaveTextContent("No matches for herbin. Showing results for harbin.")
  expect(note.querySelectorAll("strong")).toHaveLength(2)

  rerender(<SearchSuggestion suggestion={null} />)
  expect(screen.queryByRole("status")).not.toBeInTheDocument()
})
