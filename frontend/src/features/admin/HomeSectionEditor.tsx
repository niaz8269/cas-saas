import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateHomeSection, type HomeSectionRow } from "@/features/admin/api"
import { SECTION_DEFS, type InputKind, type ListDef } from "@/features/admin/homeSchema"
import ImageUpload from "@/features/catalog/ImageUpload"
import { LOCALES, type HomeContent, type Locale } from "@/features/site/homeContent"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

const LANGUAGE_NAMES: Record<Locale, string> = { en: "English", zh: "中文", ar: "العربية", fr: "Français", id: "Indonesia" }

interface LocaleDraft { texts: Record<string, string>; lists: Record<string, Record<string, string>[]> }
type Draft = { images: Record<string, string> } & Partial<Record<Locale, LocaleDraft>>

function toDraft(content: HomeContent | null): Draft {
  const draft: Draft = { images: { ...(content?.images ?? {}) } }
  for (const l of LOCALES) {
    const c = content?.[l] as Partial<LocaleDraft> | undefined
    if (c) draft[l] = { texts: { ...(c.texts ?? {}) }, lists: structuredClone(c.lists ?? {}) }
  }

  return draft
}

/** Only what differs from the standard goes to the server: blanks and untouched lists are dropped. */
function toContent(draft: Draft): HomeContent | null {
  const out: Record<string, unknown> = {}
  const images = Object.fromEntries(Object.entries(draft.images).filter(([, v]) => v))
  if (Object.keys(images).length) out.images = images
  for (const l of LOCALES) {
    const d = draft[l]
    if (!d) continue
    const texts = Object.fromEntries(Object.entries(d.texts).filter(([, v]) => v.trim() !== ""))
    const lists = Object.fromEntries(Object.entries(d.lists).filter(([, v]) => v.length > 0))
    if (Object.keys(texts).length || Object.keys(lists).length) out[l] = { ...(Object.keys(texts).length ? { texts } : {}), ...(Object.keys(lists).length ? { lists } : {}) }
  }

  return Object.keys(out).length ? (out as HomeContent) : null
}

function Entry({ kind, value, placeholder, onChange, id, label }: { kind: InputKind; value: string; placeholder?: string; onChange: (v: string) => void; id: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      {kind === "textarea"
        ? <Textarea id={id} rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <Input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={kind === "link" ? "font-mono text-xs" : undefined} />}
      {kind === "link" && <p className="text-[11px] text-muted-foreground">Start with / for a page on this site (like /site/contact) or https:// for another website.</p>}
    </div>
  )
}

function ListEditor({ def, rows, standard, onChange, idPrefix }: { def: ListDef; rows: Record<string, string>[] | undefined; standard: Record<string, string>[]; onChange: (rows: Record<string, string>[] | undefined) => void; idPrefix: string }) {
  if (!rows) {
    return (
      <div className="rounded-lg border bg-subtle/60 p-4">
        <p className="text-sm font-medium">{def.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">Showing the standard list ({standard.length}). {def.help}</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => onChange(structuredClone(standard))}>Edit this list</Button>
      </div>
    )
  }

  const move = (i: number, d: -1 | 1) => {
    const next = [...rows]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{def.label}</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>Use the standard list</Button>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="space-y-3 rounded-md border bg-card p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {def.fields.map((fd) => (
              <div key={fd.key} className={fd.kind === "textarea" ? "sm:col-span-2" : undefined}>
                <Entry id={`${idPrefix}-${i}-${fd.key}`} label={fd.label} kind={fd.kind} value={row[fd.key] ?? ""} onChange={(v) => onChange(rows.map((r, j) => (j === i ? { ...r, [fd.key]: v } : r)))} />
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" aria-label={`Move item ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
            <Button type="button" variant="ghost" size="sm" aria-label={`Move item ${i + 1} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
            <Button type="button" variant="ghost" size="sm" aria-label={`Remove item ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
          </div>
        </div>
      ))}
      {rows.length < def.max && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, Object.fromEntries(def.fields.map((fd) => [fd.key, ""]))])}><Plus className="size-4" /> Add</Button>
      )}
    </div>
  )
}

/** Edit one home page section: text per language, links, lists and pictures. */
export default function HomeSectionEditor({ section, onClose }: { section: HomeSectionRow; onClose: () => void }) {
  const { i18n } = useTranslation()
  const queryClient = useQueryClient()
  const def = SECTION_DEFS[section.type]
  const [locale, setLocale] = useState<Locale>("en")
  const [draft, setDraft] = useState<Draft>(() => toDraft(section.content))
  const t = useMemo(() => i18n.getFixedT(locale), [i18n, locale])

  const texts = draft[locale]?.texts ?? {}
  const setText = (key: string, value: string) => setDraft((d) => ({ ...d, [locale]: { texts: { ...(d[locale]?.texts ?? {}), [key]: value }, lists: d[locale]?.lists ?? {} } }))
  const setList = (key: string, rows: Record<string, string>[] | undefined) =>
    setDraft((d) => {
      const lists = { ...(d[locale]?.lists ?? {}) }
      if (rows) lists[key] = rows
      else delete lists[key]

      return { ...d, [locale]: { texts: d[locale]?.texts ?? {}, lists } }
    })

  const save = useMutation({
    mutationFn: () => updateHomeSection(section.id, { content: toContent(draft) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["home-sections"] }); onClose() },
  })
  const error = save.error instanceof ApiError ? (Object.values(save.error.errors ?? {})[0]?.[0] ?? save.error.message) : null

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{def?.title ?? section.key}</DialogTitle>
          <p className="text-sm text-muted-foreground">{def?.description}</p>
        </DialogHeader>

        <div role="tablist" aria-label="Language" className="flex flex-wrap gap-1 rounded-lg bg-subtle p-1">
          {LOCALES.map((l) => (
            <button key={l} role="tab" type="button" aria-selected={locale === l} onClick={() => setLocale(l)}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium", locale === l ? "bg-card text-cas-navy shadow-sm" : "text-muted-foreground")}>
              {LANGUAGE_NAMES[l]}
            </button>
          ))}
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          Leave a box empty to keep the standard text. Text you change here is shown to visitors using {LANGUAGE_NAMES[locale]}; other languages keep their own text.
        </p>

        <div className="space-y-4">
          {def?.fields.map((fd) => (
            <Entry key={fd.key} id={`hs-${fd.key}`} label={fd.label} kind={fd.kind} value={texts[fd.key] ?? ""} placeholder={fd.standard(t)} onChange={(v) => setText(fd.key, v)} />
          ))}
          {def?.lists?.map((ld) => (
            <ListEditor key={`${locale}-${ld.key}`} def={ld} idPrefix={`hs-${ld.key}`} rows={draft[locale]?.lists?.[ld.key]} standard={ld.standard(t)} onChange={(rows) => setList(ld.key, rows)} />
          ))}
          {def?.images?.map((im) => (
            <div key={im.key} className="space-y-1">
              <ImageUpload label={im.label} aspect="wide" previewUrl={draft.images[im.key] ?? null} onChange={(path) => setDraft((d) => ({ ...d, images: { ...d.images, [im.key]: path } }))} />
              {im.help && <p className="text-xs text-muted-foreground">{im.help}</p>}
              {draft.images[im.key] && <Button type="button" variant="ghost" size="sm" onClick={() => setDraft((d) => ({ ...d, images: { ...d.images, [im.key]: "" } }))}>Remove picture</Button>}
            </div>
          ))}
          {def && def.fields.length === 0 && !def.lists && !def.images && <p className="text-sm text-muted-foreground">Nothing to edit here. You can still move or hide this section.</p>}
        </div>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
