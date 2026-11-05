import { installPhotoGuard } from "@/lib/photoGuard"

installPhotoGuard()

function photo(src: string, srcset = "") {
  const img = document.createElement("img")
  img.setAttribute("src", src)
  if (srcset) img.setAttribute("srcset", srcset)
  document.body.appendChild(img)

  return img
}

it("switches a site photo to its CAS-emblem copy when it is right-clicked, then restores it", async () => {
  const img = photo("/photos/abc123.webp")

  img.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }))
  expect(img.getAttribute("src")).toBe("/wm/photos/abc123.webp")

  await new Promise((r) => setTimeout(r, 650))
  document.dispatchEvent(new Event("pointermove"))
  expect(img.getAttribute("src")).toBe("/photos/abc123.webp")
})

it("handles the hero and header photos and keeps their responsive sources", async () => {
  const img = photo("/images/hero-beijing-v2.webp", "/images/hero-beijing-800-v2.webp 800w")

  img.dispatchEvent(new Event("dragstart", { bubbles: true }))
  expect(img.getAttribute("src")).toBe("/wm/images/hero-beijing-v2.webp")
  expect(img.hasAttribute("srcset")).toBe(false)

  img.dispatchEvent(new Event("dragend", { bubbles: true }))
  expect(img.getAttribute("src")).toBe("/images/hero-beijing-v2.webp")
  expect(img.getAttribute("srcset")).toBe("/images/hero-beijing-800-v2.webp 800w")
})

it("leaves other images, such as university logos, alone", () => {
  const img = photo("/logos/some-university.png")
  img.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }))
  expect(img.getAttribute("src")).toBe("/logos/some-university.png")
})
