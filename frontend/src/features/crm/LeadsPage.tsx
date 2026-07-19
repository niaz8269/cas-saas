import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Filter, Search } from "lucide-react"
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
import AddLeadDialog from "@/features/crm/AddLeadDialog"
import { listLeads } from "@/features/crm/api"
import LeadRowActions from "@/features/crm/LeadRowActions"
import { LEAD_FORM_TYPES, LEAD_STATUS_BADGE, LEAD_STATUSES } from "@/features/crm/status"
import { cn } from "@/lib/utils"

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : "—"
}

export default function LeadsPage() {
  const navigate = useNavigate()
  const can = useCan()
  const canCreate = can("leads.create.global") || can("leads.create.assigned")
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [formType, setFormType] = useState<string>("all")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput)
      setPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["leads", { q, status, formType, page }],
    queryFn: () =>
      listLeads({
        q: q || undefined,
        status: status === "all" ? undefined : status,
        form_type: formType === "all" ? undefined : formType,
        page,
      }),
    placeholderData: keepPreviousData,
  })

  const leads = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name, email or phone…"
            className="w-72 bg-background pl-9"
            aria-label="Search leads"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40 bg-background" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={formType}
          onValueChange={(value) => {
            setFormType(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44 bg-background" aria-label="Filter by form type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All forms</SelectItem>
            {LEAD_FORM_TYPES.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canCreate && <div className="ml-auto"><AddLeadDialog /></div>}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending &&
              Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 7 }).map((_, cell) => (
                    <TableCell key={cell}>
                      <Skeleton className="h-4 w-full max-w-28" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <p className="text-sm text-destructive">Failed to load leads.</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
                    Try again
                  </Button>
                </TableCell>
              </TableRow>
            )}

            {!isPending && !isError && leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <Filter className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No leads found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {q || status !== "all"
                      ? "Try different filters."
                      : "Leads arrive automatically from the connected websites."}
                  </p>
                </TableCell>
              </TableRow>
            )}

            {leads.map((lead) => (
              <TableRow
                key={lead.id}
                className="cursor-pointer"
                onClick={() => navigate(`/leads/${lead.id}`)}
              >
                <TableCell>
                  <p className="font-medium">{lead.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{lead.email ?? lead.phone ?? ""}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <span>{lead.website_source?.domain ?? "—"}</span>
                  {lead.form_type && (
                    <Badge variant="outline" className="ml-2 border-transparent bg-cas-navy-50 text-cas-navy capitalize">
                      {lead.form_type.replace(/_/g, " ")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{lead.country?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{lead.assignee?.name ?? "Unassigned"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn("border-transparent capitalize", LEAD_STATUS_BADGE[lead.status])}
                    >
                      {lead.status}
                    </Badge>
                    {lead.review && (
                      <Badge variant="outline" className="border-transparent bg-amber-50 text-amber-700">
                        review
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(lead.created_at)}</TableCell>
                <TableCell className="text-right">
                  <LeadRowActions lead={lead} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              {meta.from}–{meta.to} of {meta.total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={meta.current_page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
