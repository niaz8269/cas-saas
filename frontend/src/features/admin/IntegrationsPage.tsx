import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal, Plus, Search, ShieldAlert } from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { deleteApiSource, listApiSources, updateApiSource, type ApiSourceItem } from "@/features/admin/api"
import ApiKeysDialog from "@/features/admin/ApiKeysDialog"
import ApiSourceFormDialog from "@/features/admin/ApiSourceFormDialog"
import { useCan } from "@/features/auth/useCan"
import { cn } from "@/lib/utils"

export default function IntegrationsPage() {
  const can = useCan()
  const manage = can("settings.manage.global")
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ApiSourceItem | undefined>(undefined)
  const [keysForId, setKeysForId] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setQ(searchInput); setPage(1) }, 300)

    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isPending, isError } = useQuery({
    queryKey: ["api-sources", { q, page }],
    queryFn: () => listApiSources({ q: q || undefined, page }),
    placeholderData: keepPreviousData,
  })

  const toggleActive = useMutation({
    mutationFn: (s: ApiSourceItem) => updateApiSource(s.id, { is_active: !s.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-sources"] }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteApiSource(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-sources"] }),
  })

  if (isError) return <Denied />

  const sources = data?.data ?? []
  const meta = data?.meta
  const keysSource = keysForId != null ? sources.find((s) => s.id === keysForId) ?? null : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search sources…"
            className="w-64 bg-background pl-9"
            aria-label="Search integration sources"
          />
        </div>
        {manage && (
          <Button onClick={() => { setEditing(undefined); setFormOpen(true) }}>
            <Plus className="size-4" /> New source
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>University / Program</TableHead>
              <TableHead className="text-right">Active keys</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 5 }).map((_, c) => <TableCell key={c}><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>
            ))}

            {!isPending && sources.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <p className="text-sm font-medium">No integration sources yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add a partner site (e.g. a university admissions portal) to receive its applications.
                  </p>
                  {manage && (
                    <Button className="mt-4" size="sm" onClick={() => { setEditing(undefined); setFormOpen(true) }}>
                      <Plus className="size-4" /> New source
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}

            {sources.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {s.type}{s.website_url ? ` · ${s.website_url.replace(/^https?:\/\//, "")}` : ""}
                  </p>
                </TableCell>
                <TableCell>
                  {s.university ? (
                    <>
                      <p className="text-sm">{s.university.name}</p>
                      <p className="text-xs text-muted-foreground">{s.default_program?.name ?? "No default program"}</p>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{s.active_keys_count ?? 0}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("border-transparent", s.is_active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground")}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${s.name}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => setKeysForId(s.id)}>Manage keys</DropdownMenuItem>
                        {manage && (
                          <>
                            <DropdownMenuItem onSelect={() => { setEditing(s); setFormOpen(true) }}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => toggleActive.mutate(s)}>
                              {s.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => { if (confirm(`Delete “${s.name}”? Its keys stop working.`)) remove.mutate(s.id) }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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

      <ApiSourceFormDialog open={formOpen} onOpenChange={setFormOpen} source={editing} />
      <ApiKeysDialog open={keysForId != null} onOpenChange={(o) => !o && setKeysForId(null)} source={keysSource} />
    </div>
  )
}

function Denied() {
  return (
    <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
      <ShieldAlert className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">Access denied</p>
      <p className="mt-1 text-sm text-muted-foreground">You need settings-management access to view integrations.</p>
    </div>
  )
}
