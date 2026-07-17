import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Banknote } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { listCommissions } from "@/features/finance/api"
import {
  COMMISSION_LADDER,
  COMMISSION_STATUS_BADGE,
  label,
  money,
} from "@/features/finance/status"
import { cn } from "@/lib/utils"

export default function CommissionsPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["commissions", { status, page }],
    queryFn: () => listCommissions({ status: status === "all" ? undefined : status, page }),
    placeholderData: keepPreviousData,
  })

  const commissions = data?.data ?? []
  const meta = data?.meta
  const pipeline = data?.pipeline ?? {}

  return (
    <div className="space-y-4">
      {/* Pipeline tiles */}
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {COMMISSION_LADDER.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => { setStatus(status === step ? "all" : step); setPage(1) }}
            className={cn(
              "rounded-xl border bg-card p-4 text-left shadow-sm transition-colors",
              status === step && "border-cas-navy ring-1 ring-cas-navy",
            )}
          >
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{label(step)}</p>
            <p className="mt-1 text-2xl font-semibold text-cas-navy tabular-nums">
              {pipeline[step]?.count ?? 0}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {money(pipeline[step]?.expected_total ?? 0)} expected
            </p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-44 bg-background" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {COMMISSION_LADDER.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{label(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>University</TableHead>
              <TableHead>Agreement</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending &&
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 6 }).map((_, cell) => (
                    <TableCell key={cell}><Skeleton className="h-4 w-full max-w-28" /></TableCell>
                  ))}
                </TableRow>
              ))}

            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <p className="text-sm text-destructive">Failed to load commissions.</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
                </TableCell>
              </TableRow>
            )}

            {!isPending && !isError && commissions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Banknote className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No commissions found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Commissions open automatically when applications are accepted.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {commissions.map((commission) => (
              <TableRow
                key={commission.id}
                className="cursor-pointer"
                onClick={() => navigate(`/commissions/${commission.id}`)}
              >
                <TableCell>
                  <p className="font-medium">{commission.application?.student?.full_name ?? "—"}</p>
                  <p className="font-mono text-xs text-muted-foreground">{commission.application?.application_code}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{commission.university?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {commission.agreement
                    ? commission.agreement.commission_type === "percent"
                      ? `${Number(commission.agreement.commission_value)}%`
                      : `${money(commission.agreement.commission_value)} fixed`
                    : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(commission.expected_amount, commission.currency)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(commission.received_amount, commission.currency)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border-transparent capitalize", COMMISSION_STATUS_BADGE[commission.status])}>
                    {label(commission.status)}
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
