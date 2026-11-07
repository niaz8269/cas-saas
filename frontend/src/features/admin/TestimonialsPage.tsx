import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createTestimonial, deleteTestimonial, listTestimonials, updateTestimonial } from "@/features/admin/api"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

const TABS = [
  { value: "pending", label: "To review" },
  { value: "approved", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All" },
] as const

const BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-warning",
  approved: "bg-green-50 text-success",
  rejected: "bg-cas-red-50 text-destructive",
}

/** Review what students and partners wrote, and add ones that were given to us in writing. */
export default function TestimonialsPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<string>("pending")
  const [adding, setAdding] = useState(false)

  const list = useQuery({ queryKey: ["testimonials", status], queryFn: () => listTestimonials({ status: status || undefined }) })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["testimonials"] })

  const setState = useMutation({ mutationFn: ({ id, to }: { id: number; to: "approved" | "rejected" }) => updateTestimonial(id, { status: to }), onSuccess: refresh })
  const remove = useMutation({ mutationFn: (id: number) => deleteTestimonial(id), onSuccess: refresh })

  const rows = list.data?.data ?? []
  const actionError = (setState.error ?? remove.error) instanceof ApiError ? (setState.error ?? remove.error)?.message : null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-cas-navy">Testimonials</h1>
          <p className="text-sm text-muted-foreground">Words from students and partners. Only published ones, with the author's consent, appear on the website.</p>
        </div>
        <Button onClick={() => setAdding((v) => !v)}><Plus className="size-4" /> Add testimonial</Button>
      </div>

      {adding && <AddForm onDone={() => { setAdding(false); refresh() }} />}

      <div role="tablist" aria-label="Status" className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t.label} role="tab" aria-selected={status === t.value} type="button" onClick={() => setStatus(t.value)}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", status === t.value ? "bg-cas-navy-50 text-cas-navy" : "text-muted-foreground hover:bg-muted")}>
            {t.label}
          </button>
        ))}
      </div>

      {actionError && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{actionError}</p>}

      {list.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Nothing here yet. Students and partners can send theirs from their portal.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{r.name}</span>
                <Badge variant="secondary" className="capitalize">{r.audience}</Badge>
                <Badge className={cn("capitalize", BADGE[r.status])}>{r.status}</Badge>
                {!r.consent_public && <Badge className="bg-cas-red-50 text-destructive">No consent</Badge>}
                <span className="text-xs text-muted-foreground">{[r.headline, r.country].filter(Boolean).join(" · ")}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">“{r.quote}”</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "approved" && r.consent_public && (
                  <Button size="sm" onClick={() => setState.mutate({ id: r.id, to: "approved" })} disabled={setState.isPending}><Check className="size-4" /> Publish</Button>
                )}
                {r.status !== "rejected" && (
                  <Button size="sm" variant="outline" onClick={() => setState.mutate({ id: r.id, to: "rejected" })} disabled={setState.isPending}><X className="size-4" /> Reject</Button>
                )}
                <Button size="sm" variant="ghost" aria-label={`Delete testimonial from ${r.name}`}
                  onClick={() => { if (window.confirm(`Delete the testimonial from ${r.name}? This cannot be undone.`)) remove.mutate(r.id) }}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [audience, setAudience] = useState<"student" | "agent">("student")
  const [name, setName] = useState("")
  const [headline, setHeadline] = useState("")
  const [country, setCountry] = useState("")
  const [quote, setQuote] = useState("")
  const [consent, setConsent] = useState(false)

  const save = useMutation({
    mutationFn: () => createTestimonial({ audience, name: name.trim(), headline: headline.trim() || undefined, country: country.trim() || undefined, quote: quote.trim(), consent_public: consent }),
    onSuccess: onDone,
  })
  const err = save.error instanceof ApiError ? save.error : null

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} noValidate className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">Only add words that the person gave you in writing and agreed to show on the website.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tm-aud">From</Label>
          <select id="tm-aud" value={audience} onChange={(e) => setAudience(e.target.value as "student" | "agent")} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            <option value="student">A student</option>
            <option value="agent">A partner</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tm-name">Name as shown</Label>
          <Input id="tm-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={err?.errors?.name ? true : undefined} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tm-headline">Study or business</Label>
          <Input id="tm-headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tm-country">Country</Label>
          <Input id="tm-country" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tm-quote">Their words</Label>
        <Textarea id="tm-quote" rows={4} value={quote} onChange={(e) => setQuote(e.target.value)} aria-invalid={err?.errors?.quote ? true : undefined} />
      </div>
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 shrink-0 rounded border-input accent-[#14357C]" />
        <span>This person agreed to be shown on the website.</span>
      </label>
      {err && <p role="alert" className="text-sm text-destructive">{Object.values(err.errors ?? {})[0]?.[0] ?? err.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Publish"}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  )
}
