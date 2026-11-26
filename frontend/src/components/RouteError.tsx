import { useEffect } from "react"
import { useRouteError } from "react-router-dom"

import ServerContent from "@/components/ServerContent"
import { reportClientError } from "@/lib/errorReporting"

/**
 * Shown when a page fails to load or throws while rendering. On the page the visitor arrived on it
 * shows the content the server sent; anywhere else, a calm message with a reload button. Replaces
 * the router's default "Unexpected Application Error" screen.
 */
export default function RouteError() {
  const error = useRouteError()

  useEffect(() => {
    const e = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Route error")
    reportClientError({ name: e.name, message: e.message, stack: e.stack })
  }, [error])

  return (
    <div className="px-4 py-8">
      <ServerContent
        fallback={
          <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-sm border bg-card p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-cas-navy">Something went wrong</p>
            <p className="max-w-sm text-sm text-muted-foreground">This page could not be loaded. Reloading usually fixes it.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-cas-navy px-4 py-2 text-sm font-medium text-white hover:bg-cas-navy-700"
            >
              Reload
            </button>
          </div>
        }
      />
    </div>
  )
}
