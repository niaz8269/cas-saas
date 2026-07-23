import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, UserCheck, UserPlus } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

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
import { assignLead, convertLead, getLead, listStaff, updateLead } from "@/features/crm/api"
import LeadTimeline from "@/features/crm/LeadTimeline"
import { LEAD_EDITABLE_STATUSES, LEAD_STATUS_BADGE } from "@/features/crm/status"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || "—"}</dd>
    </div>
  )
}

export default function LeadDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const can = useCan()

  const [assignOpen, setAssignOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<string>("")
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isPending, isError } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => getLead(id),
  })

  const staffQuery = useQuery({
    queryKey: ["staff-directory"],
    queryFn: () => listStaff(),
    enabled: assignOpen,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["lead", id] })
    queryClient.invalidateQueries({ queryKey: ["leads"] })
  }

  const assignMutation = useMutation({
    mutationFn: () => assignLead(id, Number(selectedStaff)),
    onSuccess: () => {
      invalidate()
      setAssignOpen(false)
      setActionError(null)
    },
    onError: (error) =>
      setActionError(error instanceof ApiError ? error.message : "Assignment failed."),
  })

  const convertMutation = useMutation({
    mutationFn: () => convertLead(id),
    onSuccess: (result) => navigate(`/students/${result.data.id}`),
    onError: (error) => {
      setConvertOpen(false)
      setActionError(error instanceof ApiError ? error.message : "Conversion failed.")
    },
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateLead(id, { status }),
    onSuccess: invalidate,
    onError: (error) =>
      setActionError(error instanceof ApiError ? error.message : "Update failed."),
  })

  if (isPending) {
    return <Skeleton className="h-64 w-full rounded-xl" />
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-destructive">Lead not found or access denied.</p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link to="/leads"><ArrowLeft className="size-4" /> Back to leads</Link>
        </Button>
      </div>
    )
  }

  const lead = data.data
  const isClosed = ["converted", "duplicate"].includes(lead.status)
  const canConvert = can("leads.convert.assigned") && !isClosed
  const canAssign = can("leads.assign.global") && !isClosed
  const canUpdate = (can("leads.update.assigned") || can("leads.update.global")) && !isClosed

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              to="/leads"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Leads
            </Link>
            <h2 className="mt-1 text-2xl font-semibold text-cas-navy">
              {lead.full_name || lead.email || `Lead #${lead.id}`}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("border-transparent capitalize", LEAD_STATUS_BADGE[lead.status])}
              >
                {lead.status}
              </Badge>
              {lead.form_type && (
                <Badge variant="outline" className="border-transparent bg-cas-navy-50 text-cas-navy capitalize">
                  {lead.form_type.replace(/_/g, " ")}
                </Badge>
              )}
              {lead.review && (
                <Badge variant="outline" className="border-transparent bg-amber-50 text-amber-700">
                  needs dedup review
                </Badge>
              )}
              {lead.student_id && (
                <Link to={`/students/${lead.student_id}`} className="text-sm text-cas-navy underline-offset-2 hover:underline">
                  View student record →
                </Link>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {canAssign && (
              <Button variant="secondary" onClick={() => setAssignOpen(true)}>
                <UserCheck className="size-4" />
                Assign
              </Button>
            )}
            {canConvert && (
              <Button onClick={() => setConvertOpen(true)}>
                <UserPlus className="size-4" />
                Convert to student
              </Button>
            )}
          </div>
        </div>

        {actionError && (
          <p role="alert" className="mt-4 rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">
            {actionError}
          </p>
        )}

        <dl className="mt-6 grid gap-x-8 gap-y-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Email" value={lead.email} />
          <Field label="Phone" value={lead.phone} />
          <Field label="Country" value={lead.country?.name} />
          <Field label="Source" value={lead.marketing_source?.name} />
          <Field label="Source website" value={lead.website_source?.domain} />
          <Field label="Campaign" value={lead.campaign?.name} />
          <Field label="Intake route" value={lead.intake_route} />
          <Field label="Assignee" value={lead.assignee?.name ?? "Unassigned"} />
          <Field label="Received" value={lead.created_at ? new Date(lead.created_at).toLocaleString() : null} />
        </dl>

        {lead.message && (
          <div className="mt-5 rounded-lg bg-subtle p-4 text-sm">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Message</p>
            <p className="mt-1">{lead.message}</p>
          </div>
        )}

        {Object.keys(lead.form_fields ?? {}).length > 0 && (
          <div className="mt-5 rounded-lg bg-subtle p-4 text-sm">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Form submission</p>
            <dl className="mt-2 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {Object.entries(lead.form_fields).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs text-muted-foreground capitalize">{key.replace(/[_-]+/g, " ")}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {canUpdate && (
          <div className="mt-5 flex items-center gap-3 border-t pt-5">
            <Label className="text-sm text-muted-foreground">Update status</Label>
            <Select
              value={lead.status}
              onValueChange={(value) => statusMutation.mutate(value)}
              disabled={statusMutation.isPending}
            >
              <SelectTrigger className="w-40" aria-label="Lead status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_EDITABLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <LeadTimeline leadId={id} canUpdate={canUpdate} />

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign lead</DialogTitle>
            <DialogDescription>
              The counselor gets a follow-up task due in 48 hours.
            </DialogDescription>
          </DialogHeader>

          <Select value={selectedStaff} onValueChange={setSelectedStaff}>
            <SelectTrigger aria-label="Select counselor">
              <SelectValue placeholder={staffQuery.isPending ? "Loading staff…" : "Select a counselor"} />
            </SelectTrigger>
            <SelectContent>
              {(staffQuery.data?.data ?? []).map((staff) => (
                <SelectItem key={staff.id} value={String(staff.id)}>{staff.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedStaff || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              {assignMutation.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert confirm */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Convert to student</DialogTitle>
            <DialogDescription>
              Creates the permanent student record and closes this lead. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button
              disabled={convertMutation.isPending}
              onClick={() => convertMutation.mutate()}
            >
              {convertMutation.isPending ? "Converting…" : "Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
