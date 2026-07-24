import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
  Trash2,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useCan } from "@/features/auth/useCan"
import {
  deleteContact,
  deleteProgram,
  deleteScholarship,
  getUniversity,
  listAgreements,
  listPrograms,
  listIntakes,
  listScholarships,
} from "@/features/catalog/api"
import { ApiError } from "@/lib/api"
import AddAgreementDialog from "@/features/catalog/dialogs/AddAgreementDialog"
import ContactFormDialog from "@/features/catalog/dialogs/ContactFormDialog"
import ProgramFormDialog from "@/features/catalog/dialogs/ProgramFormDialog"
import AddIntakeDialog from "@/features/catalog/dialogs/AddIntakeDialog"
import ScholarshipFormDialog from "@/features/catalog/dialogs/ScholarshipFormDialog"
import UniversityFormDialog from "@/features/catalog/UniversityFormDialog"
import type { Intake, Program, Scholarship, UniversityContact } from "@/features/catalog/api"
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

  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<null | "program" | "intake" | "scholarship" | "agreement" | "contact">(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [editingContact, setEditingContact] = useState<UniversityContact | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "program" | "scholarship" | "contact"; id: number; name: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: () => {
      const target = deleteTarget!
      if (target.kind === "program") return deleteProgram(target.id)
      if (target.kind === "scholarship") return deleteScholarship(target.id)

      return deleteContact(target.id)
    },
    onSuccess: () => {
      // Contacts live on the university detail query; programs/scholarships on their own lists.
      const key =
        deleteTarget!.kind === "program"
          ? (["university-programs", Number(id)] as const)
          : deleteTarget!.kind === "scholarship"
            ? (["university-scholarships", Number(id)] as const)
            : (["university", id] as const)
      queryClient.invalidateQueries({ queryKey: key })
      setDeleteTarget(null)
      setDeleteError(null)
    },
    onError: (err) => setDeleteError(err instanceof ApiError ? err.message : "Could not delete this."),
  })

  const university = useQuery({
    queryKey: ["university", id],
    queryFn: () => getUniversity(id),
  })

  const programs = useQuery({
    queryKey: ["university-programs", Number(id)],
    queryFn: () => listPrograms(id),
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

          {rep?.name && (
            <div className="mt-4 flex flex-wrap gap-8 border-t pt-4">
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
            </div>
          )}
        </div>
      </div>

      {/* Programs */}
      <Section title="Programs" action={addButton("Add program", "program")}>
        {programs.data?.data.length ? (
          <ul className="divide-y">
            {programs.data.data.map((program) => (
              <li key={program.id} className="group flex items-center justify-between py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">{program.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{program.level}</span>
                  {program.teaching_language && (
                    <span className="text-xs text-muted-foreground">· {program.teaching_language}</span>
                  )}
                  <span className="font-mono text-[11px] text-muted-foreground">#{program.id}</span>
                  {program.apply_link && (
                    <a
                      href={program.apply_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-cas-navy hover:underline"
                    >
                      Apply
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right text-muted-foreground tabular-nums">
                    {program.duration_months ? `${program.duration_months} mo · ` : ""}
                    {money(program.tuition_fee, program.currency)}/yr
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        aria-label={`Edit ${program.name}`}
                        onClick={() => setEditingProgram(program)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${program.name}`}
                        onClick={() => { setDeleteError(null); setDeleteTarget({ kind: "program", id: program.id, name: program.name }) }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No programs yet.</p>
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
                    {intake.program ? intake.program.name : "All programs"}
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
              <li key={scholarship.id} className="group flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{scholarship.name}</span>
                  {scholarship.type && <span className="ml-2 text-xs text-muted-foreground capitalize">{scholarship.type}</span>}
                  <p className="text-xs text-muted-foreground">
                    {[
                      scholarship.coverage,
                      scholarship.amount != null ? money(scholarship.amount, scholarship.currency) : null,
                      scholarship.deadline ? `Deadline ${new Date(scholarship.deadline).toLocaleDateString()}` : null,
                    ].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {scholarship.apply_link && (
                    <a href={scholarship.apply_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-cas-navy hover:underline">
                      Apply <ExternalLink className="size-3.5" />
                    </a>
                  )}
                  {canManage && (
                    <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button type="button" aria-label={`Edit ${scholarship.name}`} onClick={() => setEditingScholarship(scholarship)} className="text-muted-foreground hover:text-foreground">
                        <Pencil className="size-3.5" />
                      </button>
                      <button type="button" aria-label={`Delete ${scholarship.name}`} onClick={() => { setDeleteError(null); setDeleteTarget({ kind: "scholarship", id: scholarship.id, name: scholarship.name }) }} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No scholarships yet.</p>
        )}
      </Section>

      {/* Contacts */}
      <Section title="Contacts" action={addButton("Add contact", "contact")}>
        {uni.contacts.length ? (
          <ul className="divide-y">
            {uni.contacts.map((contact) => (
              <li key={contact.id} className="group flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{contact.name}</span>
                  {contact.role && <span className="ml-2 text-xs text-muted-foreground">{contact.role}</span>}
                  <p className="text-xs text-muted-foreground">
                    {[contact.email, contact.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button type="button" aria-label={`Edit ${contact.name}`} onClick={() => setEditingContact(contact)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="size-3.5" />
                    </button>
                    <button type="button" aria-label={`Delete ${contact.name}`} onClick={() => { setDeleteError(null); setDeleteTarget({ kind: "contact", id: contact.id, name: contact.name }) }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No contacts yet.</p>
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
                      {agreement.commission_type} · {agreement.program ? agreement.program.name : "All programs"}
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
      <ProgramFormDialog universityId={Number(id)} open={dialog === "program"} onOpenChange={(open) => !open && setDialog(null)} />
      <ProgramFormDialog universityId={Number(id)} program={editingProgram ?? undefined} open={editingProgram !== null} onOpenChange={(open) => !open && setEditingProgram(null)} />
      <AddIntakeDialog universityId={Number(id)} programs={programs.data?.data ?? []} open={dialog === "intake"} onOpenChange={(open) => !open && setDialog(null)} />
      <ScholarshipFormDialog universityId={Number(id)} open={dialog === "scholarship"} onOpenChange={(open) => !open && setDialog(null)} />
      <ScholarshipFormDialog universityId={Number(id)} scholarship={editingScholarship ?? undefined} open={editingScholarship !== null} onOpenChange={(open) => !open && setEditingScholarship(null)} />
      <AddAgreementDialog universityId={Number(id)} programs={programs.data?.data ?? []} open={dialog === "agreement"} onOpenChange={(open) => !open && setDialog(null)} />
      <ContactFormDialog universityId={Number(id)} open={dialog === "contact"} onOpenChange={(open) => !open && setDialog(null)} />
      <ContactFormDialog universityId={Number(id)} contact={editingContact ?? undefined} open={editingContact !== null} onOpenChange={(open) => !open && setEditingContact(null)} />
      <UniversityFormDialog open={editOpen} onOpenChange={setEditOpen} university={uni} />

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.kind}?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.name}” will be removed from the catalog. Existing records that reference it are unaffected.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
