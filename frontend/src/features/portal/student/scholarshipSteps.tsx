import { Award, Check, Plus, ShieldCheck, X } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  DraftApplication,
  GovScholarship,
  ScholarshipLevel,
  ScholarshipLevelBenefit,
  ScholarshipPreference,
} from "@/features/portal/api"
import { PortalCard } from "@/features/portal/components"
import { money } from "@/features/portal/status"
import { LEVELS } from "@/features/portal/student/applyShared"
import { Field, SectionTitle, Tile } from "@/features/portal/student/applySteps"
import { cn } from "@/lib/utils"

// ── Level + scholarship + coverage ────────────────────────────────────────────

export function ScholarshipStep(props: {
  level: ScholarshipLevel | ""
  scholarship: GovScholarship | null
  scholarships: GovScholarship[]
  loading: boolean
  onLevel: (l: ScholarshipLevel) => void
  onScholarship: (s: GovScholarship) => void
}) {
  const { level, scholarship, scholarships, loading } = props
  const benefit: ScholarshipLevelBenefit | undefined = level && scholarship ? scholarship.benefits?.[level] : undefined
  const cur = scholarship?.currency ?? undefined
  const val = (v: number | string | null | undefined) => (v == null ? "—" : money(v, cur))

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">Which degree?</p>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((l) => (
            <Tile key={l.value} active={level === l.value} label={l.label} hint={l.hint} onClick={() => props.onLevel(l.value)} />
          ))}
        </div>
      </div>

      {level && (
        <div>
          <p className="mb-2 text-sm font-medium">Choose a scholarship</p>
          {loading && <p className="text-sm text-muted-foreground">Loading scholarships…</p>}
          {!loading && scholarships.length === 0 && (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">No government scholarships are open right now.</p>
          )}
          <div className="space-y-2">
            {scholarships.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => props.onScholarship(s)}
                className={cn(
                  "w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-colors",
                  scholarship?.id === s.id ? "border-cas-navy ring-1 ring-cas-navy" : "hover:border-cas-navy/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium"><Award className="size-4 text-cas-gold-600" /> {s.name}</p>
                    {s.coverage && <p className="text-sm text-muted-foreground">{s.coverage}</p>}
                  </div>
                  {scholarship?.id === s.id && <Check className="size-5 shrink-0 text-cas-navy" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {scholarship && (
        <PortalCard className="space-y-3">
          <SectionTitle>What this scholarship covers ({LEVELS.find((l) => l.value === level)?.label})</SectionTitle>
          {scholarship.description && <p className="text-sm text-muted-foreground">{scholarship.description}</p>}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg bg-subtle p-2.5">
              <p className="text-[11px] tracking-wider text-muted-foreground uppercase">Tuition after</p>
              <p className="mt-0.5 font-medium tabular-nums">{val(benefit?.tuition_after)}</p>
            </div>
            <div className="rounded-lg bg-subtle p-2.5">
              <p className="text-[11px] tracking-wider text-muted-foreground uppercase">Hostel after</p>
              <p className="mt-0.5 font-medium tabular-nums">{val(benefit?.hostel_after)}</p>
            </div>
            <div className="rounded-lg bg-subtle p-2.5">
              <p className="text-[11px] tracking-wider text-muted-foreground uppercase">Stipend / mo</p>
              <p className="mt-0.5 font-medium tabular-nums">{val(benefit?.stipend_monthly)}</p>
            </div>
          </div>
          {scholarship.universities.length > 0 && (
            <p className="text-xs text-muted-foreground">Enrols at: {scholarship.universities.map((u) => u.name).join(", ")}</p>
          )}
        </PortalCard>
      )}
    </div>
  )
}

// ── Up to three major/university preferences ──────────────────────────────────

export function PreferencesStep(props: {
  preferences: ScholarshipPreference[]
  majors: { id: number; name: string }[]
  universities: { id: number; name: string }[]
  onChange: (i: number, key: keyof ScholarshipPreference, v: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  const { preferences, majors, universities } = props

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Pick up to 3 majors (and, optionally, a preferred university). Subject to CAS approval.</p>
      {preferences.map((p, i) => (
        <PortalCard key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Preference {i + 1}</span>
            {preferences.length > 1 && (
              <button type="button" onClick={() => props.onRemove(i)} aria-label="Remove preference">
                <X className="size-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Field label="Major">
            <Select value={p.major} onValueChange={(v) => props.onChange(i, "major", v)}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Choose a major" /></SelectTrigger>
              <SelectContent>
                {majors.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Preferred university (optional)">
            <Select value={p.university_id ? String(p.university_id) : ""} onValueChange={(v) => props.onChange(i, "university_id", v)}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Any university" /></SelectTrigger>
              <SelectContent>
                {universities.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </PortalCard>
      ))}
      {preferences.length < 3 && (
        <Button type="button" variant="secondary" className="w-full" onClick={props.onAdd}>
          <Plus className="size-4" /> Add preference
        </Button>
      )}
    </div>
  )
}

// ── Final summary + declaration ───────────────────────────────────────────────

export function ScholarshipReviewStep(props: {
  scholarship: GovScholarship | null
  level: ScholarshipLevel
  preferences: ScholarshipPreference[]
  draft: DraftApplication
  agreed: boolean
  onAgreed: (v: boolean) => void
  /** Overrides the default (student self-apply) declaration wording. */
  declaration?: ReactNode
}) {
  const { scholarship, level, preferences, draft, agreed, onAgreed, declaration } = props
  const uniName = (id: number | null | undefined) =>
    id ? (scholarship?.universities.find((u) => u.id === Number(id))?.name ?? "—") : "Any university"

  return (
    <div className="space-y-4">
      <PortalCard className="space-y-3">
        <SectionTitle>Summary</SectionTitle>
        <div className="flex items-center gap-2 text-cas-navy">
          <Award className="size-5" />
          <p className="font-medium">{scholarship?.name}</p>
        </div>
        <p className="text-sm text-muted-foreground capitalize">{LEVELS.find((l) => l.value === level)?.label}</p>
        <ol className="space-y-1 text-sm">
          {preferences.filter((p) => p.major.trim() !== "").map((p, i) => (
            <li key={i}><strong>{i + 1}.</strong> {p.major} <span className="text-muted-foreground">→ {uniName(p.university_id)}</span></li>
          ))}
        </ol>
        <div className="rounded-lg bg-subtle p-3 text-sm">
          <p>Reference <strong>{draft.application_code}</strong></p>
          <p className="mt-1 text-muted-foreground">{draft.required_documents.length} document(s) attached · subject to CAS approval.</p>
        </div>
      </PortalCard>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <input type="checkbox" checked={agreed} onChange={(e) => onAgreed(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-cas-navy" />
        <span className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cas-navy" />
          {declaration ?? "I declare that the information provided is true and correct, and I authorise CAS to process this scholarship application on my behalf."}
        </span>
      </label>
    </div>
  )
}
