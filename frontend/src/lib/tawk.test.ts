import { loadTawk } from "./tawk"

const SRC = "https://embed.tawk.to/698289dad4f3481c3af5b2fe/1jgiul02t"

afterEach(() => {
  document.querySelectorAll(`script[src="${SRC}"]`).forEach((s) => s.remove())
})

it("adds the Tawk.to script once, however many times it is asked", () => {
  loadTawk()
  loadTawk()

  expect(document.querySelectorAll(`script[src="${SRC}"]`)).toHaveLength(1)
  expect(window.Tawk_API).toBeDefined()
})
