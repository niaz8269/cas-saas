import { mediumFor } from "./programLanguage"

it("shows the language set on a program", () => {
  expect(mediumFor({ teaching_language: "English" })).toBe("English")
  expect(mediumFor({ teaching_language: "  Chinese and English " })).toBe("Chinese and English")
})

it("shows nothing for a program with no language set", () => {
  expect(mediumFor({ teaching_language: null })).toBeNull()
  expect(mediumFor({ teaching_language: "" })).toBeNull()
  expect(mediumFor({ teaching_language: "   " })).toBeNull()
  expect(mediumFor({})).toBeNull()
})
