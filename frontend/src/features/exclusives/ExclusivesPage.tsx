import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Search } from "lucide-react"
import { useState } from "react"

import RowActions from "@/components/RowActions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import ExclusiveDetail, { MaterialList } from "@/features/exclusives/ExclusiveDetail"
import ExclusiveFormDialog from "@/features/exclusives/ExclusiveFormDialog"
import MaterialsPanel from "@/features/exclusives/MaterialsPanel"
import {
  deleteExclusive,
  downloadMaterial,
  formatCommission,
  getExclusive,
  listExclusives,
  listLibrary,
  type ExclusiveOffer,
} from "@/features/exclusives/api"
import { isSuperAdmin } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth"

const STATUS_BADGE: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-amber-100 text-amber-800",
}

/** Exclusive programs and universities for agencies: admins manage them, counselors read them. */
export default function ExclusivesPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManage = isSuperAdmin(user) || (user?.permissions.includes("exclusives.manage.global") ?? false)

  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<ExclusiveOffer | "new" | null>(null)
  const [viewing, setViewing] = useState<ExclusiveOffer | null>(null)

  const { data, isPending, isError } = useQuery({
    queryKey: ["exclusives", { q, status, page }],
    queryFn: () => listExclusives({ q: q || undefined, status: status || undefined, page }),
    placeholderData: keepPreviousData,
  })
  const { data: library } = useQuery({ queryKey: ["exclusive-library"], queryFn: async () => (await listLibrary()).data })
  const { data: detail } = useQuery({ queryKey: ["exclusive", viewing?.id], queryFn: () => getExclusive(viewing!.id), enabled: viewing != null })
  const download = useMutation({ mutationFn: downloadMaterial })
  const remove = useMutation({ mutationFn: (id: number) => deleteExclusive(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exclusives"] }) })

  const rows = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Exclusives</h1>
          <p className="mt-1 text-sm text-muted-foreground">Exclusive programs and universities for partner agencies: commission by agency level, fees, nationality limits, conditions and downloadable material.</p>
        </div>
        {canManage && <Button onClick={() => setEditing("new")}><Plus className="size-4" /> New exclusive</Button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search exclusives" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search by title" className="pl-9" />
        </div>
        <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>University / program</TableHead>
              <TableHead>Partner commission</TableHead>
              <TableHead>Files</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-6" /></TableCell></TableRow>)}
            {isError && <TableRow><TableCell colSpan={6} className="py-8 text-center text-destructive">Could not load the exclusives.</TableCell></TableRow>}
            {!isPending && !isError && rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No exclusives yet.{canManage ? " Add the first one." : ""}</TableCell></TableRow>
            )}
            {rows.map((o) => (
              <TableRow key={o.id} className="cursor-pointer" onClick={() => setViewing(o)}>
                <TableCell className="font-medium"><button type="button" className="text-left hover:underline" onClick={() => setViewing(o)}>{o.title}</button></TableCell>
                <TableCell className="text-sm text-muted-foreground">{[o.university?.name, o.program?.name].filter(Boolean).join(" · ") || "—"}</TableCell>
                <TableCell className="tabular-nums">{formatCommission(o.commission_rates?.partner) || "—"}</TableCell>
                <TableCell>{o.materials_count ?? 0}</TableCell>
                <TableCell><Badge variant="outline" className={cn("border-transparent capitalize", STATUS_BADGE[o.status ?? "draft"])}>{o.status}</Badge></TableCell>
                <TableCell>
                  <RowActions name={o.title} onOpen={() => setViewing(o)} onEdit={canManage ? () => setEditing(o) : undefined} onDelete={canManage ? () => remove.mutateAsync(o.id) : undefined} deleteNote="Its downloadable files are deleted too." />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {data.meta.current_page} of {data.meta.last_page}</span>
          <Button variant="outline" size="sm" disabled={page >= data.meta.last_page} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">General library</h2>
          <p className="text-sm text-muted-foreground">Material that is not tied to one exclusive: logos, brand guidelines, agreement forms, general brochures.</p>
        </div>
        {canManage ? <MaterialsPanel offerId={null} canManage /> : (
          library && library.length > 0 ? <MaterialList files={library} onDownload={(f) => download.mutate(f)} busyId={download.isPending ? download.variables?.id : null} /> : <p className="text-sm text-muted-foreground">No general files yet.</p>
        )}
      </section>

      <Dialog open={viewing != null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
          </DialogHeader>
          {detail ? <ExclusiveDetail offer={detail.data} onDownload={(f) => download.mutate(f)} busyId={download.isPending ? download.variables?.id : null} /> : <Skeleton className="h-40" />}
          {canManage && viewing && <Button variant="outline" className="self-start" onClick={() => { setEditing(viewing); setViewing(null) }}>Edit</Button>}
        </DialogContent>
      </Dialog>

      {editing != null && <ExclusiveFormDialog open offer={editing === "new" ? undefined : editing} onOpenChange={(open) => !open && setEditing(null)} />}
    </div>
  )
}
