/**
 * The server prints the real content of each public page into the HTML before the app starts
 * (`<main id="cas-seo">`), and the app replaces it on mount. Keep a copy: when the page's data
 * cannot be fetched (a dropped request, a busy server, a crawler that skips the call), the page
 * shows this copy instead of a generic "not available" message. Without it every page that failed
 * to load looked the same, and search engines filed them as duplicates of one another.
 *
 * This module must be imported before the app mounts.
 */
export interface ServerPage {
  path: string
  html: string
  title: string
  description: string | null
}

const normalise = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path)

function capture(): ServerPage | null {
  if (typeof document === "undefined") return null

  const html = document.getElementById("cas-seo")?.innerHTML.trim()
  if (!html) return null

  return {
    path: normalise(window.location.pathname),
    html,
    title: document.title,
    description: document.head.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
  }
}

const captured = capture()

/** The content the server sent for this address, or null when the visitor arrived on another page. */
export function serverPage(pathname: string): ServerPage | null {
  return captured && captured.path === normalise(pathname) ? captured : null
}
