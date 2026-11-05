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
