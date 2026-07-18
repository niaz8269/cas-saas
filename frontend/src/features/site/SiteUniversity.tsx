import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  Award,
  CalendarClock,
  ExternalLink,
  GraduationCap,
  Languages,
  MapPin,
  Plane,
  ShieldCheck,
} from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getSiteUniversity, type SiteIntake } from "@/features/site/api"
import EnquiryForm from "@/features/site/EnquiryForm"
import { useSeo } from "@/lib/seo"
import { cn } from "@/lib/utils"

const money = (v: string | number | null | undefined, currency?: string | null) =>
  v == null ? null : `${Number(v).toLocaleString()} ${currency ?? ""}`.trim()

const levelLabel = (l: string) => l.replace(/\b\w/g, (c) => c.toUpperCase())

function nextDeadline(intakes: SiteIntake[]): { name: string; date: string; daysLeft: number } | null {
  const now = Date.now()
  const up = intakes
    .filter((i) => i.application_deadline)
    .map((i) => ({ name: i.name, date: i.application_deadline as string, ms: new Date(i.application_deadline as string).getTime() }))
    .filter((i) => i.ms >= now)
    .sort((a, b) => a.ms - b.ms)[0]

  return up ? { name: up.name, date: up.date, daysLeft: Math.ceil((up.ms - now) / 86_400_000) } : null
}

export default function SiteUniversity() {
  const { slug = "" } = useParams()

  const { data, isPending, isError } = useQuery({
    queryKey: ["site-university", slug],
    queryFn: () => getSiteUniversity(slug),
    retry: false,
  })

  const uni = data?.data
  useSeo({
    title: uni ? `${uni.name} — Programs & Scholarships` : "University in China",
    description: uni
      ? `${uni.name}${uni.city ? ` in ${uni.city}` : ""} — explore programs, intakes and scholarships${uni.moe_listed ? " at this Ministry of Education–listed university" : ""}, and apply with CAS.`
      : "Explore programs, intakes and scholarships at Ministry of Education–listed universities in China.",
    canonicalPath: `/site/universities/${slug}`,
    jsonLd: uni
      ? {
          "@context": "https://schema.org",
          "@type": "CollegeOrUniversity",
          name: uni.name,
          ...(uni.website ? { url: uni.website } : {}),
          ...(uni.city ? { address: { "@type": "PostalAddress", addressLocality: uni.city, addressCountry: "CN" } } : {}),
        }
      : undefined,
  })

  if (isPending) return <Skeleton className="h-96 w-full rounded-2xl" />

  if (isError || !data) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">This university isn't available.</p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link to="/site"><ArrowLeft className="size-4" /> Back to universities</Link>
        </Button>
      </div>
    )
  }

  const u = data.data
  const deadline = nextDeadline(u.intakes)
  const rep = u.representative_professor

  return (
    <div className="space-y-6">
      <Link to="/site" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All universities
      </Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* Cover — image, or a designed gradient banner when none is available */}
        <div className="relative h-48 overflow-hidden sm:h-60">
          {u.cover_url ? (
            <img src={u.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-cas-navy-900 via-cas-navy to-cas-navy-700">
              <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
              <span className="relative px-6 text-center font-serif text-2xl font-bold text-white/90 sm:text-3xl">{u.name}</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {u.logo_url && <img src={u.logo_url} alt={`${u.name} logo`} className="-mt-14 size-20 shrink-0 rounded-xl border-2 border-card bg-white object-contain p-1 shadow-lg" />}
              <div>
                <h1 className="text-2xl font-bold text-cas-navy sm:text-3xl">{u.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {(u.city || u.country) && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {[u.city, u.country].filter(Boolean).join(", ")}</span>}
                  {u.nearest_airport && <span className="inline-flex items-center gap-1"><Plane className="size-3.5" /> {u.nearest_airport}</span>}
                </div>
                {u.moe_listed && (
                  <Badge variant="outline" className="mt-3 border-transparent bg-cas-gold-50 text-cas-gold-600">
                    <ShieldCheck className="size-3.5" /> China MoE-listed
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href="#enquire" className="inline-flex h-11 items-center gap-1.5 rounded-lg border bg-background px-5 text-sm font-semibold text-cas-navy hover:bg-muted">Enquire</a>
              {u.apply_link && (
                <a href={u.apply_link} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-cas-gold px-5 text-sm font-bold text-cas-navy shadow-sm hover:bg-cas-gold-600">
                  Apply now <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          </div>

          {deadline && (
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg bg-subtle px-3 py-2 text-sm">
              <CalendarClock className="size-4 text-cas-navy" />
              <span>Next intake <span className="font-medium">{deadline.name}</span> — closes {new Date(deadline.date).toLocaleDateString()}</span>
              <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", deadline.daysLeft <= 14 ? "bg-cas-red-50 text-cas-red" : "bg-cas-navy-50 text-cas-navy")}>
                {deadline.daysLeft} day{deadline.daysLeft === 1 ? "" : "s"} left
              </span>
            </div>
          )}

          {u.about && <p className="mt-5 border-t pt-5 text-sm whitespace-pre-line text-foreground/90">{u.about}</p>}

          {u.requirements.length > 0 && (
            <div className="mt-5 border-t pt-5">
              <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Admission requirements</h2>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {u.requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cas-navy" />{r}</li>
                ))}
              </ul>
            </div>
          )}

          {rep?.name && (
            <div className="mt-5 border-t pt-5">
              <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Your CAS representative</h2>
              <div className="mt-2 flex items-center gap-3">
                {rep.photo_url && <img src={rep.photo_url} alt={rep.name} className="size-11 rounded-full object-cover" />}
                <div>
                  <p className="text-sm font-medium">{rep.name}</p>
                  {rep.title && <p className="text-xs text-muted-foreground">{rep.title}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Programs */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><GraduationCap className="size-5 text-cas-navy" /> Programs</h2>
        {u.programs.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-sm">Programs will be listed soon.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {u.programs.map((p) => (
              <div key={p.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{levelLabel(p.level)}{p.duration_months ? ` · ${p.duration_months} months` : ""}</p>
                  </div>
                  {p.tuition_fee != null && <span className="text-sm font-semibold tabular-nums text-cas-navy">{money(p.tuition_fee, p.currency)}<span className="text-xs font-normal text-muted-foreground">/yr</span></span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {p.teaching_language && <span className="inline-flex items-center gap-1"><Languages className="size-3.5" /> {p.teaching_language}</span>}
                  {p.apply_link && <a href={p.apply_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-cas-navy hover:underline">Apply <ExternalLink className="size-3" /></a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Scholarships */}
      {u.scholarships.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Award className="size-5 text-cas-navy" /> Scholarships</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {u.scholarships.map((s) => (
              <div key={s.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{s.name}</h3>
                  {s.type && <Badge variant="outline" className="border-transparent bg-cas-navy-50 text-cas-navy capitalize">{s.type}</Badge>}
                </div>
                {s.description && <p className="mt-1.5 text-sm text-muted-foreground">{s.description}</p>}
                <p className="mt-2 text-sm text-muted-foreground">
                  {[s.coverage, s.amount != null ? money(s.amount, s.currency) : null, s.deadline ? `Deadline ${new Date(s.deadline).toLocaleDateString()}` : null].filter(Boolean).join(" · ")}
                </p>
                {s.apply_link && <a href={s.apply_link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cas-navy hover:underline">How to apply <ExternalLink className="size-3" /></a>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Enquiry */}
      <EnquiryForm universityId={u.id} universityName={u.name} />
    </div>
  )
}
