import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Plus, Receipt, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { listInvoices } from "@/features/finance/api"
import NewInvoiceDialog from "@/features/finance/NewInvoiceDialog"
import { INVOICE_STATUS_BADGE, label, money } from "@/features/finance/status"
import { cn } from "@/lib/utils"

const INVOICE_STATUSES = ["draft", "issued", "partially_paid", "paid", "cancelled", "overdue"]

export default function FinancePage() {
  const navigate = useNavigate()
  const can = useCan()
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const [partyType, setPartyType] = useState("all")
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput)
      setPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["invoices", { q, status, partyType, page }],
    queryFn: () =>
      listInvoices({
        q: q || undefined,
        status: status === "all" ? undefined : status,
        party_type: partyType === "all" ? undefined : partyType,
        page,
      }),
    placeholderData: keepPreviousData,
  })

  const invoices = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search invoice no…"
            className="w-64 bg-background pl-9"
            aria-label="Search invoices"
          />
        </div>

        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-44 bg-background" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {INVOICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{label(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={partyType} onValueChange={(v) => { setPartyType(v); setPage(1) }}>
          <SelectTrigger className="w-40 bg-background" aria-label="Filter by party">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All parties</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="university">University</SelectItem>
          </SelectContent>
        </Select>

        {can("finance.manage.global") && (
          <Button className="ml-auto" onClick={() => setNewOpen(true)}>
            <Plus className="size-4" /> New invoice
          </Button>
        )}
      </div>

      <NewInvoiceDialog open={newOpen} onOpenChange={setNewOpen} />

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Application</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 6 }).map((_, cell) => (
                    <TableCell key={cell}><Skeleton className="h-4 w-full max-w-28" /></TableCell>
                  ))}
                </TableRow>
              ))}

            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <p className="text-sm text-destructive">Failed to load invoices.</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
                </TableCell>
              </TableRow>
            )}

            {!isPending && !isError && invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Receipt className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No invoices found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Invoices are generated when applications are accepted.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {invoices.map((invoice) => (
              <TableRow
                key={invoice.id}
                className="cursor-pointer"
                onClick={() => navigate(`/finance/${invoice.id}`)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">{invoice.invoice_no}</TableCell>
                <TableCell>
                  <p className="font-medium">{invoice.party_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{invoice.party_type}</p>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {invoice.application?.application_code ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(invoice.total, invoice.currency)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(invoice.amount_paid, invoice.currency)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border-transparent capitalize", INVOICE_STATUS_BADGE[invoice.status])}>
                    {label(invoice.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{meta.from}–{meta.to} of {meta.total}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={meta.current_page <= 1} onClick={() => setPage((c) => c - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((c) => c + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
