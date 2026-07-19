import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Search, Trash2, TriangleAlert } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

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
import { listApplications, type ApplicationListItem } from "@/features/admissions/api"
import { createInvoice, getFeeSchedule, type NewInvoiceItem } from "@/features/finance/api"
import { money } from "@/features/finance/status"
import { ApiError } from "@/lib/api"

const FEE_TYPES = [
  { value: "tuition", label: "Tuition" },
  { value: "hostel", label: "Hostel" },
  { value: "service_charge", label: "Service charge" },
  { value: "admission_fee", label: "Admission fee" },
  { value: "visa_fee", label: "Visa fee" },
  { value: "other", label: "Other" },
]

interface Row extends NewInvoiceItem {
  currency_mismatch?: boolean
}

const BLANK_ROW: Row = { fee_type: "other", description: "", qty: 1, unit_price: 0 }

export default function NewInvoiceDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [app, setApp] = useState<ApplicationListItem | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [currency, setCurrency] = useState("CNY")
  const [dueDays, setDueDays] = useState("30")
  const [status, setStatus] = useState<"issued" | "draft">("issued")
  const [error, setError] = useState<string | null>(null)

  // Reset everything when the dialog opens.
  useEffect(() => {
    if (open) {
      setSearchInput(""); setQ(""); setApp(null); setRows([]); setCurrency("CNY")
      setDueDays("30"); setStatus("issued"); setError(null)
    }
  }, [open])

  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput), 300)

    return () => clearTimeout(t)
  }, [searchInput])

  const results = useQuery({
    queryKey: ["applications", { forInvoice: q }],
    queryFn: () => listApplications({ q, page: 1 }),
    enabled: open && !app && q.length > 1,
    placeholderData: keepPreviousData,
  })

  // Pull the proposed fee lines from the chosen application's course.
  const schedule = useQuery({
    queryKey: ["fee-schedule", app?.id],
    queryFn: () => getFeeSchedule(app!.id),
    enabled: Boolean(app),
  })

  useEffect(() => {
    const data = schedule.data?.data
    if (!data) return
    setCurrency(data.currency)
    setRows(
      data.lines.length > 0
        ? data.lines.map((l) => ({
            fee_type: l.fee_type, description: l.description, qty: l.qty,
            unit_price: l.unit_price, currency_mismatch: l.currency_mismatch,
          }))
        : [{ ...BLANK_ROW }],
    )
  }, [schedule.data])

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.qty) || 0) * (Number(r.unit_price) || 0), 0),
    [rows],
  )

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const mutation = useMutation({
    mutationFn: () =>
      createInvoice({
        party_type: "student",
        party_id: schedule.data!.data.party_id,
        application_id: app!.id,
        currency,
        status,
        due_days: Number(dueDays) || 0,
        items: rows
          .filter((r) => r.description.trim() && Number(r.unit_price) >= 0)
          .map((r) => ({
            fee_type: r.fee_type || null,
            description: r.description.trim(),
            qty: Number(r.qty) || 1,
            unit_price: Number(r.unit_price) || 0,
          })),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      onOpenChange(false)
      navigate(`/finance/${res.data.id}`)
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not create the invoice."),
  })

  const student = schedule.data?.data.context.student
  const canSubmit =
    Boolean(app) && rows.some((r) => r.description.trim()) && !mutation.isPending && !schedule.isFetching

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
          <DialogDescription>
            Pick a student's application — the fee lines are proposed from the course's fee structure. Adjust or add
            lines before issuing.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {/* Step 1: choose an application */}
        {!app && (
          <div>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by application code or student name…"
                className="bg-background pl-9"
                aria-label="Search applications"
              />
            </div>
            <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
              {q.length > 1 && (results.data?.data ?? []).length === 0 && !results.isFetching && (
                <p className="px-1 py-6 text-center text-sm text-muted-foreground">No applications found.</p>
              )}
              {(results.data?.data ?? []).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setApp(a)}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-subtle"
                >
                  <span>
                    <span className="font-medium">{a.student?.full_name ?? "—"}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{a.application_code}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {a.program?.name ?? a.scholarship?.name ?? ""}{a.university ? ` · ${a.university.name}` : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: review + edit the lines */}
        {app && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md bg-subtle px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{student ?? app.student?.full_name}</span>
                <span className="ml-2 text-muted-foreground">
                  {schedule.data?.data.context.program ?? app.program?.name}
                  {schedule.data?.data.context.scholarship ? ` · ${schedule.data.data.context.scholarship}` : ""}
                </span>
              </div>
              <button type="button" className="text-xs text-cas-navy hover:underline" onClick={() => { setApp(null); setRows([]) }}>
                Change
              </button>
            </div>

            {schedule.isFetching && <p className="text-sm text-muted-foreground">Loading course fees…</p>}

            {/* Lines */}
            <div className="space-y-2">
              <div className="grid grid-cols-[8rem_1fr_4rem_7rem_2rem] gap-2 px-1 text-xs font-medium text-muted-foreground">
                <span>Fee type</span><span>Description</span><span>Qty</span><span>Unit price</span><span />
              </div>
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[8rem_1fr_4rem_7rem_2rem] items-center gap-2">
                  <select
                    className="rounded-md border bg-background px-2 py-2 text-sm"
                    value={r.fee_type ?? "other"}
                    onChange={(e) => setRow(i, { fee_type: e.target.value })}
                    aria-label={`Fee type for line ${i + 1}`}
                  >
                    {FEE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <Input
                    value={r.description}
                    onChange={(e) => setRow(i, { description: e.target.value })}
                    placeholder="Description"
                    aria-label={`Description for line ${i + 1}`}
                  />
                  <Input
                    type="number" min={0.01} step="0.01"
                    value={String(r.qty ?? 1)}
                    onChange={(e) => setRow(i, { qty: Number(e.target.value) })}
                    aria-label={`Quantity for line ${i + 1}`}
                  />
                  <Input
                    type="number" min={0} step="0.01"
                    value={String(r.unit_price)}
                    onChange={(e) => setRow(i, { unit_price: Number(e.target.value) })}
                    aria-label={`Unit price for line ${i + 1}`}
                    className={r.currency_mismatch ? "border-amber-300" : undefined}
                  />
                  <Button type="button" size="icon" variant="ghost" aria-label={`Remove line ${i + 1}`} onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {rows.some((r) => r.currency_mismatch) && (
                <p className="flex items-center gap-1.5 px-1 text-xs text-amber-700">
                  <TriangleAlert className="size-3.5" /> A highlighted line's fee is in a different currency — confirm the amount.
                </p>
              )}
              <button type="button" onClick={() => setRows((rs) => [...rs, { ...BLANK_ROW }])} className="inline-flex items-center gap-1 px-1 text-xs font-medium text-cas-navy hover:underline">
                <Plus className="size-3.5" /> Add line
              </button>
            </div>

            {/* Settings + total */}
            <div className="grid grid-cols-3 gap-3 border-t pt-4">
              <label className="text-sm">
                <span className="mb-1.5 block text-muted-foreground">Currency</span>
                <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} className="uppercase" />
              </label>
              <label className="text-sm">
                <span className="mb-1.5 block text-muted-foreground">Due in (days)</span>
                <Input type="number" min={0} value={dueDays} onChange={(e) => setDueDays(e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="mb-1.5 block text-muted-foreground">Status</span>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as "issued" | "draft")}>
                  <option value="issued">Issue now</option>
                  <option value="draft">Save as draft</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-semibold text-cas-navy">{money(total, currency)}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={!canSubmit} onClick={() => { setError(null); mutation.mutate() }}>
            {mutation.isPending ? "Creating…" : status === "draft" ? "Save draft" : "Create & issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
