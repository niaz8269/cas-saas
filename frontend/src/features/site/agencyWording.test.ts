import ar from "@/i18n/locales/ar.json"
import en from "@/i18n/locales/en.json"
import fr from "@/i18n/locales/fr.json"
import id from "@/i18n/locales/id.json"
import zh from "@/i18n/locales/zh.json"

const text = (o: unknown) => JSON.stringify(o)

it("describes CAS as an authorized agency, not an agent, in every language", () => {
  expect(text(en)).not.toMatch(/authorized agent\b/i)
  expect(text(en)).toContain("official authorized agency for Ministry of Education–listed institutions")
  expect(text(fr)).not.toMatch(/agent officiel agréé/i)
  expect(text(fr)).toContain("agence officielle agréée")
  expect(text(id)).not.toMatch(/agen resmi berwenang/i)
  expect(text(id)).toContain("agensi resmi berwenang")
  expect(text(ar)).not.toContain("وكيل رسمي معتمد")
  expect(text(zh)).not.toMatch(/官方授权代理(?!机构)/)
})

it("uses the same wording in the page's own description", async () => {
  const { readFileSync } = await import("node:fs")
  const html = readFileSync("index.html", "utf-8") // vitest runs from the frontend folder

  expect(html).not.toMatch(/authorized agent\b/)
  expect(html).toContain("authorized agency")
})
