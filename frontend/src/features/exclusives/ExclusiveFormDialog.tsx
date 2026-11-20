import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, X } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { listCountries } from "@/features/crm/api"
import MaterialsPanel from "@/features/exclusives/MaterialsPanel"
import SearchPicker from "@/features/exclusives/SearchPicker"
import {
  AGENCY_LEVELS,
  createExclusive,
  updateExclusive,
  AUDIENCES,
  searchPrograms,
  searchScholarships,
  searchUniversities,
  type AgencyLevel,
  type ExclusiveType,
  type Audience,
  type ExclusiveOffer,
  type ExclusiveWritePayload,
  type FeeRow,
} from "@/features/exclusives/api"
import { ApiError } from "@/lib/api"


interface Form {
  title: string
  offer_type: ExclusiveType
  audience: Audience
  university_id: number | null
  program_id: number | null
  scholarship_id: number | null
  custom_name: string
  custom_university: string
  city: string
  province: string
  programs: string[]
  /** The name shown for the program, scholarship or university picked. */
  link_label: string | null
  summary: string
  rates: Record<AgencyLevel, string>
  commission_notes: string
  fees: FeeRow[]
  fee_notes: string
  eligible: string[]
  restricted: string[]
  nationality_notes: string
  conditions: string
  status: "draft" | "published"
  sort_order: number
}

const emptyRates = (): Form["rates"] => ({ partner: "", sub: "", sub_sub: "" })

/** The program or scholarship name with its university, or just the university name: names only. */
function linkLabel(o?: ExclusiveOffer): string | null {
  if (!o) return null
  if (o.custom_name) return o.custom_name
  const name = o.offer_type === "program" ? o.program?.name : o.offer_type === "scholarship" ? o.scholarship?.name : null
  const label = [name, o.university?.name].filter(Boolean).join(" \u00b7 ")

  return label || null
}

function toForm(o?: ExclusiveOffer): Form {
  const rates = emptyRates()
  for (const level of AGENCY_LEVELS) {
    const r = o?.commission_rates?.[level.value]
    if (r) rates[level.value] = String(r.value)
  }

  return {
    title: o?.title ?? "",
    offer_type: o?.offer_type ?? "program",
    audience: o?.audience ?? "partners",
    university_id: o?.university_id ?? null,
    program_id: o?.program_id ?? null,
    scholarship_id: o?.scholarship_id ?? null,
    custom_name: o?.custom_name ?? "",
    custom_university: o?.custom_university ?? "",
    city: o?.city ?? "",
    province: o?.province ?? "",
    programs: o?.programs_list ?? [],
    link_label: linkLabel(o),
    summary: o?.summary ?? "",
    rates,
    commission_notes: o?.commission_notes ?? "",
    fees: o?.fee_structure ?? [],
    fee_notes: o?.fee_notes ?? "",
    eligible: o?.eligible_nationalities ?? [],
    restricted: o?.restricted_nationalities ?? [],
    nationality_notes: o?.nationality_notes ?? "",
    conditions: o?.conditions ?? "",
    status: o?.status ?? "draft",
    sort_order: o?.sort_order ?? 0,
  }
}

function toPayload(f: Form): ExclusiveWritePayload {
  const commission_rates: ExclusiveWritePayload["commission_rates"] = {}
  for (const level of AGENCY_LEVELS) {
    const value = f.rates[level.value].trim()
    if (value !== "") commission_rates[level.value] = { value }
  }

  return {
    title: f.title.trim(),
    offer_type: f.offer_type,
    audience: f.audience,
    university_id: f.offer_type === "university" ? f.university_id : null,
    program_id: f.offer_type === "program" ? f.program_id : null,
    scholarship_id: f.offer_type === "scholarship" ? f.scholarship_id : null,
    custom_name: f.custom_name.trim() || null,
    custom_university: f.custom_university.trim() || null,
    city: f.city.trim() || null,
    province: f.province.trim() || null,
    programs_list: f.programs,
    summary: f.summary,
    commission_rates,
    commission_notes: f.commission_notes,
    fee_structure: f.fees.filter((r) => r.label.trim() !== "").map((r) => ({ ...r, amount: r.amount === "" ? null : r.amount })),
    fee_notes: f.fee_notes,
    eligible_nationalities: f.eligible,
    restricted_nationalities: f.restricted,
    nationality_notes: f.nationality_notes,
    conditions: f.conditions,
    status: f.status,
    sort_order: Number(f.sort_order) || 0,
  }
}

