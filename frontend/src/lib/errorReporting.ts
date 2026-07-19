import { ApiError } from "@/lib/api"
import { useAuthStore } from "@/stores/auth"

/**
 * Fire-and-forget browser-error reporting into the admin error monitor. Only
 * reports for authenticated users, de-dupes per session, and caps volume so a
 * render loop can't flood the endpoint. Never throws.
 */
const seen = new Set<string>()
let sent = 0
const MAX_PER_SESSION = 25

export interface ClientError {
  name?: string
  message: string
  source?: string
  line?: number
  stack?: string
}

export function reportClientError(err: ClientError): void {
  try {
    const token = useAuthStore.getState().token
    if (!token || sent >= MAX_PER_SESSION || !err.message) return

    const fingerprint = `${err.name ?? ""}|${err.message}|${err.source ?? ""}`
    if (seen.has(fingerprint)) return
    seen.add(fingerprint)
    sent++

    void fetch("/api/v1/client-errors", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: err.name,
        message: err.message.slice(0, 2000),
        source: err.source,
        line: err.line,
        url: window.location.href,
        stack: err.stack,
      }),
    }).catch(() => {})
  } catch {
    // Never let error reporting surface an error.
  }
}

export function initErrorReporting(): void {
  window.addEventListener("error", (event) => {
    reportClientError({
      name: event.error?.name ?? "Error",
      message: event.message || String(event.error ?? "Unknown error"),
      source: event.filename,
      line: event.lineno,
      stack: event.error?.stack,
    })
  })

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason
    // API errors are already handled/logged server-side; don't double-report.
    if (reason instanceof ApiError) return

    reportClientError({
      name: reason?.name ?? "UnhandledRejection",
      message: reason?.message ?? String(reason),
      stack: reason?.stack,
    })
  })
}
