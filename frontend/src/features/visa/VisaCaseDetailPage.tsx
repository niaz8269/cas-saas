import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, CalendarClock, Check, UserCheck, X } from "lucide-react"
import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useCan } from "@/features/auth/useCan"
import {
  assignVisaOfficer,
  getVisaCase,
  listVisaOfficers,
  transitionVisaCase,
  updateVisaChecklistItem,
} from "@/features/visa/api"
import {
  CHECKLIST_STATUS_BADGE,
  VISA_LADDER,
  VISA_NEXT,
  VISA_STATUS_BADGE,
  label,
} from "@/features/visa/status"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const missing = err.payload.missing
    if (Array.isArray(missing) && missing.length > 0) {
      return `Checklist incomplete — still pending: ${missing.join(", ")}`
    }

    return err.message
  }

  return "Something went wrong."
}

export default function VisaCaseDetailPage() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const can = useCan()
  const canManage = can("visa.manage.global")

  const [error, setError] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedOfficer, setSelectedOfficer] = useState("")
  const [appointmentOpen, setAppointmentOpen] = useState(false)
  const [appointmentDate, setAppointmentDate] = useState("")

  const { data, isPending, isError } = useQuery({
    queryKey: ["visa-case", id],
    queryFn: () => getVisaCase(id),
  })

  const officers = useQuery({
    queryKey: ["visa-officers"],
    queryFn: listVisaOfficers,
    enabled: assignOpen,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["visa-case", id] })
    queryClient.invalidateQueries({ queryKey: ["visa-cases"] })
  }

  const transitionMutation = useMutation({
    mutationFn: (payload: { status: string; appointment_at?: string }) => transitionVisaCase(id, payload),
    onSuccess: () => { setError(null); setAppointmentOpen(false); setAppointmentDate(""); invalidate() },
    onError: (err) => setError(errorMessage(err)),
  })

  const assignMutation = useMutation({
    mutationFn: (userId: number) => assignVisaOfficer(id, userId),
    onSuccess: () => { setError(null); setAssignOpen(false); setSelectedOfficer(""); invalidate() },
    onError: (err) => setError(errorMessage(err)),
  })

  // Booking an appointment prompts for the date; every other move is immediate.
  const startTransition = (next: string) => {
    if (next === "appointment_booked") setAppointmentOpen(true)
    else transitionMutation.mutate({ status: next })
  }

  const checklistMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: number; status: "received" | "verified" }) =>
      updateVisaChecklistItem(id, itemId, { status }),
    onSuccess: () => { setError(null); invalidate() },
    onError: (err) => setError(errorMessage(err)),
  })

  if (isPending) return <Skeleton className="h-72 w-full rounded-xl" />

  if (isError || !data) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-destructive">Visa case not found or access denied.</p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link to="/visa"><ArrowLeft className="size-4" /> Back to visa cases</Link>
        </Button>
      </div>
    )
  }

  const visaCase = data.data
  const nextStatuses = VISA_NEXT[visaCase.status] ?? []
  // Rejected sits off the happy path: chips stay reached up to `submitted`.
  const reachedIndex = visaCase.status === "rejected"
    ? VISA_LADDER.indexOf("submitted")
    : VISA_LADDER.indexOf(visaCase.status as (typeof VISA_LADDER)[number])
  const milestones = [
    ["Appointment", visaCase.appointment_at],
    ["Submitted", visaCase.submitted_at],
    ["Decision", visaCase.decision_at],
    ["Travel ready", visaCase.travel_ready_at],
  ] as const

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to="/visa" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-3.5" /> Visa cases
            </Link>
            <h2 className="mt-1 text-2xl font-semibold text-cas-navy">
              {visaCase.student?.full_name ?? "Visa case"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {visaCase.application?.application_code}
              {visaCase.application?.university ? ` · ${visaCase.application.university.name}` : ""}
              {" · "}
              {visaCase.officer ? `Officer: ${visaCase.officer.name}` : "Unassigned"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className={cn("border-transparent capitalize", VISA_STATUS_BADGE[visaCase.status])}>
              {label(visaCase.status)}
            </Badge>
            {canManage && (
              <Button variant="secondary" size="sm" onClick={() => setAssignOpen(true)}>
                <UserCheck className="size-4" />
                {visaCase.officer ? "Reassign" : "Assign officer"}
              </Button>
            )}
          </div>
        </div>

        {/* Mini stepper */}
        <ol className="mt-5 flex flex-wrap items-center gap-1.5 border-t pt-5">
          {VISA_LADDER.map((step, index) => {
            const reached = index <= reachedIndex
            const isCurrent = step === visaCase.status

            return (
              <li key={step} className="flex items-center gap-1.5">
                {index > 0 && <span className="h-px w-4 bg-border" aria-hidden="true" />}
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                  isCurrent ? "bg-cas-navy text-white" : reached ? "bg-cas-navy-50 text-cas-navy" : "bg-muted text-muted-foreground",
                )}>
                  {reached && !isCurrent && <Check className="size-3" aria-hidden="true" />}
                  {label(step)}
                </span>
              </li>
            )
          })}
        </ol>

        <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-4">
          {milestones.map(([title, value]) => (
            <div key={title} className="rounded-lg bg-subtle p-3">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{title}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {value ? new Date(value).toLocaleDateString() : "—"}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {canManage && nextStatuses.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {nextStatuses.map((next) => (
              <Button
                key={next}
                size="sm"
                variant={next === "rejected" ? "destructive" : "default"}
                disabled={transitionMutation.isPending}
                onClick={() => startTransition(next)}
              >
                {next === "rejected" ? <X className="size-4" /> : <ArrowRight className="size-4" />}
                {transitionMutation.isPending
                  ? "Working…"
                  : <>Move to <span className="capitalize">{label(next)}</span></>}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Checklist */}
        <section className="rounded-xl border bg-card shadow-sm">
          <header className="border-b px-5 py-3"><h3 className="text-[15px] font-semibold">Document checklist</h3></header>
          <div className="divide-y px-5">
            {(visaCase.checklist?.length ?? 0) === 0 && (
              <p className="py-5 text-sm text-muted-foreground">No checklist items.</p>
            )}
            {visaCase.checklist?.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.is_required ? "Required" : "Optional"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("border-transparent capitalize", CHECKLIST_STATUS_BADGE[item.status])}>
                    {item.status}
                  </Badge>
                  {canManage && item.status === "pending" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={checklistMutation.isPending}
                      onClick={() => checklistMutation.mutate({ itemId: item.id, status: "received" })}
                    >
                      Mark received
                    </Button>
                  )}
                  {canManage && item.status === "received" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={checklistMutation.isPending}
                      onClick={() => checklistMutation.mutate({ itemId: item.id, status: "verified" })}
                    >
                      Verify
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* History */}
        <section className="rounded-xl border bg-card shadow-sm">
          <header className="border-b px-5 py-3"><h3 className="text-[15px] font-semibold">History</h3></header>
          <ol className="divide-y px-5">
            {(visaCase.status_history?.length ?? 0) === 0 && (
              <p className="py-5 text-sm text-muted-foreground">No history yet.</p>
            )}
            {visaCase.status_history?.map((entry, index) => (
              <li key={index} className="py-2.5 text-sm">
                <p className="capitalize">
                  {entry.from_status ? `${label(entry.from_status)} → ` : ""}
                  <span className="font-medium">{label(entry.to_status)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.changed_by ?? "System"}
                  {entry.created_at ? ` · ${new Date(entry.created_at).toLocaleString()}` : ""}
                  {entry.note ? ` · ${entry.note}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Assign officer */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign visa officer</DialogTitle>
            <DialogDescription>The officer owns this case through to travel-ready.</DialogDescription>
          </DialogHeader>

          <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
            <SelectTrigger aria-label="Select officer">
              <SelectValue placeholder={officers.isPending ? "Loading officers…" : "Select an officer"} />
            </SelectTrigger>
            <SelectContent>
              {(officers.data?.data ?? []).map((officer) => (
                <SelectItem key={officer.id} value={String(officer.id)}>{officer.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedOfficer || assignMutation.isPending}
              onClick={() => assignMutation.mutate(Number(selectedOfficer))}
            >
              {assignMutation.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book appointment */}
      <Dialog open={appointmentOpen} onOpenChange={setAppointmentOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Book appointment</DialogTitle>
            <DialogDescription>Set the embassy appointment date for this case.</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="appointment-date">Appointment date</Label>
            <Input
              id="appointment-date"
              type="date"
              value={appointmentDate}
              onChange={(event) => setAppointmentDate(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setAppointmentOpen(false)}>Cancel</Button>
            <Button
              disabled={!appointmentDate || transitionMutation.isPending}
              onClick={() => transitionMutation.mutate({ status: "appointment_booked", appointment_at: appointmentDate })}
            >
              <CalendarClock className="size-4" />
              {transitionMutation.isPending ? "Booking…" : "Book appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
