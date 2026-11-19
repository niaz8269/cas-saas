import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Search } from "lucide-react"
import { useState } from "react"

import RowActions from "@/components/RowActions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import ExclusiveCard from "@/features/exclusives/ExclusiveCard"
import ExclusiveDetail, { MaterialList } from "@/features/exclusives/ExclusiveDetail"
import ExclusiveFormDialog from "@/features/exclusives/ExclusiveFormDialog"
import MaterialsPanel from "@/features/exclusives/MaterialsPanel"
import {
  deleteExclusive,
  downloadMaterial,
  getExclusive,
  listExclusives,
  listLibrary,
  type ExclusiveOffer,
} from "@/features/exclusives/api"
import { isSuperAdmin } from "@/lib/navigation"
import { useAuthStore } from "@/stores/auth"

/** Exclusive programs and universities for agencies: admins manage them, counselors read them. */
export default function ExclusivesPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManage = isSuperAdmin(user) || (user?.permissions.includes("exclusives.manage.global") ?? false)

  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [audience, setAudience] = useState("")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<ExclusiveOffer | "new" | null>(null)
  const [viewing, setViewing] = useState<ExclusiveOffer | null>(null)

  const { data, isPending, isError } = useQuery({
    queryKey: ["exclusives", { q, status, audience, page }],
    queryFn: () => listExclusives({ q: q || undefined, status: status || undefined, audience: audience || undefined, page }),
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
          <p className="mt-1 text-sm text-muted-foreground">Exclusive programs and universities. Partners ones are shown to approved agencies; Private ones are for the CAS team only. Each has commission in RMB by agency level, fees, nationality limits, conditions and downloadable material.</p>
        </div>
        {canManage && <Button onClick={() => setEditing("new")}><Plus className="size-4" /> New exclusive</Button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search exclusives" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search by title" className="pl-9" />
        </div>
        <div role="group" aria-label="Filter by who can see it" className="flex gap-1.5">
          {[["", "All"], ["partners", "Partners"], ["private", "Private"]].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={audience === value} onClick={() => { setAudience(value); setPage(1) }}
              className={`h-9 rounded-full border px-4 text-sm font-medium ${audience === value ? "border-cas-navy bg-cas-navy text-white" : "bg-card hover:border-cas-navy/50"}`}>{label}</button>
          ))}
        </div>
        <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {isError && <p role="alert" className="text-sm text-destructive">Could not load the exclusives.</p>}
      {!isPending && !isError && rows.length === 0 && (
        <div className="rounded-sm border bg-card p-12 text-center text-sm text-muted-foreground shadow-sm">No exclusives yet.{canManage ? " Add the first one." : ""}</div>
      )}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {isPending && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-sm" />)}
        {rows.map((o) => (
          <ExclusiveCard
            key={o.id}
            offer={o}
            onOpen={() => setViewing(o)}
            actions={<RowActions name={o.title} onOpen={() => setViewing(o)} onEdit={canManage ? () => setEditing(o) : undefined} onDelete={canManage ? () => remove.mutateAsync(o.id) : undefined} deleteNote="Its downloadable files are deleted too." />}
          />
        ))}
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
        <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
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
