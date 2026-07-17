import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useCan } from "@/features/auth/useCan"
import {
  getCommission,
  payPayable,
  transitionCommission,
} from "@/features/finance/api"
import {
  COMMISSION_LADDER,
  COMMISSION_NEXT,
  COMMISSION_STATUS_BADGE,
  PAYABLE_STATUS_BADGE,
  label,
  money,
} from "@/features/finance/status"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function CommissionDetailPage() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const can = useCan()
  const canManage = can("commission.manage.global")

  const [error, setError] = useState<string | null>(null)
  const [reference, setReference] = useState("")
  const [transitionOpen, setTransitionOpen] = useState(false)
  const [payingId, setPayingId] = useState<number | null>(null)
  const [payoutRef, setPayoutRef] = useState("")

  const { data, isPending, isError } = useQuery({
    queryKey: ["commission", id],
    queryFn: () => getCommission(id),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["commission", id] })
    queryClient.invalidateQueries({ queryKey: ["commissions"] })
  }

  const transitionMutation = useMutation({
    mutationFn: (payload: { status: string; reference?: string }) => transitionCommission(id, payload),
    onSuccess: () => {
      setError(null)
      setTransitionOpen(false)
      setReference("")
      invalidate()
    },
    onError: (err) => {
      setTransitionOpen(false)
      setError(err instanceof ApiError ? err.message : "Transition failed.")
    },
  })

  const payoutMutation = useMutation({
    mutationFn: (payableId: number) => payPayable(payableId, { reference: payoutRef }),
    onSuccess: () => {
      setPayingId(null)
      setPayoutRef("")
      setError(null)
      invalidate()
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Payout failed."),
  })

  if (isPending) return <Skeleton className="h-72 w-full rounded-xl" />

  if (isError || !data) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-destructive">Commission not found or access denied.</p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link to="/commissions"><ArrowLeft className="size-4" /> Back to commissions</Link>
        </Button>
      </div>
    )
  }

  const commission = data.data
  const next = COMMISSION_NEXT[commission.status]
  const amounts = [
    ["Expected", commission.expected_amount],
    ["Eligible", commission.eligible_amount],
    ["Invoiced", commission.invoiced_amount],
    ["Received", commission.received_amount],
  ] as const

  const startTransition = () => {
    if (next === "received") {
      setTransitionOpen(true) // ask for the bank reference

      return
    }
    if (next) transitionMutation.mutate({ status: next })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to="/commissions" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-3.5" /> Commissions
            </Link>
            <h2 className="mt-1 text-2xl font-semibold text-cas-navy">
              {commission.application?.student?.full_name ?? "Commission"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {commission.application?.application_code} · {commission.university?.name}
              {commission.agreement && (
                <> · {commission.agreement.commission_type === "percent"
                  ? `${Number(commission.agreement.commission_value)}%`
                  : `${money(commission.agreement.commission_value)} fixed`}</>
              )}
            </p>
          </div>
          <Badge variant="outline" className={cn("border-transparent capitalize", COMMISSION_STATUS_BADGE[commission.status])}>
            {label(commission.status)}
          </Badge>
        </div>

        {/* Mini stepper */}
        <ol className="mt-5 flex flex-wrap items-center gap-1.5 border-t pt-5">
          {COMMISSION_LADDER.map((step, index) => {
            const currentIndex = COMMISSION_LADDER.indexOf(commission.status as never)
            const reached = index <= currentIndex
            const isCurrent = step === commission.status

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
          {amounts.map(([title, value]) => (
            <div key={title} className="rounded-lg bg-subtle p-3">
              <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{title}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{money(value, commission.currency)}</p>
            </div>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {canManage && next && (
          <Button className="mt-4" size="sm" disabled={transitionMutation.isPending} onClick={startTransition}>
            <ArrowRight className="size-4" />
            {transitionMutation.isPending ? "Working…" : <>Move to <span className="capitalize">{label(next)}</span></>}
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Agent payables */}
        <section className="rounded-xl border bg-card shadow-sm">
          <header className="border-b px-5 py-3"><h3 className="text-[15px] font-semibold">Agent payables</h3></header>
          <div className="divide-y px-5">
            {(commission.payables?.length ?? 0) === 0 && (
              <p className="py-5 text-sm text-muted-foreground">
                Payables are computed when the commission is received.
              </p>
            )}
            {commission.payables?.map((payable) => (
              <div key={payable.id} className="py-3">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{payable.agent?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {payable.agent?.agent_code} · <span className="capitalize">{payable.agent?.type?.replace("_", "-")}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">{money(payable.amount, payable.currency)}</span>
                    <Badge variant="outline" className={cn("border-transparent capitalize", PAYABLE_STATUS_BADGE[payable.status])}>
                      {payable.status}
                    </Badge>
                    {canManage && payable.status === "payable" && (
                      <Button size="sm" variant="secondary" onClick={() => setPayingId(payable.id)}>Pay</Button>
                    )}
                  </div>
                </div>

                {payingId === payable.id && (
                  <div className="mt-2 flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`payout-ref-${payable.id}`} className="text-xs">Payout reference</Label>
                      <Input
                        id={`payout-ref-${payable.id}`}
                        value={payoutRef}
                        onChange={(e) => setPayoutRef(e.target.value)}
                        placeholder="BANK-OUT-…"
                      />
                    </div>
                    <Button size="sm" disabled={!payoutRef || payoutMutation.isPending} onClick={() => payoutMutation.mutate(payable.id)}>
                      {payoutMutation.isPending ? "Paying…" : "Confirm"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPayingId(null)}>Cancel</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* History */}
        <section className="rounded-xl border bg-card shadow-sm">
          <header className="border-b px-5 py-3"><h3 className="text-[15px] font-semibold">History</h3></header>
          <ol className="divide-y px-5">
            {commission.status_history?.map((entry, index) => (
              <li key={index} className="py-2.5 text-sm">
                <p className="capitalize">
                  {entry.from_status ? `${label(entry.from_status)} → ` : ""}
                  <span className="font-medium">{label(entry.to_status)}</span>
                  {entry.amount != null && (
                    <span className="ml-2 text-muted-foreground tabular-nums">{money(entry.amount, commission.currency)}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.changed_by ?? "System"}
                  {entry.created_at ? ` · ${new Date(entry.created_at).toLocaleString()}` : ""}
                  {entry.reference ? ` · ${entry.reference}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Received reference dialog */}
      <Dialog open={transitionOpen} onOpenChange={setTransitionOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as received</DialogTitle>
            <DialogDescription>
              Records the payment against the university invoice and computes
              agent payables. Provide the bank reference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="received-ref">Bank reference</Label>
            <Input id="received-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="BANK-REF-…" />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setTransitionOpen(false)}>Cancel</Button>
            <Button
              disabled={!reference || transitionMutation.isPending}
              onClick={() => transitionMutation.mutate({ status: "received", reference })}
            >
              {transitionMutation.isPending ? "Saving…" : "Confirm received"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
