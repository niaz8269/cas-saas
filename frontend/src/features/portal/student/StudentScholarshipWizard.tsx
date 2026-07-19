import { useMutation, useQuery } from "@tanstack/react-query"
import { Award, Check, ChevronLeft, Loader2, Plus, ShieldCheck, X } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createScholarshipApplication,
  getCountries,
  getGovernmentScholarships,
  getMajors,
  submitStudentApplication,
  type DraftApplication,
  type GovScholarship,
  type ScholarshipLevel,
  type ScholarshipLevelBenefit,
  type ScholarshipPreference,
  type WizardEducation,
  type WizardGuardian,
} from "@/features/portal/api"
import { PortalCard } from "@/features/portal/components"
import { EMPTY_EDUCATION, type Profile } from "@/features/portal/student/applyShared"
import {
  BackgroundStep,
  DocumentsStep,
  Field,
  ProfileStep,
  SectionTitle,
  Stepper,
  Tile,
} from "@/features/portal/student/applySteps"
import { money } from "@/features/portal/status"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

const LEVELS: { value: ScholarshipLevel; label: string; hint: string }[] = [
  { value: "bachelor", label: "Bachelor / BS", hint: "Undergraduate" },
  { value: "master", label: "Master", hint: "Postgraduate" },
  { value: "phd", label: "PhD", hint: "Doctoral" },
]

const STEPS = ["Scholarship", "Preferences", "Personal", "Background", "Documents", "Review"]
const emptyPref = (): ScholarshipPreference => ({ major: "", university_id: null })

