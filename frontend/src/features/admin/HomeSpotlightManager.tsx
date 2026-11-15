import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getHomeSpotlight, saveHomeSpotlight, searchSpotlightOptions, type SpotlightItem, type SpotlightList } from "@/features/admin/api"
import { ApiError } from "@/lib/api"

const LISTS: { key: SpotlightList; title: string; where: string; noun: string }[] = [
  { key: "hero_universities", title: "Front page universities", where: "The cards on the home page banner", noun: "university" },
  { key: "update_universities", title: "University Updates", where: "The + panel, first tab", noun: "university" },
  { key: "update_programs", title: "Program Updates", where: "The + panel, second tab", noun: "program" },
  { key: "update_scholarships", title: "Latest Scholarships", where: "The + panel, third tab", noun: "scholarship" },
  { key: "update_posts", title: "New Stories", where: "The + panel, fourth tab", noun: "story" },
]

/** Search the catalog and add an item to a list. */
function AddItem({ list, noun, taken, disabled, onAdd }: { list: SpotlightList; noun: string; taken: number[]; disabled: boolean; onAdd: (item: SpotlightItem) => void }) {
  const [q, setQ] = useState("")
  const [term, setTerm] = useState("")
  useEffect(() => {
    const id = setTimeout(() => setTerm(q.trim()), 250)

    return () => clearTimeout(id)
  }, [q])
  const options = useQuery({ queryKey: ["spotlight-options", list, term], queryFn: () => searchSpotlightOptions(list, term), enabled: term.length >= 2 && !disabled })
  const results = (options.data?.data ?? []).filter((o) => !taken.includes(o.id))

  return (
    <div className="relative">
      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} disabled={disabled} placeholder={disabled ? "This list is full" : `Search a ${noun} to add`} aria-label={`Add a ${noun} to ${list}`} className="pl-9" />
      </div>
      {term.length >= 2 && !disabled && (
        <ul className="mt-1 max-h-60 max-w-md overflow-y-auto rounded-md border bg-card shadow-sm">
          {options.isPending && <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>}
          {!options.isPending && results.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Nothing found.</li>}
          {results.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => { onAdd(o); setQ(""); setTerm("") }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted">
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.sub && <span className="block truncate text-xs text-muted-foreground">{o.sub}</span>}
                </span>
                <Plus className="size-4 shrink-0 text-cas-navy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Choose, and put in order by hand, what the home page shows. A list left empty fills itself automatically. */
export default function HomeSpotlightManager({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient()
  const { data, isPending } = useQuery({ queryKey: ["home-spotlight"], queryFn: getHomeSpotlight })
  const [draft, setDraft] = useState<Record<SpotlightList, SpotlightItem[]> | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (data) setDraft(data.data) }, [data])

  const save = useMutation({
    mutationFn: () => saveHomeSpotlight(Object.fromEntries(LISTS.map(({ key }) => [key, (draft?.[key] ?? []).map((i) => i.id)]))),
    onSuccess: (res) => { setDraft(res.data); setSaved(true); queryClient.invalidateQueries({ queryKey: ["home-spotlight"] }) },
  })
  const error = save.error instanceof ApiError ? (Object.values(save.error.errors ?? {})[0]?.[0] ?? save.error.message) : save.error ? "Something went wrong." : null

  if (isPending || !draft || !data) return <p className="text-sm text-muted-foreground">Loading…</p>

  const set = (key: SpotlightList, items: SpotlightItem[]) => { setSaved(false); setDraft({ ...draft, [key]: items }) }
  const move = (key: SpotlightList, i: number, dir: -1 | 1) => {
    const items = [...draft[key]]
    ;[items[i], items[i + dir]] = [items[i + dir], items[i]]
    set(key, items)
  }
  const ids = (lists: Record<SpotlightList, SpotlightItem[]>) => JSON.stringify(LISTS.map(({ key }) => lists[key].map((i) => i.id)))
  const dirty = ids(draft) !== ids(data.data)

  return (
    <section className="space-y-4 border-t pt-6" aria-labelledby="spotlight-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="spotlight-title" className="text-lg font-semibold text-cas-navy">Hand-picked on the home page</h2>
          <p className="text-sm text-muted-foreground">Choose what shows in the banner and in each tab of the + panel, and put it in the order you want. A list you leave empty fills itself automatically.</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-3">
            {saved && !dirty && <span role="status" className="text-sm text-success">Saved</span>}
            <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>{save.isPending ? "Saving…" : "Save order"}</Button>
          </div>
        )}
      </div>
      {error && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {LISTS.map(({ key, title, where, noun }) => {
          const items = draft[key]
          const max = data.limits[key]

          return (
            <div key={key} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-xs text-muted-foreground">{where} · up to {max}{items.length === 0 ? " · automatic for now" : ` · ${items.length} chosen`}</p>
              </div>
              {items.length > 0 && (
                <ol className="space-y-1.5">
                  {items.map((item, i) => (
                    <li key={item.id} className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{item.label}</span>
                        {item.sub && <span className="block truncate text-xs text-muted-foreground">{item.sub}</span>}
                      </span>
                      {canManage && (
                        <span className="flex shrink-0 items-center">
                          <Button variant="ghost" size="sm" aria-label={`Move ${item.label} up`} disabled={i === 0} onClick={() => move(key, i, -1)}><ArrowUp className="size-4" /></Button>
                          <Button variant="ghost" size="sm" aria-label={`Move ${item.label} down`} disabled={i === items.length - 1} onClick={() => move(key, i, 1)}><ArrowDown className="size-4" /></Button>
                          <Button variant="ghost" size="sm" aria-label={`Remove ${item.label}`} onClick={() => set(key, items.filter((x) => x.id !== item.id))}><X className="size-4" /></Button>
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {canManage && <AddItem list={key} noun={noun} taken={items.map((i) => i.id)} disabled={items.length >= max} onAdd={(o) => set(key, [...items, o])} />}
            </div>
          )
        })}
      </div>
    </section>
  )
}
