import i18n from "@/i18n"

import { formatDuration } from "./duration"

const t = i18n.t.bind(i18n)

it("shows a length stored in months as years", async () => {
  await i18n.changeLanguage("en")

  expect(formatDuration(48, t)).toBe("4 years")
  expect(formatDuration(12, t)).toBe("1 year")
  expect(formatDuration(72, t)).toBe("6 years")
  expect(formatDuration(18, t)).toBe("1.5 years")
  expect(formatDuration(6, t)).toBe("0.5 years")
})
