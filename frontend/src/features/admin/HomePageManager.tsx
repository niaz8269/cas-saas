import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Lock, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createHomeSection, deleteHomeSection, listHomeSections, reorderHomeSections, resetHomeSection, updateHomeSection, type HomeSectionRow } from "@/features/admin/api"
import HomeSectionEditor from "@/features/admin/HomeSectionEditor"
import { SECTION_DEFS } from "@/features/admin/homeSchema"
import { ApiError } from "@/lib/api"
import { isSuperAdmin } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth"

function nameOf(s: HomeSectionRow): string {
  const custom = s.key.startsWith("custom-")
  const title = (s.content?.en as { texts?: Record<string, string> } | undefined)?.texts?.title

  return custom ? `${SECTION_DEFS[s.type]?.title ?? "Custom"}${title ? `: ${title}` : ""}` : SECTION_DEFS[s.type]?.title ?? s.key
}

/** Arrange, edit, hide and add the sections of the public home page. */
export default function HomePageManager() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManage = isSuperAdmin(user) || (user?.permissions ?? []).includes("content.manage.global")
  const [editing, setEditing] = useState<HomeSectionRow | null>(null)
  const [adding, setAdding] = useState(false)

  const list = useQuery({ queryKey: ["home-sections"], queryFn: listHomeSections })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["home-sections"] })
  const onError = (e: unknown) => (e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : "Something went wrong.")

  const toggle = useMutation({ mutationFn: (s: HomeSectionRow) => updateHomeSection(s.id, { is_visible: !s.is_visible }), onSuccess: refresh })
  const reorder = useMutation({ mutationFn: (ids: number[]) => reorderHomeSections(ids), onSuccess: refresh })
  const reset = useMutation({ mutationFn: (id: number) => resetHomeSection(id), onSuccess: refresh })
  const remove = useMutation({ mutationFn: (id: number) => deleteHomeSection(id), onSuccess: refresh })
  const add = useMutation({ mutationFn: (type: "banner" | "text") => createHomeSection(type), onSuccess: (res) => { setAdding(false); refresh(); setEditing(res.data) } })

  const sections = list.data?.data ?? []
  const move = (index: number, dir: -1 | 1) => {
    const ids = sections.map((s) => s.id)
    ;[ids[index], ids[index + dir]] = [ids[index + dir], ids[index]]
    reorder.mutate(ids)
  }
  const error = [toggle, reorder, reset, remove, add].map((m) => m.error).find(Boolean)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-cas-navy">Home page</h1>
          <p className="text-sm text-muted-foreground">Arrange the sections of your landing page, edit their text, links and pictures, hide what you do not need, or add your own.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><a href="/site" target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> View home page</a></Button>
          {canManage && <Button onClick={() => setAdding((v) => !v)}><Plus className="size-4" /> Add section</Button>}
        </div>
      </div>

      {adding && (
        <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-2">
          {(["banner", "text"] as const).map((type) => (
            <button key={type} type="button" onClick={() => add.mutate(type)} disabled={add.isPending} className="rounded-lg border p-4 text-left transition-colors hover:bg-muted">
              <p className="font-medium text-cas-navy">{SECTION_DEFS[type].title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{SECTION_DEFS[type].description}</p>
            </button>
          ))}
        </div>
      )}

      {error && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{onError(error)}</p>}

      {list.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ol className="space-y-2">
          {sections.map((s, i) => {
            const def = SECTION_DEFS[s.type]
            const custom = s.key.startsWith("custom-")
            const pinned = def?.pinned
            const edited = !!s.content

            return (
              <li key={s.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-sm", !s.is_visible && "opacity-60")}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-semibold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{nameOf(s)}</p>
                    {pinned && <Badge variant="secondary"><Lock className="mr-1 size-3" /> Always first</Badge>}
                    {custom && <Badge variant="secondary">Added by you</Badge>}
                    {edited && <Badge className="bg-cas-navy-50 text-cas-navy">Edited</Badge>}
                    {!s.is_visible && <Badge className="bg-amber-50 text-warning">Hidden</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{def?.description}</p>
                </div>

                {canManage && (
                  <div className="flex flex-wrap items-center gap-1">
                    <Button variant="ghost" size="sm" aria-label={`Move ${nameOf(s)} up`} disabled={pinned || i <= 1 || reorder.isPending} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
                    <Button variant="ghost" size="sm" aria-label={`Move ${nameOf(s)} down`} disabled={pinned || i === sections.length - 1 || reorder.isPending} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
                    <Button variant="ghost" size="sm" aria-label={s.is_visible ? `Hide ${nameOf(s)}` : `Show ${nameOf(s)}`} disabled={pinned} onClick={() => toggle.mutate(s)}>
                      {s.is_visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(s)}><Pencil className="size-4" /> Edit</Button>
                    {!custom && edited && (
                      <Button variant="ghost" size="sm" aria-label={`Reset ${nameOf(s)} to the standard text`} onClick={() => { if (window.confirm(`Put "${nameOf(s)}" back to the standard text and pictures?`)) reset.mutate(s.id) }}><RotateCcw className="size-4" /></Button>
                    )}
                    {custom && (
                      <Button variant="ghost" size="sm" aria-label={`Delete ${nameOf(s)}`} onClick={() => { if (window.confirm(`Delete "${nameOf(s)}"? This cannot be undone.`)) remove.mutate(s.id) }}><Trash2 className="size-4" /></Button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <p className="text-xs text-muted-foreground">
        Standard sections cannot be deleted, but you can hide them. Lists such as universities, cities and programs fill themselves from your catalog.
      </p>

      {editing && <HomeSectionEditor key={editing.id} section={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
