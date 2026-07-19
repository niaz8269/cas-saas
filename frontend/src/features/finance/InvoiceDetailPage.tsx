import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, FileText, Plus } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useCan } from "@/features/auth/useCan"
import { getInvoice, getInvoicePdf, recordInvoicePayment } from "@/features/finance/api"
import { INVOICE_STATUS_BADGE, label, money } from "@/features/finance/status"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function InvoiceDetailPage() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const can = useCan()
  const canManage = can("finance.manage.global")

  const [payOpen, setPayOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("bank_transfer")
  const [reference, setReference] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { data, isPending, isError } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => getInvoice(id),
  })

  const payMutation = useMutation({
    mutationFn: () =>
      recordInvoicePayment(id, {
        amount: Number(amount),
        method,
        reference: reference || undefined,
      }),
    onSuccess: () => {
      setPayOpen(false)
      setAmount("")
      setReference("")
      setError(null)
      queryClient.invalidateQueries({ queryKey: ["invoice", id] })
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Payment failed."),
  })

  const pdfMutation = useMutation({
    mutationFn: () => getInvoicePdf(id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener")
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not generate the PDF."),
  })

  if (isPending) return <Skeleton className="h-72 w-full rounded-xl" />

  if (isError || !data) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-destructive">Invoice not found or access denied.</p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link to="/finance"><ArrowLeft className="size-4" /> Back to finance</Link>
        </Button>
      </div>
    )
  }

  const invoice = data.data
  const remaining = Number(invoice.total) - Number(invoice.amount_paid)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to="/finance" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-3.5" /> Finance
            </Link>
            <h2 className="mt-1 font-mono text-2xl font-semibold text-cas-navy">{invoice.invoice_no}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="capitalize">{invoice.party_type}</span>: {invoice.party_name ?? "—"}
              {invoice.application ? ` · ${invoice.application.application_code}` : ""}
            </p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className={cn("border-transparent capitalize", INVOICE_STATUS_BADGE[invoice.status])}>
              {label(invoice.status)}
            </Badge>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{money(invoice.total, invoice.currency)}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              paid {money(invoice.amount_paid, invoice.currency)}
              {remaining > 0 ? ` · due ${money(remaining, invoice.currency)}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={pdfMutation.isPending}
            onClick={() => pdfMutation.mutate()}
          >
            <FileText className="size-4" /> {pdfMutation.isPending ? "Preparing…" : "PDF"}
          </Button>
          {canManage && remaining > 0 && invoice.status !== "cancelled" && (
            <Button size="sm" onClick={() => { setAmount(String(remaining)); setPayOpen(true) }}>
              <Plus className="size-4" /> Record payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card shadow-sm">
          <header className="border-b px-5 py-3"><h3 className="text-[15px] font-semibold">Items</h3></header>
          <div className="divide-y px-5">
            {invoice.items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                <span>
                  {item.description}
                  {item.fee_type && (
                    <span className="ml-2 rounded bg-cas-navy-50 px-1.5 py-0.5 text-xs text-cas-navy capitalize">
                      {item.fee_type.replace(/_/g, " ")}
                    </span>
                  )}
                </span>
                <span className="tabular-nums">{money(item.amount, invoice.currency)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card shadow-sm">
          <header className="border-b px-5 py-3"><h3 className="text-[15px] font-semibold">Payments</h3></header>
          <div className="divide-y px-5">
            {(invoice.payments?.length ?? 0) === 0 && (
              <p className="py-5 text-sm text-muted-foreground">No payments recorded.</p>
            )}
            {invoice.payments?.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{payment.payment_no}</p>
                  <p className="text-xs text-muted-foreground">
                    {[payment.method, payment.reference, payment.recorded_by].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="font-medium tabular-nums">{money(payment.amount, invoice.currency)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {error && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount ({invoice.currency}) — remaining {money(remaining)}</Label>
              <Input id="pay-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-method">Method</Label>
              <Input id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-ref">Reference</Label>
              <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TXN-…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button disabled={!amount || payMutation.isPending} onClick={() => payMutation.mutate()}>
              {payMutation.isPending ? "Saving…" : "Record payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
