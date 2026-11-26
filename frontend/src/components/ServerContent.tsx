import type { ReactNode } from "react"
import { useLocation } from "react-router-dom"

import { serverPage } from "@/lib/serverContent"

/** A calm message for a page whose data did not arrive and that has no server copy to show. */
export function LoadError() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-sm border bg-card p-10 text-center shadow-sm">
      <p className="text-lg font-semibold text-cas-navy">This page could not be loaded</p>
      <p className="max-w-sm text-sm text-muted-foreground">Please check your connection and try again.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md bg-cas-navy px-4 py-2 text-sm font-medium text-white hover:bg-cas-navy-700"
      >
        Reload
      </button>
    </div>
  )
}

/**
 * Shows the content the server sent with this page when the app could not load its own data,
 * so a failed request never leaves the page empty. Falls back to `fallback` when the visitor
 * arrived on a different page (there is no server copy for this address).
 */
export default function ServerContent({ fallback }: { fallback: ReactNode }) {
  const { pathname } = useLocation()
  const page = serverPage(pathname)

  if (!page) return <>{fallback}</>

  return (
    <article
      data-server-content=""
      className="mx-auto max-w-3xl rounded-sm border bg-card p-6 text-sm leading-relaxed text-slate-700 shadow-sm sm:p-10 sm:text-base [&_a]:font-medium [&_a]:text-cas-navy [&_a]:underline [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-cas-navy sm:[&_h1]:text-3xl [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-cas-navy [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-cas-navy [&_li]:mt-1 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
      // Our own server's HTML for this very address, captured before the app mounted.
      dangerouslySetInnerHTML={{ __html: page.html }}
    />
  )
}
