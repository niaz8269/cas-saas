import { loadTawk, loadTawkWhenIdle } from "./tawk"

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

describe("loadTawkWhenIdle", () => {
  const count = () => document.querySelectorAll(`script[src="${SRC}"]`).length

  afterEach(() => vi.useRealTimers())

  it("does not load the chat while the page is still being looked at", () => {
    vi.useFakeTimers()
    const stop = loadTawkWhenIdle(6000)
    vi.advanceTimersByTime(5000)

    expect(count()).toBe(0)
    stop()
  })

  it("loads it on the first tap, key press or scroll, and only once", () => {
    const stop = loadTawkWhenIdle(60000)
    window.dispatchEvent(new Event("scroll"))
    window.dispatchEvent(new Event("pointerdown"))

    expect(count()).toBe(1)
    stop()
  })

  it("loads it after the wait when nobody touches the page", () => {
    vi.useFakeTimers()
    loadTawkWhenIdle(6000)
    vi.advanceTimersByTime(6001)

    expect(count()).toBe(1)
  })

  it("can be cancelled", () => {
    vi.useFakeTimers()
    loadTawkWhenIdle(6000)()
    vi.advanceTimersByTime(7000)
    window.dispatchEvent(new Event("scroll"))

    expect(count()).toBe(0)
  })
})
