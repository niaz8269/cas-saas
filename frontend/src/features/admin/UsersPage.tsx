import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Pencil, Plus, Search, ShieldAlert } from "lucide-react"
import { useEffect, useState } from "react"

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
import { listAuditLogs, listUsers, type AuditEntry, type StaffUser } from "@/features/admin/api"
import UserFormDialog from "@/features/admin/UserFormDialog"
import { isSuperAdmin } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth"

const ACTION_BADGE: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-cas-navy-50 text-cas-navy",
  delete: "bg-cas-red-50 text-cas-red",
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-cas-red-50 text-cas-red",
}

export default function UsersPage() {
  const [tab, setTab] = useState<"staff" | "audit">("staff")

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-subtle p-1 sm:w-fit">
        {(["staff", "audit"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === t ? "bg-card text-cas-navy shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "staff" ? "Staff" : "Audit trail"}
          </button>
        ))}
      </div>

      {tab === "staff" ? <StaffTable /> : <AuditTable />}
    </div>
  )
}

function StaffTable() {
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StaffUser | null>(null)
  const currentUser = useAuthStore((s) => s.user)
  const superAdmin = isSuperAdmin(currentUser)

  const openCreate = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (user: StaffUser) => { setEditing(user); setFormOpen(true) }

  useEffect(() => {
    const t = setTimeout(() => { setQ(searchInput); setPage(1) }, 300)

    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isPending, isError } = useQuery({
    queryKey: ["users", { q, status, page }],
    queryFn: () => listUsers({ q: q || undefined, status: status === "all" ? undefined : status, page }),
    placeholderData: keepPreviousData,
  })

  if (isError) return <Denied />

  const users = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search name or email…" className="w-64 bg-background pl-9" aria-label="Search staff" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-40 bg-background" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Button className="ml-auto" onClick={openCreate}>
          <Plus className="size-4" /> New user
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="w-16 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((_, c) => <TableCell key={c}><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>
            ))}
            {users.map((u) => {
              const isProtected = u.roles.includes("Super Admin") && !superAdmin

              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => <Badge key={r} variant="outline" className="border-transparent bg-cas-navy-50 text-cas-navy">{r}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.branch?.code ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.department?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("border-transparent capitalize", STATUS_BADGE[u.status])}>{u.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEdit(u)}
                      disabled={isProtected}
                      title={isProtected ? "Only a Super Admin can edit this account" : "Edit user"}
                      aria-label={`Edit ${u.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
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

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} />
    </div>
  )
}

function AuditTable() {
  const [action, setAction] = useState("all")
  const [page, setPage] = useState(1)

  const { data, isPending, isError } = useQuery({
    queryKey: ["audit-logs", { action, page }],
    queryFn: () => listAuditLogs({ action: action === "all" ? undefined : action, page }),
    placeholderData: keepPreviousData,
  })

  if (isError) return <Denied />

  const entries = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <Select value={action} onValueChange={(v) => { setAction(v); setPage(1) }}>
        <SelectTrigger className="w-40 bg-background" aria-label="Filter by action"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All actions</SelectItem>
          <SelectItem value="create">Create</SelectItem>
          <SelectItem value="update">Update</SelectItem>
          <SelectItem value="delete">Delete</SelectItem>
        </SelectContent>
      </Select>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 5 }).map((_, c) => <TableCell key={c}><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>
            ))}
            {!isPending && entries.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No audit entries.</TableCell></TableRow>
            )}
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-muted-foreground tabular-nums">{e.created_at ? new Date(e.created_at).toLocaleString() : "—"}</TableCell>
                <TableCell>{e.actor ?? <span className="text-muted-foreground">System</span>}</TableCell>
                <TableCell><Badge variant="outline" className={cn("border-transparent capitalize", ACTION_BADGE[e.action])}>{e.action}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{e.entity_type} <span className="font-mono text-xs">#{e.entity_id}</span></TableCell>
                <TableCell className="max-w-xs"><ChangeSummary entry={e} /></TableCell>
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
    </div>
  )
}

function ChangeSummary({ entry }: { entry: AuditEntry }) {
  if (entry.action === "create") return <span className="text-xs text-muted-foreground">Record created</span>
  if (entry.action === "delete") return <span className="text-xs text-muted-foreground">Record deleted</span>

  const keys = Object.keys(entry.new_values ?? {})
  if (keys.length === 0) return <span className="text-xs text-muted-foreground">—</span>

  return (
    <div className="space-y-0.5 text-xs">
      {keys.slice(0, 3).map((k) => (
        <p key={k} className="truncate">
          <span className="font-medium">{k}</span>:{" "}
          <span className="text-muted-foreground line-through">{String(entry.old_values?.[k] ?? "∅")}</span>{" → "}
          <span className="text-foreground">{String(entry.new_values?.[k] ?? "∅")}</span>
        </p>
      ))}
      {keys.length > 3 && <p className="text-muted-foreground">+{keys.length - 3} more</p>}
    </div>
  )
}

function Denied() {
  return (
    <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
      <ShieldAlert className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">Access denied</p>
      <p className="mt-1 text-sm text-muted-foreground">You need user-management access to view this.</p>
    </div>
  )
}
