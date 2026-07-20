import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Banknote } from "lucide-react"
import { useState } from "react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCan } from "@/features/auth/useCan"
import { listPayables, payPayable, type PayableItemData } from "@/features/finance/api"
import { PAYABLE_STATUS_BADGE, label, money } from "@/features/finance/status"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function AgentPayablesPage() {
  const can = useCan()
  const canPay = can("commission.manage.global")
  const queryClient = useQueryClient()

  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [payable, setPayable] = useState<PayableItemData | null>(null)
  const [reference, setReference] = useState("")
  const [method, setMethod] = useState("bank_transfer")
  const [error, setError] = useState<string | null>(null)

  const { data, isPending, isError } = useQuery({
    queryKey: ["agent-payables", { status, page }],
    queryFn: () => listPayables({ status: status === "all" ? undefined : status, page }),
    placeholderData: keepPreviousData,
  })

  const payMutation = useMutation({
    mutationFn: () => payPayable(payable!.id, { reference: reference.trim(), method }),
    onSuccess: () => {
      setPayable(null)
      setReference("")
      setError(null)
      queryClient.invalidateQueries({ queryKey: ["agent-payables"] })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not record the payout."),
  })

  if (isError) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
        <Banknote className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Access denied</p>
        <p className="mt-1 text-sm text-muted-foreground">You need commission access to view agent payables.</p>
      </div>
    )
  }

  const payables = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Agent payables</h1>
        <p className="mt-1 text-sm text-muted-foreground">Commission owed to agents, and the payouts recorded against it.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-40 bg-background" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="payable">Payable</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Computed</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 6 }).map((_, c) => <TableCell key={c}><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>
            ))}
            {!isPending && payables.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No agent payables.</TableCell></TableRow>
            )}
            {payables.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <p className="font-medium">{p.agent?.name ?? "—"}</p>
                  <p className="font-mono text-xs text-muted-foreground">{p.agent?.agent_code}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.student?.full_name ?? "—"}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{money(p.amount, p.currency)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border-transparent capitalize", PAYABLE_STATUS_BADGE[p.status])}>
                    {label(p.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {p.computed_at ? new Date(p.computed_at).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {canPay && p.status === "payable" && (
                    <Button size="sm" variant="secondary" onClick={() => { setError(null); setReference(""); setPayable(p) }}>
                      Record payout
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {meta && meta.total > 0 && meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{meta.from}–{meta.to} of {meta.total}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={meta.current_page <= 1} onClick={() => setPage((prev) => prev - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((prev) => prev + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={payable !== null} onOpenChange={(open) => !open && setPayable(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record payout{payable ? ` — ${money(payable.amount, payable.currency)}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {error && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}
            <p className="text-sm text-muted-foreground">
              Paying {payable?.agent?.name}. A reference is kept as payout evidence.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="payout-method">Method</Label>
              <Input id="payout-method" value={method} onChange={(e) => setMethod(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payout-ref">Reference</Label>
              <Input id="payout-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TXN-…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPayable(null)}>Cancel</Button>
            <Button disabled={!reference.trim() || payMutation.isPending} onClick={() => payMutation.mutate()}>
              {payMutation.isPending ? "Saving…" : "Record payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
