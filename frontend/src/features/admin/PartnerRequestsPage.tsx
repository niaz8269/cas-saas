import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ExternalLink, Search, X } from "lucide-react"
import { useState } from "react"

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
import {
  approveAgentRequest,
  listAgentRequests,
  rejectAgentRequest,
  type AgentRequest,
} from "@/features/admin/api"
import { isSuperAdmin } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth"

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  inactive: "bg-muted text-muted-foreground",
}

const STATUS_FILTERS = ["pending", "active", "rejected", "all"] as const

export default function PartnerRequestsPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManage = isSuperAdmin(user) || (user?.permissions.includes("agents.manage.global") ?? false)

  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("pending")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)

  const { data, isPending, isError } = useQuery({
    queryKey: ["agent-requests", { status, q, page }],
    queryFn: () => listAgentRequests({ status: status === "all" ? undefined : status, q: q || undefined, page }),
    placeholderData: keepPreviousData,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["agent-requests"] })
  const approve = useMutation({ mutationFn: (id: number) => approveAgentRequest(id), onSuccess: invalidate })
  const reject = useMutation({ mutationFn: (id: number) => rejectAgentRequest(id), onSuccess: invalidate })
  const acting = approve.isPending || reject.isPending

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-cas-navy">Partner requests</h1>
        <p className="text-sm text-muted-foreground">Review agent/partner sign-ups and approve or reject them.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
            placeholder="Search company, contact or email"
            className="w-72 pl-8"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1) }}>
          <SelectTrigger className="w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All statuses" : s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
            ))}

            {isError && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-destructive">Couldn't load partner requests.</TableCell></TableRow>
            )}

            {data && data.data.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No {status === "all" ? "" : status} partner requests.</TableCell></TableRow>
            )}

            {data?.data.map((a: AgentRequest) => (
              <TableRow key={a.id}>
                <TableCell>
                  <p className="font-medium">{a.company_name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{a.agent_code}</p>
                  {a.website && (
                    <a href={a.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-cas-navy hover:underline">
                      {a.website.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <p className="text-sm">{a.contact_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                  {a.phone && <p className="text-xs text-muted-foreground">{a.phone}</p>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <p>{a.country ?? "—"}</p>
                  {a.address && <p className="max-w-56 truncate text-xs" title={a.address}>{a.address}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border-transparent capitalize", STATUS_BADGE[a.status] ?? "bg-muted text-muted-foreground")}>
                    {a.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {a.status === "pending" && canManage ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" disabled={acting} onClick={() => reject.mutate(a.id)}>
                        <X className="size-4" /> Reject
                      </Button>
                      <Button size="sm" disabled={acting} onClick={() => approve.mutate(a.id)}>
                        <Check className="size-4" /> Approve
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.meta.from}–{data.meta.to} of {data.meta.total}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={data.meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Button variant="secondary" size="sm" disabled={data.meta.current_page >= data.meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