export default function StudentScholarshipWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [level, setLevel] = useState<ScholarshipLevel | "">("")
  const [scholarship, setScholarship] = useState<GovScholarship | null>(null)
  const [preferences, setPreferences] = useState<ScholarshipPreference[]>([emptyPref()])

  const [profile, setProfile] = useState<Profile>({})
  const [guardians, setGuardians] = useState<WizardGuardian[]>([
    { relation: "father", name: "" },
    { relation: "mother", name: "" },
  ])
  const [education, setEducation] = useState<WizardEducation[]>([{ ...EMPTY_EDUCATION }])
  const [emergency, setEmergency] = useState<WizardGuardian>({ relation: "Emergency contact", name: "" })

  const [draft, setDraft] = useState<DraftApplication | null>(null)
  const [uploaded, setUploaded] = useState<Record<number, string>>({})
  const [agreed, setAgreed] = useState(false)

  const scholarships = useQuery({ queryKey: ["gov-scholarships"], queryFn: getGovernmentScholarships, enabled: step === 0 })
  const majors = useQuery({ queryKey: ["majors"], queryFn: getMajors, enabled: step === 1 })
  const countries = useQuery({ queryKey: ["apply", "countries"], queryFn: getCountries })

  const createDraft = useMutation({
    mutationFn: () => createScholarshipApplication({
      scholarship_id: scholarship!.id,
      level: level as ScholarshipLevel,
      preferences: preferences
        .filter((p) => p.major.trim() !== "")
        .map((p) => ({ major: p.major, university_id: p.university_id ? Number(p.university_id) : null })),
      profile: Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== "")),
      guardians: [...guardians, emergency].filter((g) => g.name.trim() !== ""),
      education: education.filter((e) => e.degree_name.trim() !== ""),
    }),
    onSuccess: (res) => { setDraft(res.data); setError(null); setStep(4) },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not start your application."),
  })

  const submit = useMutation({
    mutationFn: () => submitStudentApplication(draft!.id),
    onSuccess: () => navigate("/portal/student/applications", { replace: true }),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not submit. Please try again."),
  })

  const goNext = () => {
    setError(null)
    if (step === 3) {
      if (draft) setStep(4)
      else createDraft.mutate()

      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const goBack = () => { setError(null); setStep((s) => Math.max(s - 1, 0)) }

  const setPref = (i: number, key: keyof ScholarshipPreference, v: string) =>
    setPreferences((ps) => ps.map((p, idx) => (idx === i ? { ...p, [key]: v } : p)))

  const canLeaveScholarship = !!level && !!scholarship
  const hasPreference = preferences.some((p) => p.major.trim() !== "")
  const allDocsUploaded = (draft?.required_documents ?? []).every((d) => uploaded[d.id])

  return (
    <div className="space-y-4 pb-4">
      <div className="overflow-hidden rounded-xl border bg-cas-navy shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3">
          {step > 0 && step < 5 && (
            <button type="button" onClick={goBack} className="text-white/70 hover:text-white" aria-label="Back">
              <ChevronLeft className="size-5" />
            </button>
          )}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.15em] text-cas-gold uppercase">CAS · Study in China</p>
            <h1 className="text-lg font-semibold text-white">Government scholarship</h1>
          </div>
        </div>
      </div>

      <Stepper steps={STEPS} step={step} />

      {error && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}

      {step === 0 && (
        <ScholarshipStep
          level={level}
          scholarship={scholarship}
          scholarships={scholarships.data?.data ?? []}
          loading={scholarships.isFetching}
          onLevel={(l) => { setLevel(l); setScholarship(null) }}
          onScholarship={setScholarship}
        />
      )}

      {step === 1 && (
        <PreferencesStep
          preferences={preferences}
          majors={majors.data?.data ?? []}
          universities={scholarship?.universities ?? []}
          onChange={setPref}
          onAdd={() => setPreferences((ps) => (ps.length < 3 ? [...ps, emptyPref()] : ps))}
          onRemove={(i) => setPreferences((ps) => ps.filter((_, idx) => idx !== i))}
        />
      )}

      {step === 2 && (
        <ProfileStep profile={profile} countries={countries.data?.data ?? []} onChange={(k, v) => setProfile((p) => ({ ...p, [k]: v }))} />
      )}

      {step === 3 && (
        <BackgroundStep
          guardians={guardians} education={education} emergency={emergency}
          onGuardians={setGuardians} onEducation={setEducation} onEmergency={setEmergency}
        />
      )}

      {step === 4 && draft && (
        <DocumentsStep draft={draft} uploaded={uploaded}
          onUploaded={(typeId, name) => setUploaded((u) => ({ ...u, [typeId]: name }))} onError={setError} />
      )}

      {step === 5 && draft && (
        <ReviewStep scholarship={scholarship} level={level as ScholarshipLevel} preferences={preferences} draft={draft} agreed={agreed} onAgreed={setAgreed} />
      )}

      <div className="flex gap-2">
        {step === 0 && <Button className="h-11 w-full" disabled={!canLeaveScholarship} onClick={goNext}>Continue</Button>}
        {step === 1 && <Button className="h-11 w-full" disabled={!hasPreference} onClick={goNext}>Continue</Button>}
        {step === 2 && <Button className="h-11 w-full" onClick={goNext}>Continue</Button>}
        {step === 3 && (
          <Button className="h-11 w-full" disabled={createDraft.isPending} onClick={goNext}>
            {createDraft.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {draft ? "Continue" : "Save & add documents"}
          </Button>
        )}
        {step === 4 && (
          <Button className="h-11 w-full" disabled={!allDocsUploaded} onClick={() => setStep(5)}>
            {allDocsUploaded ? "Review application" : "Upload all required documents"}
          </Button>
        )}
        {step === 5 && (
          <Button className="h-11 w-full" disabled={submit.isPending || !agreed} onClick={() => submit.mutate()}>
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Submit application
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Step 1: degree + scholarship + details ──────────────────────────────────

function ScholarshipStep(props: {
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

// ── Step 2: preferences ─────────────────────────────────────────────────────

function PreferencesStep(props: {
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
      <p className="text-sm text-muted-foreground">Pick up to 3 majors you're interested in (and, optionally, a preferred university). Subject to CAS approval.</p>
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

// ── Step 6: review ──────────────────────────────────────────────────────────

function ReviewStep(props: {
  scholarship: GovScholarship | null
  level: ScholarshipLevel
  preferences: ScholarshipPreference[]
  draft: DraftApplication
  agreed: boolean
  onAgreed: (v: boolean) => void
}) {
  const { scholarship, level, preferences, draft, agreed, onAgreed } = props
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
          I declare that the information provided is true and correct, and I authorise CAS to process this scholarship application on my behalf.
        </span>
      </label>
    </div>
  )
}
