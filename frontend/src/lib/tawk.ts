/**
 * Tawk.to live chat. CAS's own widget (property and widget ids from the
 * embed code in the Tawk.to dashboard); loaded once, after the page is up, and
 * only from the public website. The staff admin and the signed-in portals never
 * load it, so no third-party script runs next to students' personal records.
 */
const TAWK_SRC = "https://embed.tawk.to/698289dad4f3481c3af5b2fe/1jgiul02t"

declare global {
  interface Window {
    Tawk_API?: Record<string, unknown>
    Tawk_LoadStart?: Date
  }
}

export function loadTawk(): void {
  if (typeof document === "undefined") return
  if (document.querySelector(`script[src="${TAWK_SRC}"]`)) return // already loaded

  window.Tawk_API = window.Tawk_API ?? {}
  window.Tawk_LoadStart = new Date()

  const script = document.createElement("script")
  script.async = true
  script.src = TAWK_SRC
  script.charset = "UTF-8"
  script.setAttribute("crossorigin", "*")
  document.head.appendChild(script)
}

/**
 * The chat widget is ~200 KB of script that nobody needs while the page is still drawing, so it waits for the
 * first sign that someone is actually using the page (a tap, a key press, a scroll) or, failing that, a few seconds.
 * Returns a function that cancels the wait.
 */
export function loadTawkWhenIdle(fallbackMs = 6000): () => void {
  if (typeof window === "undefined") return () => {}
  const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const

  function stop() {
    events.forEach((e) => window.removeEventListener(e, go))
    clearTimeout(timer)
  }
  function go() {
    stop()
    loadTawk()
  }

  events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }))
  const timer = setTimeout(go, fallbackMs)

  return stop
}