const selectCls = "h-9 w-full rounded-md border bg-background px-2 text-sm"

/** The programs advertised for a city: type a name and press Enter or Add; each shows as a chip with a remove button. */
function ProgramNames({ names, onChange }: { names: string[]; onChange: (names: string[]) => void }) {
  const [text, setText] = useState("")
  const add = () => {
    const name = text.trim()
    if (name && !names.some((n) => n.toLowerCase() === name.toLowerCase())) onChange([...names, name])
    setText("")
  }

  return (
    <div>
      <Label htmlFor="ex-plist">Programs we advertise here</Label>
      <div className="mt-1 flex gap-2">
        <Input id="ex-plist" value={text} placeholder="e.g. MBBS (English)" maxLength={150}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }} />
        <Button type="button" variant="outline" onClick={add}><Plus className="size-4" aria-hidden /> Add</Button>
      </div>
      {names.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {names.map((n) => (
            <li key={n} className="inline-flex items-center gap-1 rounded-full bg-cas-navy-50 py-0.5 pr-1 pl-3 text-sm text-cas-navy">
              {n}
              <button type="button" onClick={() => onChange(names.filter((x) => x !== n))} aria-label={`Remove ${n}`} className="rounded-full p-1 hover:bg-white"><X className="size-3.5" aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-md border p-4">
      <legend className="px-1 text-sm font-semibold text-cas-navy">{title}</legend>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  )
}

/** Countries as chips: pick from the list, remove with the x. */
function CountryChips({ label, values, onChange, countries }: { label: string; values: string[]; onChange: (v: string[]) => void; countries: string[] }) {
  const id = `chips-${label.replace(/\W+/g, "-")}`

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-cas-navy-50 px-2.5 py-0.5 text-xs text-cas-navy">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}><X className="size-3" /></button>
          </span>
        ))}
      </div>
      <select id={id} value="" onChange={(e) => e.target.value && onChange([...values, e.target.value])} className={`${selectCls} mt-2`}>
        <option value="">Add a country…</option>
        {countries.filter((c) => !values.includes(c)).map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}

