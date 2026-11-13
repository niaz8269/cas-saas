import { useCallback, useEffect, useRef, useState } from "react"

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)

    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null // storage unavailable or unreadable: start fresh
  }
}

/**
 * Keeps an unfinished apply form through a page refresh (or an accidental back). The form is only held in this
 * browser tab's session storage, so personal details never stay on a shared computer after the tab is closed.
 * Once the application is saved on the server as a draft, the server copy takes over and this is cleared.
 *
 * `restored` is known from the very first render, so the page can avoid pre-filling over what was typed.
 */
export function useApplyAutosave<T>({ storageKey, enabled, snapshot, onRestore }: {
  storageKey: string
  enabled: boolean
  snapshot: T
  onRestore: (saved: T) => void
}) {
  const [saved] = useState<T | null>(() => (enabled ? read<T>(storageKey) : null))
  const [restored, setRestored] = useState(saved !== null)
  const restoreRef = useRef(onRestore)
  restoreRef.current = onRestore

  useEffect(() => {
    if (saved !== null) restoreRef.current(saved)
    // Once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save as the form changes, after a short pause so typing is not slowed down.
  const serialised = JSON.stringify(snapshot)
  useEffect(() => {
    if (!enabled) return
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem(storageKey, serialised) } catch { /* ignore */ }
    }, 400)

    return () => window.clearTimeout(timer)
  }, [storageKey, enabled, serialised])

  const clear = useCallback(() => {
    try { sessionStorage.removeItem(storageKey) } catch { /* ignore */ }
    setRestored(false)
  }, [storageKey])

  return { restored, clear }
}
