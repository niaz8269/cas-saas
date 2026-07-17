import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Globe, MapPin, Plus } from "lucide-react"
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
import { cn } from "@/lib/utils"

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

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              to="/universities"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Universities
            </Link>
            <h2 className="mt-1 text-2xl font-semibold text-cas-navy">{uni.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{uni.code}</span>
              {uni.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {uni.city}{uni.country ? `, ${uni.country.name}` : ""}
                </span>
              )}
              {uni.website && (
                <span className="inline-flex items-center gap-1">
                  <Globe className="size-3.5" /> {uni.website}
                </span>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "border-transparent capitalize",
              uni.status === "active" ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground",
            )}
          >
            {uni.status}
          </Badge>
        </div>

        {uni.contacts.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Contacts</p>
            <div className="mt-2 flex flex-wrap gap-6 text-sm">
              {uni.contacts.map((contact) => (
                <div key={contact.id}>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-muted-foreground">
                    {[contact.role, contact.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
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
    </div>
  )
}
