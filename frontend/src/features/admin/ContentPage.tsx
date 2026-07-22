import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
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
import { deletePost, listPosts, type Post } from "@/features/admin/api"
import PostFormDialog from "@/features/admin/PostFormDialog"
import { isSuperAdmin } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth"

const TYPE_BADGE: Record<string, string> = {
  news: "bg-sky-100 text-sky-700",
  blog: "bg-violet-100 text-violet-700",
  event: "bg-amber-100 text-amber-800",
}

export default function ContentPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManage = isSuperAdmin(user) || (user?.permissions.includes("content.manage.global") ?? false)

  const [type, setType] = useState("all")
  const [status, setStatus] = useState("all")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Post | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, isPending, isError } = useQuery({
    queryKey: ["posts", { type, status, q, page }],
    queryFn: () => listPosts({ type: type === "all" ? undefined : type, status: status === "all" ? undefined : status, q: q || undefined, page }),
    placeholderData: keepPreviousData,
  })

  const remove = useMutation({
    mutationFn: (id: number) => deletePost(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  })

  const openNew = () => { setEditing(undefined); setDialogOpen(true) }
  const openEdit = (p: Post) => { setEditing(p); setDialogOpen(true) }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-cas-navy">Content</h1>
          <p className="text-sm text-muted-foreground">Blogs, news and events shown on the public site.</p>
        </div>
        {canManage && <Button onClick={openNew}><Plus className="size-4" /> New post</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search titles" className="w-64 pl-8" />
        </div>
        <Select value={type} onValueChange={(v) => { setType(v); setPage(1) }}>
          <SelectTrigger className="w-36" aria-label="Filter by type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="news">News</SelectItem>
            <SelectItem value="blog">Blog</SelectItem>
            <SelectItem value="event">Event</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-36" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
            ))}
            {isError && <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-destructive">Couldn't load content.</TableCell></TableRow>}
            {data && data.data.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No posts yet.</TableCell></TableRow>
            )}
            {data?.data.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <p className="font-medium">{p.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">/{p.slug}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border-transparent capitalize", TYPE_BADGE[p.type] ?? "bg-muted")}>{p.type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border-transparent capitalize", p.status === "published" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground")}>{p.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.published_at ? new Date(p.published_at).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {canManage ? (
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" aria-label={`Edit ${p.title}`} onClick={() => openEdit(p)}><Pencil className="size-4" /></Button>
                      <Button size="sm" variant="ghost" aria-label={`Delete ${p.title}`} disabled={remove.isPending}
                        onClick={() => { if (window.confirm(`Delete "${p.title}"?`)) remove.mutate(p.id) }}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
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

      <PostFormDialog post={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
