import { GraduationCap, School, ShieldCheck } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import type { SiteUniversityCard } from "@/features/site/api"

/** University card shared by the home page and the universities listing. */
export function UniCard({ u }: { u: SiteUniversityCard }) {
  return (
    <Link
      to={u.slug ? `/site/universities/${u.slug}` : "#"}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative h-32 bg-subtle">
        {u.cover_url ? (
          <img src={u.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center"><School className="size-8 text-muted-foreground/40" /></div>
        )}
        {u.moe_listed && (
          <Badge variant="outline" className="absolute top-2 right-2 border-transparent bg-white/90 text-cas-navy">
            <ShieldCheck className="size-3.5" /> MoE
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          {u.logo_url && (
            <img src={u.logo_url} alt="" className="size-10 shrink-0 rounded-lg border bg-white object-contain p-0.5" />
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-cas-navy group-hover:underline">{u.name}</h3>
            <p className="text-xs text-muted-foreground">{[u.city, u.country].filter(Boolean).join(", ")}</p>
          </div>
        </div>
        {u.about && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{u.about}</p>}
        <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-muted-foreground">
          <GraduationCap className="size-3.5" /> {u.programs_count ?? 0} program{u.programs_count === 1 ? "" : "s"}
        </div>
      </div>
    </Link>
  )
}

/** Section heading with an optional "see all" link, used across site pages. */
export function SiteSection({ title, subtitle, action, children }: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-cas-navy sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
