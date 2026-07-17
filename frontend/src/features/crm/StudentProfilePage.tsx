import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Bot,
  Mail,
  Phone,
  RefreshCw,
  StickyNote,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { listApplications } from "@/features/admissions/api"
import { APPLICATION_STATUS_BADGE, statusLabel } from "@/features/admissions/status"
import { useCan } from "@/features/auth/useCan"
import { addNote, getStudent, getTimeline, updateStudent } from "@/features/crm/api"
import GuardiansEditor from "@/features/crm/GuardiansEditor"
import SendMessageDialog from "@/features/crm/SendMessageDialog"
import { STUDENT_STATUS_BADGE, STUDENT_STATUSES } from "@/features/crm/status"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

const ACTIVITY_ICON: Record<string, LucideIcon> = {
  note: StickyNote,
  call: Phone,
  email: Mail,
  status: RefreshCw,
  system: Bot,
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || "—"}</dd>
    </div>
  )
}

export default function StudentProfilePage() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const can = useCan()
  const canUpdate = can("students.update.assigned") || can("students.update.global")

  const [note, setNote] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)

  const student = useQuery({ queryKey: ["student", id], queryFn: () => getStudent(id) })
  const timeline = useQuery({ queryKey: ["student-timeline", id], queryFn: () => getTimeline(id) })
  const applications = useQuery({
    queryKey: ["student-applications", id],
    queryFn: () => listApplications({ student_id: Number(id) }),
    enabled: can("applications.view.assigned") || can("applications.view.global"),
  })

  const noteMutation = useMutation({
    mutationFn: () => addNote(id, note),
    onSuccess: () => {
      setNote("")
      setActionError(null)
      queryClient.invalidateQueries({ queryKey: ["student-timeline", id] })
    },
    onError: (error) =>
      setActionError(error instanceof ApiError ? error.message : "Could not add the note."),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateStudent(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["student", id] }),
    onError: (error) =>
      setActionError(error instanceof ApiError ? error.message : "Update failed."),
  })

  if (student.isPending) {
    return <Skeleton className="h-72 w-full rounded-xl" />
  }

  if (student.isError || !student.data) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-destructive">Student not found or access denied.</p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link to="/students"><ArrowLeft className="size-4" /> Back to students</Link>
        </Button>
      </div>
    )
  }

  const s = student.data.data
  const activities = timeline.data?.data ?? []

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Identity card */}
      <div className="space-y-4 lg:col-span-1">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Link
            to="/students"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Students
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-cas-navy">{s.full_name}</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{s.student_code}</span>
            <Badge
              variant="outline"
              className={cn("border-transparent capitalize", STUDENT_STATUS_BADGE[s.status])}
            >
              {s.status.replace("_", " ")}
            </Badge>
          </div>

          {actionError && (
            <p role="alert" className="mt-3 rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">
              {actionError}
            </p>
          )}

          <dl className="mt-5 space-y-3 border-t pt-4">
            <Field label="Email" value={s.email} />
            <Field label="Phone" value={s.phone} />
            <Field label="Passport" value={s.passport_no} />
            <Field label="Date of birth" value={s.dob} />
            <Field label="Country" value={s.country?.name} />
            <Field label="Branch" value={s.branch ? `${s.branch.name} (${s.branch.code})` : null} />
            <Field label="Counselor" value={s.counselor?.name} />
            <Field label="Agent" value={s.agent ? `${s.agent.name} (${s.agent.agent_code})` : null} />
          </dl>

          <GuardiansEditor studentId={id} guardians={s.guardians ?? []} canEdit={canUpdate} />

          {(applications.data?.data.length ?? 0) > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Applications</p>
              <ul className="mt-2 space-y-2">
                {applications.data!.data.map((application) => (
                  <li key={application.id}>
                    <Link
                      to={`/applications/${application.id}`}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <span>
                        <span className="font-mono text-xs text-muted-foreground">{application.application_code}</span>
                        <span className="ml-2">{application.university?.code}</span>
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("border-transparent text-xs capitalize", APPLICATION_STATUS_BADGE[application.status])}
                      >
                        {statusLabel(application.status)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canUpdate && (
            <div className="mt-4 border-t pt-4">
              <Label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Status
              </Label>
              <Select
                value={s.status}
                onValueChange={(value) => statusMutation.mutate(value)}
                disabled={statusMutation.isPending}
              >
                <SelectTrigger className="mt-1.5 w-full" aria-label="Student status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status} className="capitalize">
                      {status.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mt-4 border-t pt-4">
            <SendMessageDialog studentId={id} />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border bg-card shadow-sm">
          <header className="border-b px-5 py-3">
            <h3 className="text-[15px] font-semibold">Timeline</h3>
          </header>

          <div className="px-5 py-4">
            {canUpdate && (
              <form
                className="mb-5"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (note.trim()) noteMutation.mutate()
                }}
              >
                <Label htmlFor="new-note" className="sr-only">Add a note</Label>
                <Textarea
                  id="new-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add a note to the timeline…"
                  rows={2}
                />
                <div className="mt-2 flex justify-end">
                  <Button type="submit" size="sm" disabled={!note.trim() || noteMutation.isPending}>
                    {noteMutation.isPending ? "Saving…" : "Add note"}
                  </Button>
                </div>
              </form>
            )}

            {timeline.isPending && <Skeleton className="h-32 w-full" />}

            {!timeline.isPending && activities.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No activity yet.
              </p>
            )}

            <ol className="relative space-y-5 before:absolute before:top-1 before:bottom-1 before:left-[15px] before:w-px before:bg-border">
              {activities.map((activity) => {
                const Icon = ACTIVITY_ICON[activity.type] ?? StickyNote

                return (
                  <li key={activity.id} className="relative flex gap-4 pl-0">
                    <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background">
                      <Icon className="size-3.5 text-cas-navy" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 pt-1">
                      <p className="text-sm">{activity.body}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {activity.user?.name ?? "System"}
                        {" · "}
                        {activity.created_at ? new Date(activity.created_at).toLocaleString() : ""}
                        {" · "}
                        <span className="capitalize">{activity.type}</span>
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
