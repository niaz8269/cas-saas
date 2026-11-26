import { type ComponentType, lazy, type LazyExoticComponent } from "react"

type Loader<T> = () => Promise<{ default: T }>

/** One more attempt after a short wait: a script that failed to download once usually arrives the second time. */
async function withRetry<T>(load: () => Promise<T>, waitMs = 600): Promise<T> {
  try {
    return await load()
  } catch {
    await new Promise((resolve) => setTimeout(resolve, waitMs))

    return load()
  }
}

/**
 * A page loaded on demand. Retries a failed download once; if it still fails the error reaches the
 * route's error screen, which shows the content the server sent instead of a crash message.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(load: Loader<T>, waitMs?: number): LazyExoticComponent<T> {
  return lazy(() => withRetry(load, waitMs))
}

/**
 * An extra the page works without (a popup, a chat button, a decorative block). If its script cannot
 * be downloaded it simply does not appear, and the rest of the page is untouched. A failed popup
 * script used to take the whole home page down with it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyOptional<T extends ComponentType<any>>(load: Loader<T>, waitMs?: number): LazyExoticComponent<T> {
  return lazy(() => withRetry(load, waitMs).catch(() => ({ default: (() => null) as unknown as T })))
}