export default function ExclusiveFormDialog({ offer, open, onOpenChange }: { offer?: ExclusiveOffer; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Form>(() => toForm(offer))
  const [savedId, setSavedId] = useState<number | null>(offer?.id ?? null)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))

  useEffect(() => {
    if (open) { setForm(toForm(offer)); setSavedId(offer?.id ?? null); setError(null) }
  }, [open, offer])

  const { data: countries } = useQuery({ queryKey: ["countries"], queryFn: listCountries, enabled: open })
  const countryNames = (countries?.data ?? []).map((c) => c.name)

  const save = useMutation({
    mutationFn: () => (savedId ? updateExclusive(savedId, toPayload(form)) : createExclusive(toPayload(form))),
    onSuccess: (res) => {
      setError(null)
      setSavedId(res.data.id)
      void queryClient.invalidateQueries({ queryKey: ["exclusives"] })
      void queryClient.invalidateQueries({ queryKey: ["exclusive", res.data.id] })
    },
    onError: (e) => setError(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : "Could not save."),
  })

  const rowSet = (i: number, patch: Partial<FeeRow>) => set("fees", form.fees.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{offer ? "Edit exclusive" : "New exclusive"}</DialogTitle></DialogHeader>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
          <Section title="What it is">
            <div>
              <Label htmlFor="ex-title">Title</Label>
              <Input id="ex-title" value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={200} />
            </div>
            <div>
              <Label htmlFor="ex-type">What is it about?</Label>
              <select id="ex-type" className={selectCls} value={form.offer_type} onChange={(e) => setForm((f) => ({ ...f, offer_type: e.target.value as ExclusiveType, university_id: null, program_id: null, scholarship_id: null, custom_name: "", custom_university: "", link_label: null }))}>
                <option value="program">A program</option>
                <option value="university">A university</option>
                <option value="scholarship">A scholarship</option>
                <option value="city">A city or province (no university named)</option>
                <option value="other">Something else (a campaign, a package)</option>
              </select>
            </div>
            {form.offer_type === "program" && (
              <SearchPicker id="ex-link" label="Program" queryKey="program" placeholder="Search programs by name" search={searchPrograms} value={form.link_label}
                onPick={(i) => setForm((f) => ({ ...f, program_id: i.id, custom_name: "", custom_university: "", link_label: i.label, title: f.title || i.label.split(" \u00b7 ")[0] }))}
                onCustom={(text) => setForm((f) => ({ ...f, program_id: null, custom_name: text, link_label: text, title: f.title || text }))}
                onClear={() => setForm((f) => ({ ...f, program_id: null, custom_name: "", custom_university: "", link_label: null }))} />
            )}
            {form.offer_type === "scholarship" && (
              <SearchPicker id="ex-link" label="Scholarship" queryKey="scholarship" placeholder="Search scholarships by name" search={searchScholarships} value={form.link_label}
                onPick={(i) => setForm((f) => ({ ...f, scholarship_id: i.id, custom_name: "", custom_university: "", link_label: i.label, title: f.title || i.label.split(" \u00b7 ")[0] }))}
                onCustom={(text) => setForm((f) => ({ ...f, scholarship_id: null, custom_name: text, link_label: text, title: f.title || text }))}
                onClear={() => setForm((f) => ({ ...f, scholarship_id: null, custom_name: "", custom_university: "", link_label: null }))} />
            )}
            {form.offer_type === "university" && (
              <SearchPicker id="ex-link" label="University" queryKey="university" placeholder="Search universities by name" search={searchUniversities} value={form.link_label}
                onPick={(i) => setForm((f) => ({ ...f, university_id: i.id, custom_name: "", link_label: i.label, title: f.title || i.label }))}
                onCustom={(text) => setForm((f) => ({ ...f, university_id: null, custom_name: text, link_label: text, title: f.title || text }))}
                onClear={() => setForm((f) => ({ ...f, university_id: null, custom_name: "", link_label: null }))} />
            )}
            {(form.offer_type === "program" || form.offer_type === "scholarship") && form.custom_name !== "" && (
              <div>
                <Label htmlFor="ex-cuni">University (optional, as you want it shown)</Label>
                <Input id="ex-cuni" value={form.custom_university} onChange={(e) => set("custom_university", e.target.value)} maxLength={200} />
              </div>
            )}
            {form.offer_type === "city" && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="ex-city">City</Label>
                    <Input id="ex-city" value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={100} />
                  </div>
                  <div>
                    <Label htmlFor="ex-province">Province</Label>
                    <Input id="ex-province" value={form.province} onChange={(e) => set("province", e.target.value)} maxLength={100} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Fill in the city, the province, or both. No university is named.</p>
                <ProgramNames names={form.programs} onChange={(names) => set("programs", names)} />
              </div>
            )}
            <div>
              <Label htmlFor="ex-summary">Summary agencies will see first</Label>
              <Textarea id="ex-summary" rows={3} value={form.summary} onChange={(e) => set("summary", e.target.value)} maxLength={2000} />
            </div>
          </Section>

          <Section title="Agency commission (RMB)" hint="The amount in RMB an agency earns at each agency level. A level left empty shows no amount to those agencies.">
            <div className="space-y-2">
              {AGENCY_LEVELS.map((level) => (
                <div key={level.value} className="grid items-center gap-2 sm:grid-cols-[12rem_1fr_3rem]">
                  <Label htmlFor={`rv-${level.value}`} className="text-sm font-medium">{level.label}</Label>
                  <Input id={`rv-${level.value}`} type="number" min={0} step="any" value={form.rates[level.value]} onChange={(e) => set("rates", { ...form.rates, [level.value]: e.target.value })} placeholder="e.g. 3000" />
                  <span className="text-sm text-muted-foreground">RMB</span>
                </div>
              ))}
            </div>
            <div>
              <Label htmlFor="ex-cnotes">Commission notes (per student or per intake, when it is paid, tiers, conditions)</Label>
              <Textarea id="ex-cnotes" rows={3} value={form.commission_notes} onChange={(e) => set("commission_notes", e.target.value)} maxLength={4000} />
            </div>
          </Section>

          <Section title="Fee structure">
            {form.fees.map((r, i) => (
              <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_8rem_5rem_1fr_auto]">
                <Input aria-label={`Fee ${i + 1} name`} placeholder="Tuition" value={r.label} onChange={(e) => rowSet(i, { label: e.target.value })} />
                <Input aria-label={`Fee ${i + 1} amount`} type="number" min={0} step="any" placeholder="Amount" value={r.amount ?? ""} onChange={(e) => rowSet(i, { amount: e.target.value })} />
                <Input aria-label={`Fee ${i + 1} currency`} placeholder="CNY" maxLength={3} value={r.currency ?? ""} onChange={(e) => rowSet(i, { currency: e.target.value.toUpperCase() })} />
                <Input aria-label={`Fee ${i + 1} note`} placeholder="per year" value={r.note ?? ""} onChange={(e) => rowSet(i, { note: e.target.value })} />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove fee ${i + 1}`} onClick={() => set("fees", form.fees.filter((_, j) => j !== i))}><X className="size-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => set("fees", [...form.fees, { label: "", amount: "", currency: "CNY", note: "" }])}><Plus className="size-4" /> Add a fee line</Button>
            <div>
              <Label htmlFor="ex-fnotes">Fee notes</Label>
              <Textarea id="ex-fnotes" rows={2} value={form.fee_notes} onChange={(e) => set("fee_notes", e.target.value)} maxLength={4000} />
            </div>
          </Section>

          <Section title="Nationality" hint="Leave 'eligible' empty to allow every nationality except the restricted ones.">
            <div className="grid gap-4 sm:grid-cols-2">
              <CountryChips label="Eligible nationalities" values={form.eligible} onChange={(v) => set("eligible", v)} countries={countryNames} />
              <CountryChips label="Restricted nationalities" values={form.restricted} onChange={(v) => set("restricted", v)} countries={countryNames} />
            </div>
            <div>
              <Label htmlFor="ex-nnotes">Nationality notes</Label>
              <Textarea id="ex-nnotes" rows={2} value={form.nationality_notes} onChange={(e) => set("nationality_notes", e.target.value)} maxLength={4000} />
            </div>
          </Section>

          <Section title="Conditions">
            <Label htmlFor="ex-cond" className="sr-only">Conditions</Label>
            <Textarea id="ex-cond" rows={5} value={form.conditions} onChange={(e) => set("conditions", e.target.value)} maxLength={8000} placeholder="Age, grades, language, deadlines, refund rules, anything an agency must know before submitting a student." />
          </Section>

          <Section title="Who can see it">
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">Audience</legend>
              {AUDIENCES.map((a) => (
                <label key={a.value} className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm ${form.audience === a.value ? "border-cas-navy bg-cas-navy-50" : ""}`}>
                  <input type="radio" name="audience" value={a.value} checked={form.audience === a.value} onChange={() => set("audience", a.value)} className="mt-1" />
                  <span><span className="block font-semibold">{a.label}</span><span className="text-xs text-muted-foreground">{a.hint}</span></span>
                </label>
              ))}
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ex-status">Status</Label>
                <select id="ex-status" className={selectCls} value={form.status} onChange={(e) => set("status", e.target.value as Form["status"])}>
                  <option value="draft">Draft (only staff with manage access see it)</option>
                  <option value="published">Published (visible to the audience above)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="ex-sort">Order (lower shows first)</Label>
                <Input id="ex-sort" type="number" min={0} value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} />
              </div>
            </div>
          </Section>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="items-center gap-2 sm:justify-between">
            <span className="text-sm text-green-700" aria-live="polite">{save.isSuccess ? "Saved." : ""}</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button type="submit" disabled={save.isPending || form.title.trim() === ""}>{save.isPending ? "Saving…" : savedId ? "Save changes" : "Create"}</Button>
            </div>
          </DialogFooter>
        </form>

        <Section title="Downloadable files" hint={savedId ? "Brochures, banners, price lists and other material for this exclusive." : "Save the exclusive first, then add files."}>
          {savedId ? <MaterialsPanel offerId={savedId} canManage /> : <p className="text-sm text-muted-foreground">Files can be added once it is saved.</p>}
        </Section>
      </DialogContent>
    </Dialog>
  )
}
