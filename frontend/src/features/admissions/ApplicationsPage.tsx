import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { FileText, Search, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import ExportButton from "@/components/ExportButton"
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
import { listApplications } from "@/features/admissions/api"
import {
  APPLICATION_STATUS_BADGE,
  APPLICATION_TRANSITIONS,
  statusLabel,
} from "@/features/admissions/status"
import { submittedByLabel, SUBMITTED_BY_OPTIONS } from "@/features/admissions/submitter"
import { cn } from "@/lib/utils"

/** Build the export query string matching the list's current filters. */
function applicationExportQuery(q: string, status: string, toVerify: boolean, submittedBy: string, agentId?: number): string {
  const p = new URLSearchParams()
  if (q) p.set("q", q)
  if (status !== "all") p.set("filter[status]", status)
  if (toVerify) p.set("filter[review]", "1")
  if (submittedBy !== "all") p.set("filter[submitted_via]", submittedBy)
  if (agentId) p.set("filter[agent_id]", String(agentId))
  const s = p.toString()

  return s ? `?${s}` : ""
}

export default function ApplicationsPage() {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [toVerify, setToVerify] = useState(false)
  const [page, setPage] = useState(1)

  // "Submitted by" and one partner's applications live in the address, so a view can be shared or reopened.
  const [params, setParams] = useSearchParams()
  const submittedBy = params.get("by") ?? "all"
  const agentId = Number(params.get("agent")) || undefined
  const agentName = params.get("agentName") ?? ""
  const changeParams = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => (v ? merged.set(k, v) : merged.delete(k)))
    setParams(merged, { replace: true })
    setPage(1)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput)
      setPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["applications", { q, status, toVerify, submittedBy, agentId, page }],
    queryFn: () =>
      listApplications({
        q: q || undefined,
        status: status === "all" ? undefined : status,
        review: toVerify || undefined,
        submitted_via: submittedBy === "all" ? undefined : submittedBy,
        agent_id: agentId,
        page,
      }),
    placeholderData: keepPreviousData,
  })

  const applications = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search code or student…"
            className="w-72 bg-background pl-9"
            aria-label="Search applications"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48 bg-background" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.keys(APPLICATION_TRANSITIONS).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{statusLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={submittedBy} onValueChange={(value) => changeParams({ by: value === "all" ? undefined : value })}>
          <SelectTrigger className="w-44 bg-background" aria-label="Filter by who submitted">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBMITTED_BY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.value === "all" ? "Submitted by: everyone" : o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          aria-pressed={toVerify}
          onClick={() => {
            setToVerify((v) => !v)
            setPage(1)
          }}
          className={cn(
            "bg-background",
            toVerify && "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 hover:text-amber-700",
          )}
        >
          To verify
        </Button>

        <div className="ml-auto">
          <ExportButton path={`/applications/export${applicationExportQuery(q, status, toVerify, submittedBy, agentId)}`} filename="applications.csv" />
        </div>
      </div>

      {agentId && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cas-navy/20 bg-cas-navy-50 px-4 py-2.5 text-sm text-cas-navy">
          <p>
            All applications of partner <strong>{agentName || `#${agentId}`}</strong>
            {meta ? `: ${meta.total} from its students, together` : ""}
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
            onClick={() => changeParams({ agent: undefined, agentName: undefined })}
          >
            <X className="size-3.5" aria-hidden="true" /> Show all partners
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>University / Program</TableHead>
              <TableHead>Submitted by</TableHead>
              <TableHead>Officer</TableHead>
              <TableHead className="text-right">Docs</TableHead>
              <TableHead>Status</TableHead>
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
                  <p className="text-sm text-destructive">Failed to load applications.</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
                    Try again
                  </Button>
                </TableCell>
              </TableRow>
            )}

            {!isPending && !isError && applications.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <FileText className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No applications found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Applications are created from qualified students.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {applications.map((application) => (
              <TableRow
                key={application.id}
                className="cursor-pointer"
                onClick={() => navigate(`/applications/${application.id}`)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    {application.application_code}
                    {application.review && (
                      <Badge variant="outline" className="border-transparent bg-amber-50 text-amber-700">
                        To verify
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="font-medium">
                  {application.student?.full_name ?? "—"}
                  {application.source && (
                    <p className="text-xs font-normal text-muted-foreground">via {application.source.name}</p>
                  )}
                </TableCell>
                <TableCell>
                  {application.kind === "scholarship" ? (
                    <>
                      <p className="flex items-center gap-1.5">
                        <Badge variant="outline" className="border-transparent bg-cas-gold-50 text-cas-gold-600 capitalize">Scholarship</Badge>
                        {application.scholarship?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{application.level ?? ""}{application.preferences.length ? ` · ${application.preferences.length} preference(s)` : ""}</p>
                    </>
                  ) : (
                    <>
                      <p>{application.university?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{application.program?.name ?? ""}</p>
                    </>
                  )}
                </TableCell>
                <TableCell>
                  <p className="text-sm">{submittedByLabel(application.submitted_via)}</p>
                  {application.agent && (
                    <button
                      type="button"
                      className="text-left text-xs text-cas-navy hover:underline"
                      title={`Open all applications of ${application.agent.name}`}
                      onClick={(event) => {
                        // The row itself opens the application; this opens the whole partner.
                        event.stopPropagation()
                        changeParams({ agent: String(application.agent!.id), agentName: application.agent!.name })
                      }}
                    >
                      {application.submitted_via === "student" ? "Partner: " : ""}{application.agent.name}
                    </button>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {application.admissions_officer?.name ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{application.documents_count ?? 0}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("border-transparent capitalize", APPLICATION_STATUS_BADGE[application.status])}
                  >
                    {statusLabel(application.status)}
                  </Badge>
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
