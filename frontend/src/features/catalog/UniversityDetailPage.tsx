import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Globe,
  MapPin,
  Pencil,
  Plane,
  Plus,
  ShieldCheck,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCan } from "@/features/auth/useCan"
import {
  getUniversity,
  listAgreements,
  listCourses,
  listIntakes,
  listScholarships,
} from "@/features/catalog/api"
import AddAgreementDialog from "@/features/catalog/dialogs/AddAgreementDialog"
import AddCourseDialog from "@/features/catalog/dialogs/AddCourseDialog"
import AddIntakeDialog from "@/features/catalog/dialogs/AddIntakeDialog"
import AddScholarshipDialog from "@/features/catalog/dialogs/AddScholarshipDialog"
import UniversityFormDialog from "@/features/catalog/UniversityFormDialog"
import type { Intake } from "@/features/catalog/api"
import { cn } from "@/lib/utils"

/** Nearest upcoming intake deadline, with whole days remaining. */
function nextDeadline(intakes: Intake[]): { name: string; date: string; daysLeft: number } | null {
  const now = Date.now()
  const upcoming = intakes
    .filter((i) => i.application_deadline)
    .map((i) => ({ name: i.name, date: i.application_deadline as string, ms: new Date(i.application_deadline as string).getTime() }))
    .filter((i) => i.ms >= now)
    .sort((a, b) => a.ms - b.ms)[0]

  if (!upcoming) return null

  return { name: upcoming.name, date: upcoming.date, daysLeft: Math.ceil((upcoming.ms - now) / 86_400_000) }
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <header className="flex items-center justify-between border-b px-5 py-3">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {action}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

const money = (value: string | number | null | undefined, currency?: string | null) =>
  value == null ? "—" : `${Number(value).toLocaleString()} ${currency ?? ""}`.trim()

export default function UniversityDetailPage() {
  const { id = "" } = useParams()
  const can = useCan()
  const canManage = can("universities.manage.global")
  const canSeeAgreements = canManage || can("commission.view.global")

  const [dialog, setDialog] = useState<null | "course" | "intake" | "scholarship" | "agreement">(null)
  const [editOpen, setEditOpen] = useState(false)

  const university = useQuery({
    queryKey: ["university", id],
    queryFn: () => getUniversity(id),
  })

  const courses = useQuery({
    queryKey: ["university-courses", Number(id)],
    queryFn: () => listCourses(id),
  })

  const intakes = useQuery({
    queryKey: ["university-intakes", Number(id)],
    queryFn: () => listIntakes(id),
  })

  const scholarships = useQuery({
    queryKey: ["university-scholarships", Number(id)],
    queryFn: () => listScholarships(id),
  })

  const agreements = useQuery({
    queryKey: ["university-agreements", Number(id)],
    queryFn: () => listAgreements(id),
    enabled: canSeeAgreements,
  })

  if (university.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (university.isError || !university.data) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-destructive">University not found or failed to load.</p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link to="/universities"><ArrowLeft className="size-4" /> Back to universities</Link>
        </Button>
      </div>
    )
  }

  const uni = university.data.data

  const addButton = (label: string, key: NonNullable<typeof dialog>) =>
    canManage ? (
      <Button size="sm" variant="secondary" onClick={() => setDialog(key)}>
        <Plus className="size-4" />
        {label}
      </Button>
    ) : undefined

  const deadline = nextDeadline(intakes.data?.data ?? [])
  const rep = uni.representative_professor
  const requirements = uni.requirements ?? []

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Link to="/universities" className="inline-flex items-center gap-1 px-6 pt-4 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Universities
        </Link>

        {/* Cover */}
        {uni.cover_url && (
          <div className="mt-3 h-40 w-full bg-subtle">
            <img src={uni.cover_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {uni.logo_url && (
                <img src={uni.logo_url} alt={`${uni.name} logo`} className="size-14 shrink-0 rounded-lg border bg-white object-contain p-1" />
              )}
              <div>
                <h2 className="text-2xl font-semibold text-cas-navy">{uni.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{uni.code}</span>
                  {(uni.city || uni.country) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" /> {[uni.city, uni.country?.name].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {uni.nearest_airport && (
                    <span className="inline-flex items-center gap-1">
                      <Plane className="size-3.5" /> {uni.nearest_airport}
                    </span>
                  )}
                  {uni.website && (
                    <a href={uni.website.startsWith("http") ? uni.website : `https://${uni.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                      <Globe className="size-3.5" /> {uni.website}
                    </a>
                  )}
                </div>
                {uni.address && <p className="mt-1 text-sm text-muted-foreground">{uni.address}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {uni.moe_listed && (
                    <Badge variant="outline" className="border-transparent bg-cas-navy-50 text-cas-navy">
                      <ShieldCheck className="size-3.5" /> MoE listed
                    </Badge>
                  )}
                  <Badge variant="outline" className={cn("border-transparent capitalize", uni.status === "active" ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground")}>
                    {uni.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canManage && (
                <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" /> Edit
                </Button>
              )}
              {uni.apply_link && (
                <Button asChild size="sm">
                  <a href={uni.apply_link} target="_blank" rel="noreferrer">
                    Apply <ExternalLink className="size-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Deadline counter */}
          {deadline && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-subtle px-3 py-2 text-sm">
              <CalendarClock className="size-4 text-cas-navy" />
              <span>
                Next intake <span className="font-medium">{deadline.name}</span> — applications close {new Date(deadline.date).toLocaleDateString()}
              </span>
              <span className={cn(
                "ml-auto rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                deadline.daysLeft <= 14 ? "bg-cas-red-50 text-cas-red" : "bg-cas-navy-50 text-cas-navy",
              )}>
                {deadline.daysLeft} day{deadline.daysLeft === 1 ? "" : "s"} left
              </span>
            </div>
          )}

          {uni.about && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">About</p>
              <p className="mt-1.5 text-sm whitespace-pre-line text-foreground/90">{uni.about}</p>
            </div>
          )}

          {requirements.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Admission requirements</p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cas-navy" aria-hidden="true" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(rep?.name || uni.contacts.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-8 border-t pt-4">
              {rep?.name && (
                <div>
                  <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Representative professor</p>
                  <div className="mt-2 flex items-center gap-3">
                    {rep.photo_url && <img src={rep.photo_url} alt={rep.name} className="size-10 rounded-full object-cover" />}
                    <div>
                      <p className="text-sm font-medium">{rep.name}</p>
                      {rep.title && <p className="text-xs text-muted-foreground">{rep.title}</p>}
                    </div>
                  </div>
                </div>
              )}
              {uni.contacts.length > 0 && (
                <div>
                  <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Contacts</p>
                  <div className="mt-2 flex flex-wrap gap-6 text-sm">
                    {uni.contacts.map((contact) => (
                      <div key={contact.id}>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-muted-foreground">{[contact.role, contact.email].filter(Boolean).join(" · ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Courses */}
      <Section title="Courses" action={addButton("Add course", "course")}>
        {courses.data?.data.length ? (
          <ul className="divide-y">
            {courses.data.data.map((course) => (
              <li key={course.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium">{course.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground capitalize">{course.level}</span>
                </div>
                <div className="text-right text-muted-foreground tabular-nums">
                  {course.duration_months ? `${course.duration_months} mo · ` : ""}
                  {money(course.tuition_fee, course.currency)}/yr
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No courses yet.</p>
        )}
      </Section>

      {/* Intakes */}
      <Section title="Intakes" action={addButton("Add intake", "intake")}>
        {intakes.data?.data.length ? (
          <ul className="divide-y">
            {intakes.data.data.map((intake) => (
              <li key={intake.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium">{intake.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {intake.course ? intake.course.name : "All courses"}
                  </span>
                </div>
                <div className="text-right text-muted-foreground">
                  {intake.application_deadline ? `Apply by ${intake.application_deadline}` : "—"}
                  <Badge
                    variant="outline"
                    className={cn(
                      "ml-3 border-transparent capitalize",
                      intake.status === "open" ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {intake.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No intakes yet.</p>
        )}
      </Section>

      {/* Scholarships */}
      <Section title="Scholarships" action={addButton("Add scholarship", "scholarship")}>
        {scholarships.data?.data.length ? (
          <ul className="divide-y">
            {scholarships.data.data.map((scholarship) => (
              <li key={scholarship.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium">{scholarship.name}</span>
                <span className="text-muted-foreground">{scholarship.coverage ?? scholarship.type ?? "—"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No scholarships yet.</p>
        )}
      </Section>

      {/* Agreements — only for commission-privileged staff */}
      {canSeeAgreements && (
        <Section title="Commission agreements" action={addButton("Add agreement", "agreement")}>
          {agreements.data?.data.length ? (
            <ul className="divide-y">
              {agreements.data.data.map((agreement) => (
                <li key={agreement.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-medium">
                      {agreement.commission_type === "percent"
                        ? `${Number(agreement.commission_value)}%`
                        : money(agreement.commission_value, agreement.currency)}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground capitalize">
                      {agreement.commission_type} · {agreement.course ? agreement.course.name : "All courses"}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {agreement.valid_from ?? "—"} → {agreement.valid_to ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No agreements yet.</p>
          )}
        </Section>
      )}

      {/* Add dialogs (managers only ever see the triggers) */}
      <AddCourseDialog universityId={Number(id)} open={dialog === "course"} onOpenChange={(open) => !open && setDialog(null)} />
      <AddIntakeDialog universityId={Number(id)} courses={courses.data?.data ?? []} open={dialog === "intake"} onOpenChange={(open) => !open && setDialog(null)} />
      <AddScholarshipDialog universityId={Number(id)} open={dialog === "scholarship"} onOpenChange={(open) => !open && setDialog(null)} />
      <AddAgreementDialog universityId={Number(id)} courses={courses.data?.data ?? []} open={dialog === "agreement"} onOpenChange={(open) => !open && setDialog(null)} />
      <UniversityFormDialog open={editOpen} onOpenChange={setEditOpen} university={uni} />
    </div>
  )
}
