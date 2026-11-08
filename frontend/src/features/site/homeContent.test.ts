import { baseLocale, sectionContent } from "./homeContent"

it("reads changed text per language and ignores blanks", () => {
  const c = {
    images: { hero: "/uploads/catalog/a.webp" },
    en: { texts: { title: "Hello", blank: "   " }, lists: { items: [{ title: "A" }], empty: [] } },
    zh: { texts: { title: "你好" } },
  }

  const en = sectionContent(c, "en")
  expect(en.text("title")).toBe("Hello")
  expect(en.text("blank")).toBeUndefined()
  expect(en.text("missing")).toBeUndefined()
  expect(en.list("items")).toEqual([{ title: "A" }])
  expect(en.list("empty")).toBeUndefined()
  expect(en.image("hero")).toBe("/uploads/catalog/a.webp")

  // Each language keeps its own text; a language without changes uses the standard text.
  expect(sectionContent(c, "zh").text("title")).toBe("你好")
  expect(sectionContent(c, "fr").text("title")).toBeUndefined()
  expect(sectionContent(null, "en").text("title")).toBeUndefined()
})

it("maps a browser language to one the site supports", () => {
  expect(baseLocale("en-US")).toBe("en")
  expect(baseLocale("zh-CN")).toBe("zh")
  expect(baseLocale("ar")).toBe("ar")
  expect(baseLocale("de")).toBe("en")
  expect(baseLocale(undefined)).toBe("en")
})
