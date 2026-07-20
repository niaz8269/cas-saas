import { ArrowUpRight, GraduationCap, MapPin, School, ShieldCheck } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import type { SiteUniversityCard } from "@/features/site/api"

// Light, varied placeholder tints — photo-ready image areas that read light &
// colourful like the reference, instead of heavy dark blocks.
const TONES = [
  "from-sky-100 to-blue-50",
  "from-amber-100 to-orange-50",
  "from-emerald-100 to-teal-50",
  "from-rose-100 to-pink-50",
  "from-indigo-100 to-sky-50",
  "from-violet-100 to-fuchsia-50",
]

function toneFor(seed: number | string): string {
  const n = typeof seed === "number" ? seed : Number(String(seed).match(/(\d+)/)?.[1] ?? String(seed).length)
  return TONES[Math.abs(n) % TONES.length]
}

const DOT_GRID = {
  backgroundImage: "radial-gradient(circle, rgba(20,53,124,0.10) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
}

/**
 * A light, colour-tinted image placeholder (photo-ready). If a real cover
 * image is later supplied it can layer on top; until then the tint + soft dot
 * texture keeps card image areas light and airy, matching the reference.
 */
export function PhotoBanner({ src, className, children }: { src: string; className?: string; children?: ReactNode }) {
  return (
    <div className={cn("relative isolate overflow-hidden bg-gradient-to-br", toneFor(src), className)}>
      <div className="pointer-events-none absolute inset-0 opacity-70" style={DOT_GRID} />
      {children}
    </div>
  )
}

function monogram(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

/** University card shared by the home page and the universities listing. */
export function UniCard({ u }: { u: SiteUniversityCard }) {
  return (
    <Link
      to={u.slug ? `/site/universities/${u.slug}` : "#"}
      className="group flex flex-col overflow-hidden rounded-sm border bg-card shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-1 hover:shadow-sm hover:ring-cas-gold/40"
    >
      {/* Cover — a designed gradient banner when no image is available */}
      <div className="relative h-36 overflow-hidden">
        {u.cover_url ? (
          <img src={u.cover_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className={cn("relative flex h-full items-center justify-center bg-gradient-to-br", toneFor(u.id))}>
            <School className="absolute size-16 text-cas-navy/10" />
            <span className="relative z-10 text-3xl font-bold tracking-wide text-cas-navy/70">{monogram(u.name)}</span>
          </div>
        )}
        {u.moe_listed && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-cas-gold px-2.5 py-1 text-[11px] font-semibold text-cas-navy shadow-sm">
            <ShieldCheck className="size-3.5" /> MoE Listed
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          {u.logo_url && (
            <img src={u.logo_url} alt="" loading="lazy" decoding="async" className="size-11 shrink-0 rounded-sm border bg-white object-contain p-0.5 shadow-sm" />
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-cas-navy transition-colors group-hover:text-cas-gold-600">{u.name}</h3>
            {[u.city, u.country].filter(Boolean).length > 0 && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" /> {[u.city, u.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
        {u.about && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{u.about}</p>}
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cas-navy-50 px-2.5 py-1 text-xs font-medium text-cas-navy">
            <GraduationCap className="size-3.5" /> {u.programs_count ?? 0} program{u.programs_count === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-cas-gold-600">
            View <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

/** Premium page-header band used at the top of the site's data pages. */
export function SitePageHeader({ eyebrow, title, subtitle, action }: {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-sm border bg-gradient-to-br from-cas-navy-50 via-card to-card p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full bg-cas-gold/10 blur-2xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="text-xs font-bold tracking-wider text-cas-gold-600 uppercase">{eyebrow}</p>}
          <h1 className="mt-1 text-2xl font-bold text-cas-navy sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
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
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-cas-navy sm:text-3xl">{title}</h2>
        {subtitle && <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </section>
  )
}
