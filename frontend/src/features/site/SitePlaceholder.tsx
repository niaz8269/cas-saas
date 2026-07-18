import { Hammer } from "lucide-react"
import { Link } from "react-router-dom"

/** Temporary page for site routes still being built out. */
export default function SitePlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
      <Hammer className="mx-auto size-8 text-cas-navy" />
      <h1 className="mt-3 text-2xl font-semibold text-cas-navy">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        This page is coming soon. In the meantime, browse our universities or get in touch with a counselor.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link to="/site/universities" className="inline-flex h-10 items-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">
          Browse universities
        </Link>
        <Link to="/site/contact" className="inline-flex h-10 items-center rounded-md bg-cas-navy px-4 text-sm font-semibold text-white hover:bg-cas-navy-700">
          Contact us
        </Link>
      </div>
    </div>
  )
}
