import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Award, Plus, Search } from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { listScholarshipsByScope, type Scholarship } from "@/features/catalog/api"
import ScholarshipFormDialog from "@/features/catalog/dialogs/ScholarshipFormDialog"
import { cn } from "@/lib/utils"

const money = (value: string | number | null, currency: string | null): string =>
  value == null ? "—" : `${currency ? `${currency} ` : ""}${value}`

export default function ScholarshipsPage() {
  const can = useCan()
  const canManage = can("scholarships.manage.global")

  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Scholarship | undefined>(undefined)

  useEffect(() => {
    const timer = setTimeout(() => { setQ(searchInput); setPage(1) }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["scholarships", "government", { q, page }],
    queryFn: () => listScholarshipsByScope("government", { q: q || undefined, page }),
    placeholderData: keepPreviousData,
  })

  const rows = data?.data ?? []
  const meta = data?.meta

  const openNew = () => { setEditing(undefined); setDialogOpen(true) }
  const openEdit = (s: Scholarship) => { if (canManage) { setEditing(s); setDialogOpen(true) } }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold text-cas-navy">Government scholarships</h1>
          <p className="text-sm text-muted-foreground">National awards (CSC, provincial, …) — not tied to a single university.</p>
        </div>
        <div className="relative ml-auto">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search scholarships…"
            className="w-64 bg-background pl-9"
            aria-label="Search scholarships"
          />
        </div>
        {canManage && (
          <Button onClick={openNew}><Plus className="size-4" /> New scholarship</Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead>Tuition after</TableHead>
              <TableHead>Stipend / mo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, c) => (
                    <TableCell key={c}><Skeleton className="h-4 w-full max-w-28" /></TableCell>
                  ))}
                </TableRow>
              ))}

            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <p className="text-sm text-destructive">Failed to load scholarships.</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
                </TableCell>
              </TableRow>
            )}

            {!isPending && !isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Award className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No government scholarships yet</p>
                  {canManage && <p className="mt-1 text-sm text-muted-foreground">Add one with “New scholarship”.</p>}
                </TableCell>
              </TableRow>
            )}

            {rows.map((s) => (
              <TableRow key={s.id} className={cn(canManage && "cursor-pointer")} onClick={() => openEdit(s)}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground capitalize">{s.type ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{s.coverage ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{money(s.tuition_after, s.currency)}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{money(s.stipend_monthly, s.currency)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border-transparent capitalize", s.status === "active" ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground")}>
                    {s.status}
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
              <Button variant="secondary" size="sm" disabled={meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {canManage && (
        <ScholarshipFormDialog scope="government" scholarship={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
      )}
    </div>
  )
}
