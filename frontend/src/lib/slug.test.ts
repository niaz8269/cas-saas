import { citySlug } from "@/lib/slug"

it("makes the same city slugs as the server", () => {
  expect(citySlug("Xi'an")).toBe("xian")
  expect(citySlug("Ma'anshan")).toBe("maanshan")
  expect(citySlug("Hohhot")).toBe("hohhot")
  expect(citySlug("Inner Mongolia")).toBe("inner-mongolia")
})
