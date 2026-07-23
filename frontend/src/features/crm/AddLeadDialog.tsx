import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea"
import { useCan } from "@/features/auth/useCan"
import { createLead, listLeadSources, listStaff } from "@/features/crm/api"
import { ApiError } from "@/lib/api"
import { useAuthStore } from "@/stores/auth"

const EMPTY = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  marketing_source_id: "",
  intake_route: "info",
  assigned_user_id: "",
  message: "",
}

/** Staff "add a lead" form (admin / counselor / marketing). */
export default function AddLeadDialog() {
  const can = useCan()
  const userId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [error, setError] = useState<string | null>(null)

  const canAssign = can("leads.assign.global")
  const sources = useQuery({ queryKey: ["lead-sources"], queryFn: listLeadSources, enabled: open })
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => listStaff(), enabled: open && canAssign })

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const mutation = useMutation({
    mutationFn: () => {
      // Counselors (no assign permission) can't pick an assignee — the lead
      // is assigned to them so it lands in their own pipeline.
      const assigned = canAssign
        ? (form.assigned_user_id ? Number(form.assigned_user_id) : null)
        : (userId ?? null)

      return createLead({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        marketing_source_id: form.marketing_source_id ? Number(form.marketing_source_id) : null,
        assigned_user_id: assigned,
        intake_route: form.intake_route as "info" | "full",
        message: form.message.trim() || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      setForm({ ...EMPTY })
      setError(null)
      setOpen(false)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not add the lead."),
  })

  const canSubmit = form.first_name.trim() !== "" && (form.email.trim() !== "" || form.phone.trim() !== "")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4" /> New lead</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a lead</DialogTitle>
          <DialogDescription>Capture a prospective student — they enter your leads pipeline.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" htmlFor="lead-first-name" required><Input id="lead-first-name" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
            <Field label="Last name" htmlFor="lead-last-name"><Input id="lead-last-name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
            <Field label="Email" htmlFor="lead-email"><Input id="lead-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Phone" htmlFor="lead-phone"><Input id="lead-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          </div>
          <p className="text-xs text-muted-foreground">Provide at least an email or a phone number.</p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Source">
              <Select value={form.marketing_source_id} onValueChange={(v) => set("marketing_source_id", v)}>
                <SelectTrigger aria-label="Source"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {sources.data?.data.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Interest">
              <Select value={form.intake_route} onValueChange={(v) => set("intake_route", v)}>
                <SelectTrigger aria-label="Interest"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Just enquiring</SelectItem>
                  <SelectItem value="full">Ready to apply</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {canAssign && (
            <Field label="Assign to (optional)">
              <Select value={form.assigned_user_id} onValueChange={(v) => set("assigned_user_id", v)}>
                <SelectTrigger aria-label="Assign to"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {staff.data?.data.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Message / notes" htmlFor="lead-message">
            <Textarea id="lead-message" rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Adding…" : "Add lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, htmlFor, required, children }: { label: string; htmlFor?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  )
}
