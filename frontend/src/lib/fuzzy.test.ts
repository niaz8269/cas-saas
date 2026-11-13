import { fuzzyIncludes } from "./fuzzy"

const TEXT = "Civil Engineering Harbin Institute of Technology Harbin"

it("matches exact words and word starts, case-insensitively", () => {
  expect(fuzzyIncludes("harbin", TEXT)).toBe(true)
  expect(fuzzyIncludes("ENGIN", TEXT)).toBe(true)
  expect(fuzzyIncludes("", TEXT)).toBe(true)
})

it("forgives a wrong, missing, extra or swapped letter", () => {
  for (const typed of ["herbin", "harbn", "harbbin", "hrabin", "enginering", "technologi"]) {
    expect(fuzzyIncludes(typed, TEXT)).toBe(true)
  }
})

it("forgives a slip in a word that is still being typed", () => {
  expect(fuzzyIncludes("herb", TEXT)).toBe(true)
})

it("needs every word, and does not match unrelated or very short words", () => {
  expect(fuzzyIncludes("herbin medicine", TEXT)).toBe(false)
  expect(fuzzyIncludes("zzqqxx", TEXT)).toBe(false)
  expect(fuzzyIncludes("xyz", TEXT)).toBe(false)
  expect(fuzzyIncludes("beijing", TEXT)).toBe(false)
})
