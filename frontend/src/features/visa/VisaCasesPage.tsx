import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Plane } from "lucide-react"
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
import { listVisaCases } from "@/features/visa/api"
import { VISA_LADDER, VISA_STATUS_BADGE, label } from "@/features/visa/status"
import { cn } from "@/lib/utils"

export default function VisaCasesPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["visa-cases", { status, page }],
    queryFn: () => listVisaCases({ status: status === "all" ? undefined : status, page }),
    placeholderData: keepPreviousData,
  })

  const cases = data?.data ?? []
  const meta = data?.meta
  const pipeline = data?.pipeline ?? {}

  return (
    <div className="space-y-4">
      {/* Pipeline tiles */}
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {VISA_LADDER.map((step) => (
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
              {pipeline[step] ?? 0}
            </p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-48 bg-background" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {[...VISA_LADDER, "rejected"].map((s) => (
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
              <TableHead>Visa officer</TableHead>
              <TableHead>Appointment</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending &&
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 5 }).map((_, cell) => (
                    <TableCell key={cell}><Skeleton className="h-4 w-full max-w-28" /></TableCell>
                  ))}
                </TableRow>
              ))}

            {isError && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <p className="text-sm text-destructive">Failed to load visa cases.</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
                </TableCell>
              </TableRow>
            )}

            {!isPending && !isError && cases.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <Plane className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No visa cases found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Visa cases open automatically when applications are accepted.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {cases.map((visaCase) => (
              <TableRow
                key={visaCase.id}
                className="cursor-pointer"
                onClick={() => navigate(`/visa/${visaCase.id}`)}
              >
                <TableCell>
                  <p className="font-medium">{visaCase.student?.full_name ?? "—"}</p>
                  <p className="font-mono text-xs text-muted-foreground">{visaCase.application?.application_code}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{visaCase.application?.university?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{visaCase.officer?.name ?? "Unassigned"}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {visaCase.appointment_at ? new Date(visaCase.appointment_at).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border-transparent capitalize", VISA_STATUS_BADGE[visaCase.status])}>
                    {label(visaCase.status)}
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
