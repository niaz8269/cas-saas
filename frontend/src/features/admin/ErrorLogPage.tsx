import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pause, Play, Search, ShieldAlert } from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { getErrorLog, listErrorLogs, resolveErrorLog } from "@/features/admin/api"
import { cn } from "@/lib/utils"

const LEVEL_BADGE: Record<string, string> = {
  critical: "bg-cas-red-50 text-cas-red",
  error: "bg-cas-red-50 text-cas-red",
  warning: "bg-amber-50 text-amber-700",
  client: "bg-cas-navy-50 text-cas-navy",
}

function ago(iso: string | null): string {
  if (!iso) return "—"
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`

  return `${Math.floor(s / 86400)}d ago`
}

export default function ErrorLogPage() {
  const [status, setStatus] = useState("unresolved")
  const [level, setLevel] = useState("all")
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [live, setLive] = useState(true)
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setQ(searchInput); setPage(1) }, 300)

    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isPending, isError, dataUpdatedAt } = useQuery({
    queryKey: ["error-logs", { status, level, q, page }],
    queryFn: () => listErrorLogs({
      status,
      level: level === "all" ? undefined : level,
      q: q || undefined,
      page,
    }),
    placeholderData: keepPreviousData,
    refetchInterval: live ? 5000 : false,
  })

  if (isError) return <Denied />

  const logs = data?.data ?? []
  const meta = data?.meta
  const stats = data?.stats

  return (
    <div className="space-y-4">
      {/* Stats + live control */}
      <div className="flex flex-wrap items-center gap-3">
        <Stat label="Unresolved" value={stats?.unresolved} tone="danger" />
        <Stat label="Seen in last 24h" value={stats?.last_24h} />
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {live && <span className="inline-block size-2 animate-pulse rounded-full bg-success" aria-hidden />}
          <span>{live ? `Live · updated ${ago(new Date(dataUpdatedAt).toISOString())}` : "Paused"}</span>
          <Button variant="secondary" size="sm" onClick={() => setLive((v) => !v)}>
            {live ? <><Pause className="size-3.5" /> Pause</> : <><Play className="size-3.5" /> Live</>}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search message, type or URL…" className="w-72 bg-background pl-9" aria-label="Search errors" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-40 bg-background" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unresolved">Unresolved</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={(v) => { setLevel(v); setPage(1) }}>
          <SelectTrigger className="w-36 bg-background" aria-label="Filter by level"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>Level</TableHead>
              <TableHead>Error</TableHead>
              <TableHead className="text-right">Count</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 5 }).map((_, c) => <TableCell key={c}><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>
            ))}

            {!isPending && logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <p className="text-sm font-medium">No errors {status === "unresolved" ? "to review" : "found"} 🎉</p>
                  <p className="mt-1 text-sm text-muted-foreground">New server errors appear here automatically.</p>
                </TableCell>
              </TableRow>
            )}

            {logs.map((log) => (
              <TableRow key={log.id} className="cursor-pointer" onClick={() => setOpenId(log.id)}>
                <TableCell>
                  <Badge variant="outline" className={cn("border-transparent capitalize", LEVEL_BADGE[log.level] ?? "bg-muted text-muted-foreground")}>{log.level}</Badge>
                </TableCell>
                <TableCell className="max-w-md">
                  <p className="truncate font-medium">{log.type ?? "Error"}</p>
                  <p className="truncate text-xs text-muted-foreground">{log.message}</p>
                </TableCell>
                <TableCell className="text-right tabular-nums">{log.occurrences}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{ago(log.last_seen_at)}</TableCell>
                <TableCell>
                  {log.resolved
                    ? <Badge variant="outline" className="border-transparent bg-green-100 text-green-800">Resolved</Badge>
                    : <Badge variant="outline" className="border-transparent bg-amber-50 text-amber-700">Open</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {meta && meta.total > 0 && meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{meta.from}–{meta.to} of {meta.total}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <ErrorDetailDialog id={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value?: number; tone?: "danger" }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-2 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", tone === "danger" && (value ?? 0) > 0 ? "text-cas-red" : "text-cas-navy")}>
        {value ?? "—"}
      </p>
    </div>
  )
}

function ErrorDetailDialog({ id, onOpenChange }: { id: number | null; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ["error-log", id],
    queryFn: () => getErrorLog(id!),
    enabled: id !== null,
  })

  const resolve = useMutation({
    mutationFn: () => resolveErrorLog(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["error-logs"] })
      queryClient.invalidateQueries({ queryKey: ["error-log", id] })
    },
  })

  const log = data?.data

  return (
    <Dialog open={id !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {log && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{log.type ?? "Error"}</span>
                <Badge variant="outline" className={cn("border-transparent capitalize", LEVEL_BADGE[log.level] ?? "bg-muted")}>{log.level}</Badge>
              </DialogTitle>
              <DialogDescription className="text-foreground">{log.message}</DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4 text-sm sm:grid-cols-3">
              <Field label="Occurrences" value={String(log.occurrences)} />
              <Field label="First seen" value={log.first_seen_at ? new Date(log.first_seen_at).toLocaleString() : "—"} />
              <Field label="Last seen" value={log.last_seen_at ? new Date(log.last_seen_at).toLocaleString() : "—"} />
              <Field label="Location" value={log.file ? `${log.file.split(/[/\\]/).slice(-2).join("/")}:${log.line}` : "—"} />
              <Field label="Request" value={log.url ? `${log.method ?? ""} ${log.url}` : "—"} />
              <Field label="HTTP status" value={log.status ? String(log.status) : "—"} />
              <Field label="Actor" value={log.actor ?? "—"} />
              <Field label="IP" value={log.ip ?? "—"} />
            </dl>

            {log.context?.previous && (
              <p className="rounded-md bg-subtle px-3 py-2 text-xs"><span className="font-medium">Caused by:</span> {log.context.previous}</p>
            )}

            {log.context?.trace && log.context.trace.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">Stack trace</p>
                <pre className="max-h-72 overflow-auto rounded-md bg-ink/95 p-3 text-xs leading-relaxed text-white/90">
                  {log.context.trace.join("\n")}
                </pre>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              {log.resolved
                ? <span className="text-sm text-muted-foreground">Resolved{log.resolved_by ? ` by ${log.resolved_by}` : ""}</span>
                : <Button onClick={() => resolve.mutate()} disabled={resolve.isPending}>{resolve.isPending ? "Resolving…" : "Mark resolved"}</Button>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  )
}

function Denied() {
  return (
    <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
      <ShieldAlert className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">Access denied</p>
      <p className="mt-1 text-sm text-muted-foreground">You need settings-management access to view the error monitor.</p>
    </div>
  )
}
