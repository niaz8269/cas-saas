import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import i18n from "@/i18n"
import { langDef } from "@/i18n/languages"
import { renderWithProviders } from "@/test/utils"

import LanguageSwitcher from "./LanguageSwitcher"

afterEach(async () => { await i18n.changeLanguage("en") })

it("opens the flag menu, lists the other languages, and switches to RTL Arabic", async () => {
  const user = userEvent.setup()
  renderWithProviders(<LanguageSwitcher />)

  await user.click(screen.getByRole("button", { name: /select language/i }))

  // The four non-active languages are offered (English is current).
  const menu = screen.getByRole("listbox")
  expect(within(menu).getAllByRole("option")).toHaveLength(4)

  // Choosing Arabic switches the language and marks it right-to-left.
  await user.click(screen.getByRole("option", { name: "العربية" }))
  await waitFor(() => expect(i18n.language).toBe("ar"))
  expect(langDef(i18n.language).dir).toBe("rtl")
})

it("uses English as the fallback for keys missing in a locale", () => {
  // A key present only in English must resolve to English in any locale
  // (so a not-yet-translated key never renders as a raw key or a blank).
  i18n.addResource("en", "translation", "test.fallbackOnly", "Fallback text")
  expect(i18n.getFixedT("id")("test.fallbackOnly")).toBe("Fallback text")

  // And a real, translated key resolves to that locale's value.
  expect(i18n.getFixedT("id")("header.signIn")).not.toBe("SIGN IN")
})
