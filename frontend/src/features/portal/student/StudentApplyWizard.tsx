import { useMutation, useQuery } from "@tanstack/react-query"
import { Check, ChevronLeft, GraduationCap, Loader2, Plus, ShieldCheck, Upload, X } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createStudentApplication,
  getApplicationAvailability,
  getCountries,
  getFundingOptions,
  submitStudentApplication,
  uploadApplicationDocument,
  type CountryRow,
  type CreateApplicationPayload,
  type Degree,
  type DraftApplication,
  type Funding,
  type FundingOptions,
  type WizardEducation,
  type WizardGuardian,
  type WizardProgram,
} from "@/features/portal/api"
import { PortalCard } from "@/features/portal/components"
import { money } from "@/features/portal/status"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

const DEGREES: { value: Degree; label: string; hint: string }[] = [
  { value: "mbbs", label: "MBBS", hint: "Bachelor of Medicine" },
  { value: "bds", label: "BDS", hint: "Bachelor of Dental Surgery" },
  { value: "bs", label: "Bachelor (BS)", hint: "Undergraduate degree" },
  { value: "master", label: "Master", hint: "Postgraduate degree" },
  { value: "phd", label: "PhD", hint: "Doctoral degree" },
  { value: "diploma", label: "Diploma", hint: "Short qualification" },
]

const FUNDING: { value: Funding; label: string; hint: string }[] = [
  { value: "self", label: "Self-funded", hint: "Pay tuition yourself" },
  { value: "scholarship", label: "Scholarship", hint: "Full scholarship" },
  { value: "partial", label: "Partial scholarship", hint: "Partial support" },
]

const STEPS = ["Course", "Personal", "Background", "Documents", "Review"]

type Profile = Record<string, string>

const EMPTY_EDUCATION: WizardEducation = { degree_name: "", level: "intermediate" }

export default function StudentApplyWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Course
  const [degree, setDegree] = useState<Degree | "">("")
  const [funding, setFunding] = useState<Funding | "">("")
  const [program, setProgram] = useState<WizardProgram | null>(null)
  const [intakeId, setIntakeId] = useState<string>("")
  const [scholarshipId, setScholarshipId] = useState<string>("")

  // Applicant
  const [profile, setProfile] = useState<Profile>({})
  const [guardians, setGuardians] = useState<WizardGuardian[]>([
    { relation: "father", name: "" },
    { relation: "mother", name: "" },
  ])
  const [education, setEducation] = useState<WizardEducation[]>([{ ...EMPTY_EDUCATION }])
  const [emergency, setEmergency] = useState<WizardGuardian>({ relation: "Emergency contact", name: "" })

  // Draft + uploads
  const [draft, setDraft] = useState<DraftApplication | null>(null)
  const [uploaded, setUploaded] = useState<Record<number, string>>({})
  const [agreed, setAgreed] = useState(false)

  const availability = useQuery({
    queryKey: ["apply", "availability", degree, funding],
    queryFn: () => getApplicationAvailability(degree as Degree, funding as Funding),
    enabled: step === 0 && !!degree && !!funding,
  })

  const countries = useQuery({ queryKey: ["apply", "countries"], queryFn: getCountries })

  const fundingOpts = useQuery({
    queryKey: ["apply", "funding-options", degree],
    queryFn: () => getFundingOptions(degree as Degree),
    enabled: step === 0 && !!degree,
  })

  const resetDraft = () => {
    setDraft(null)
    setUploaded({})
  }

  const createDraft = useMutation({
    mutationFn: () => {
      const payload: CreateApplicationPayload = {
        program_id: program!.id,
        funding: funding as Funding,
        scholarship_id: scholarshipId ? Number(scholarshipId) : null,
        intake_id: intakeId ? Number(intakeId) : null,
        profile: Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== "")),
        guardians: [...guardians, emergency].filter((g) => g.name.trim() !== ""),
        education: education.filter((e) => e.degree_name.trim() !== ""),
      }

      return createStudentApplication(payload)
    },
    onSuccess: (res) => {
      setDraft(res.data)
      setError(null)
      setStep(3)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not start your application."),
  })

  const submit = useMutation({
    mutationFn: () => submitStudentApplication(draft!.id),
    onSuccess: () => navigate("/portal/student/applications", { replace: true }),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not submit. Please try again."),
  })

  const goNext = () => {
    setError(null)
    if (step === 2) {
      if (draft) setStep(3)
      else createDraft.mutate()

      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  const canLeaveCourse = !!program && (funding === "self" || !!scholarshipId)
  const allDocsUploaded = (draft?.required_documents ?? []).every((d) => uploaded[d.id])

  return (
    <div className="space-y-4 pb-4">
      <div className="overflow-hidden rounded-xl border bg-cas-navy shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3">
          {step > 0 && step < 4 && (
            <button type="button" onClick={goBack} className="text-white/70 hover:text-white" aria-label="Back">
              <ChevronLeft className="size-5" />
            </button>
          )}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.15em] text-cas-gold uppercase">CAS · Study in China</p>
            <h1 className="text-lg font-semibold text-white">Application form</h1>
          </div>
        </div>
      </div>

      <Stepper step={step} />

      {error && (
        <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {step === 0 && (
        <CourseStep
          degree={degree}
          funding={funding}
          program={program}
          intakeId={intakeId}
          scholarshipId={scholarshipId}
          programs={availability.data?.data ?? []}
          loading={availability.isFetching}
          failed={availability.isError}
          fundingAvailable={fundingOpts.data?.data}
          fundingLoading={fundingOpts.isFetching}
          onDegree={(d) => { setDegree(d); setFunding(""); setProgram(null); resetDraft() }}
          onFunding={(f) => { setFunding(f); setProgram(null); setScholarshipId(""); resetDraft() }}
          onProgram={(p) => { setProgram(p); setIntakeId(""); setScholarshipId(""); resetDraft() }}
          onIntake={setIntakeId}
          onScholarship={setScholarshipId}
        />
      )}

      {step === 1 && (
        <ProfileStep
          profile={profile}
          countries={countries.data?.data ?? []}
          onChange={(k, v) => setProfile((p) => ({ ...p, [k]: v }))}
        />
      )}

      {step === 2 && (
        <BackgroundStep
          guardians={guardians}
          education={education}
          emergency={emergency}
          onGuardians={setGuardians}
          onEducation={setEducation}
          onEmergency={setEmergency}
        />
      )}

      {step === 3 && draft && (
        <DocumentsStep
          draft={draft}
          uploaded={uploaded}
          onUploaded={(typeId, name) => setUploaded((u) => ({ ...u, [typeId]: name }))}
          onError={setError}
        />
      )}

      {step === 4 && draft && (
        <ReviewStep program={program} draft={draft} agreed={agreed} onAgreed={setAgreed} />
      )}

      {/* Footer actions */}
      <div className="flex gap-2">
        {step === 0 && (
          <Button className="h-11 w-full" disabled={!canLeaveCourse} onClick={goNext}>Continue</Button>
        )}
        {(step === 1) && (
          <Button className="h-11 w-full" onClick={goNext}>Continue</Button>
        )}
        {step === 2 && (
          <Button className="h-11 w-full" disabled={createDraft.isPending} onClick={goNext}>
            {createDraft.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {draft ? "Continue" : "Save & add documents"}
          </Button>
        )}
        {step === 3 && (
          <Button className="h-11 w-full" disabled={!allDocsUploaded} onClick={() => setStep(4)}>
            {allDocsUploaded ? "Review application" : "Upload all required documents"}
          </Button>
        )}
        {step === 4 && (
          <Button className="h-11 w-full" disabled={submit.isPending || !agreed} onClick={() => submit.mutate()}>
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Submit application
          </Button>
        )}
      </div>
    </div>
  )
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-start">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            <div className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : i <= step ? "bg-cas-navy" : "bg-muted")} />
            <div className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
              i < step
                ? "border-cas-navy bg-cas-navy text-white"
                : i === step
                  ? "border-cas-navy text-cas-navy"
                  : "border-muted text-muted-foreground",
            )}>
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </div>
            <div className={cn("h-0.5 flex-1", i === STEPS.length - 1 ? "bg-transparent" : i < step ? "bg-cas-navy" : "bg-muted")} />
          </div>
          <span className={cn("mt-1 text-[10px]", i === step ? "font-medium text-cas-navy" : "text-muted-foreground")}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Step 1: course ──────────────────────────────────────────────────────────

function CourseStep(props: {
  degree: Degree | ""
  funding: Funding | ""
  program: WizardProgram | null
  intakeId: string
  scholarshipId: string
  programs: WizardProgram[]
  loading: boolean
  failed: boolean
  fundingAvailable?: FundingOptions
  fundingLoading: boolean
  onDegree: (d: Degree) => void
  onFunding: (f: Funding) => void
  onProgram: (p: WizardProgram) => void
  onIntake: (id: string) => void
  onScholarship: (id: string) => void
}) {
  const { degree, funding, program, programs, loading, failed, fundingAvailable, fundingLoading } = props

  // Only offer a funding tile the admin has actually enabled for this degree
  // (self is always available; scholarship/partial gate on a matching award).
  const fundingTiles = FUNDING.filter((f) => f.value === "self" || fundingAvailable?.[f.value])
  const noScholarships = !!fundingAvailable && !fundingAvailable.scholarship && !fundingAvailable.partial

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">Which degree?</p>
        <div className="grid grid-cols-2 gap-2">
          {DEGREES.map((d) => (
            <Tile key={d.value} active={degree === d.value} label={d.label} hint={d.hint} onClick={() => props.onDegree(d.value)} />
          ))}
        </div>
      </div>

      {degree && (
        <div>
          <p className="mb-2 text-sm font-medium">How will you fund it?</p>
          {fundingLoading && !fundingAvailable ? (
            <p className="text-sm text-muted-foreground">Checking options…</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2">
                {fundingTiles.map((f) => (
                  <Tile key={f.value} active={funding === f.value} label={f.label} hint={f.hint} onClick={() => props.onFunding(f.value)} />
                ))}
              </div>
              {noScholarships && (
                <p className="mt-2 text-xs text-muted-foreground">No scholarships are currently offered for this degree — self-funded only.</p>
              )}
            </>
          )}
        </div>
      )}

      {degree && funding && (
        <div>
          <p className="mb-2 text-sm font-medium">Available programs</p>
          {loading && <p className="text-sm text-muted-foreground">Finding programs…</p>}
          {failed && <p className="text-sm text-destructive">Could not load programs. Go back and try again.</p>}
          {!loading && !failed && programs.length === 0 && (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              No programs match this combination yet. Try a different degree or funding option.
            </p>
          )}
          <div className="space-y-2">
            {programs.map((p) => {
              const active = program?.id === p.id

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => props.onProgram(p)}
                  className={cn(
                    "w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-colors",
                    active ? "border-cas-navy ring-1 ring-cas-navy" : "hover:border-cas-navy/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.university.name}{p.university.city ? ` · ${p.university.city}` : ""}
                      </p>
                    </div>
                    {active && <Check className="size-5 shrink-0 text-cas-navy" />}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {p.teaching_language && <Chip>{p.teaching_language}</Chip>}
                    {p.duration_months && <Chip>{p.duration_months} months</Chip>}
                    {p.tuition_fee != null && <Chip>{money(p.tuition_fee, p.currency)}/yr</Chip>}
                    {p.university.moe_listed && <Chip>MoE-listed</Chip>}
                  </div>
                  {p.service_charge && (
                    <p className="mt-2 text-xs font-medium text-cas-navy">
                      CAS service fee: {money(p.service_charge.amount, p.service_charge.currency)}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {program && (
        <div className="space-y-3 rounded-xl border bg-subtle p-4">
          {program.intakes.length > 0 && (
            <div>
              <Label className="text-sm">Intake</Label>
              <Select value={props.intakeId} onValueChange={props.onIntake}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Choose an intake (optional)" /></SelectTrigger>
                <SelectContent>
                  {program.intakes.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.name}{i.application_deadline ? ` · apply by ${new Date(i.application_deadline).toLocaleDateString()}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {funding !== "self" && (
            <div>
              <Label className="text-sm">Scholarship</Label>
              {program.scholarships.length > 0 ? (
                <Select value={props.scholarshipId} onValueChange={props.onScholarship}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Choose a scholarship" /></SelectTrigger>
                  <SelectContent>
                    {program.scholarships.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}{s.coverage ? ` · ${s.coverage}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No scholarships listed for this university.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Step 2: personal ────────────────────────────────────────────────────────

function ProfileStep({ profile, countries, onChange }: {
  profile: Profile
  countries: CountryRow[]
  onChange: (k: string, v: string) => void
}) {
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => onChange(k, e.target.value)
  const hasTest = !!profile.english_test && profile.english_test !== "None"

  return (
    <div className="space-y-4">
      <PortalCard className="space-y-3">
        <SectionTitle>Personal details</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of birth"><Input type="date" value={profile.dob ?? ""} onChange={set("dob")} /></Field>
          <Field label="Place of birth"><Input value={profile.place_of_birth ?? ""} onChange={set("place_of_birth")} /></Field>
          <Field label="Nationality">
            <Select value={profile.country_id ?? ""} onValueChange={(v) => onChange("country_id", v)}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {countries.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Gender">
            <Select value={profile.gender ?? ""} onValueChange={(v) => onChange("gender", v)}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Marital status">
            <Select value={profile.marital_status ?? ""} onValueChange={(v) => onChange("marital_status", v)}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Phone"><Input value={profile.phone ?? ""} onChange={set("phone")} /></Field>
          <Field label="Religion (optional)"><Input value={profile.religion ?? ""} onChange={set("religion")} /></Field>
        </div>
      </PortalCard>

      <PortalCard className="space-y-3">
        <SectionTitle>Passport</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Passport no."><Input value={profile.passport_no ?? ""} onChange={set("passport_no")} /></Field>
          <div />
          <Field label="Issue date"><Input type="date" value={profile.passport_issue_date ?? ""} onChange={set("passport_issue_date")} /></Field>
          <Field label="Expiry date"><Input type="date" value={profile.passport_expiry_date ?? ""} onChange={set("passport_expiry_date")} /></Field>
        </div>
      </PortalCard>

      <PortalCard className="space-y-3">
        <SectionTitle>English proficiency</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Test taken">
            <Select value={profile.english_test ?? ""} onValueChange={(v) => onChange("english_test", v)}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IELTS">IELTS</SelectItem>
                <SelectItem value="TOEFL">TOEFL</SelectItem>
                <SelectItem value="PTE Academic">PTE Academic</SelectItem>
                <SelectItem value="Duolingo">Duolingo</SelectItem>
                <SelectItem value="None">None / not taken</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {hasTest && <Field label="Overall score"><Input value={profile.english_test_score ?? ""} onChange={set("english_test_score")} placeholder="e.g. 6.5" /></Field>}
          {hasTest && <Field label="Test date"><Input type="date" value={profile.english_test_date ?? ""} onChange={set("english_test_date")} /></Field>}
        </div>
      </PortalCard>

      <PortalCard className="space-y-3">
        <SectionTitle>Address</SectionTitle>
        <div className="space-y-3">
          <Field label="Permanent address"><Input value={profile.permanent_address ?? ""} onChange={set("permanent_address")} /></Field>
          <Field label="Current address"><Input value={profile.current_address ?? ""} onChange={set("current_address")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City"><Input value={profile.city ?? ""} onChange={set("city")} /></Field>
            <Field label="Postal code"><Input value={profile.postal_code ?? ""} onChange={set("postal_code")} /></Field>
          </div>
        </div>
      </PortalCard>
    </div>
  )
}

// ── Step 3: family + education ───────────────────────────────────────────────

function BackgroundStep(props: {
  guardians: WizardGuardian[]
  education: WizardEducation[]
  emergency: WizardGuardian
  onGuardians: (g: WizardGuardian[]) => void
  onEducation: (e: WizardEducation[]) => void
  onEmergency: (g: WizardGuardian) => void
}) {
  const { guardians, education, emergency } = props

  const setGuardian = (i: number, k: keyof WizardGuardian, v: string) =>
    props.onGuardians(guardians.map((g, idx) => (idx === i ? { ...g, [k]: v } : g)))

  const setEdu = (i: number, k: keyof WizardEducation, v: string) =>
    props.onEducation(education.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)))

  const setEmerg = (k: keyof WizardGuardian, v: string) => props.onEmergency({ ...emergency, [k]: v })

  return (
    <div className="space-y-4">
      <PortalCard className="space-y-3">
        <SectionTitle>Family</SectionTitle>
        {guardians.map((g, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{g.relation}</span>
              {i > 1 && (
                <button type="button" onClick={() => props.onGuardians(guardians.filter((_, idx) => idx !== i))} aria-label="Remove">
                  <X className="size-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Name"><Input value={g.name} onChange={(e) => setGuardian(i, "name", e.target.value)} /></Field>
              <Field label="Occupation"><Input value={g.occupation ?? ""} onChange={(e) => setGuardian(i, "occupation", e.target.value)} /></Field>
              <Field label="Phone"><Input value={g.phone ?? ""} onChange={(e) => setGuardian(i, "phone", e.target.value)} /></Field>
              {i > 1 && <Field label="Relation"><Input value={g.relation} onChange={(e) => setGuardian(i, "relation", e.target.value)} /></Field>}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => props.onGuardians([...guardians, { relation: "guardian", name: "" }])}
        >
          <Plus className="size-4" /> Add guardian
        </Button>
      </PortalCard>

      <PortalCard className="space-y-3">
        <SectionTitle>Emergency contact</SectionTitle>
        <p className="text-xs text-muted-foreground">Someone we can reach in an emergency (kept confidential).</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Full name"><Input value={emergency.name} onChange={(e) => setEmerg("name", e.target.value)} /></Field>
          <Field label="Phone"><Input value={emergency.phone ?? ""} onChange={(e) => setEmerg("phone", e.target.value)} /></Field>
          <Field label="Email"><Input value={emergency.email ?? ""} onChange={(e) => setEmerg("email", e.target.value)} /></Field>
          <Field label="Address"><Input value={emergency.address ?? ""} onChange={(e) => setEmerg("address", e.target.value)} /></Field>
        </div>
      </PortalCard>

      <PortalCard className="space-y-3">
        <SectionTitle>Most recent education</SectionTitle>
        {education.map((e, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            {i > 0 && (
              <div className="flex justify-end">
                <button type="button" onClick={() => props.onEducation(education.filter((_, idx) => idx !== i))} aria-label="Remove">
                  <X className="size-4 text-muted-foreground" />
                </button>
              </div>
            )}
            <Field label="Degree / qualification"><Input value={e.degree_name} onChange={(ev) => setEdu(i, "degree_name", ev.target.value)} placeholder="e.g. FSc Pre-Medical" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Institution"><Input value={e.institution ?? ""} onChange={(ev) => setEdu(i, "institution", ev.target.value)} /></Field>
              <Field label="Board / university"><Input value={e.board_or_university ?? ""} onChange={(ev) => setEdu(i, "board_or_university", ev.target.value)} /></Field>
              <Field label="Completion year"><Input inputMode="numeric" value={e.end_year ? String(e.end_year) : ""} onChange={(ev) => setEdu(i, "end_year", ev.target.value)} /></Field>
              <Field label="Grade / %"><Input value={e.grade_value ?? ""} onChange={(ev) => setEdu(i, "grade_value", ev.target.value)} placeholder="e.g. 88%" /></Field>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => props.onEducation([...education, { ...EMPTY_EDUCATION }])}
        >
          <Plus className="size-4" /> Add another
        </Button>
      </PortalCard>
    </div>
  )
}

// ── Step 4: documents ───────────────────────────────────────────────────────

function DocumentsStep(props: {
  draft: DraftApplication
  uploaded: Record<number, string>
  onUploaded: (typeId: number, name: string) => void
  onError: (msg: string) => void
}) {
  const { draft, uploaded } = props

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Upload a clear <strong>JPG</strong> photo/scan of each document. Application <strong>{draft.application_code}</strong>.
      </p>
      {draft.required_documents.length === 0 && (
        <PortalCard><p className="text-sm text-muted-foreground">No documents are required for this program.</p></PortalCard>
      )}
      {draft.required_documents.map((doc) => (
        <DocumentRow key={doc.id} applicationId={draft.id} docTypeId={doc.id} name={doc.name}
          uploadedName={uploaded[doc.id]} onUploaded={props.onUploaded} onError={props.onError} />
      ))}
    </div>
  )
}

function DocumentRow(props: {
  applicationId: number
  docTypeId: number
  name: string
  uploadedName?: string
  onUploaded: (typeId: number, name: string) => void
  onError: (msg: string) => void
}) {
  const [pending, setPending] = useState(false)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (file.type !== "image/jpeg") {
      props.onError("Only JPG images are accepted.")

      return
    }
    setPending(true)
    try {
      await uploadApplicationDocument(props.applicationId, props.docTypeId, file)
      props.onUploaded(props.docTypeId, file.name)
    } catch (err) {
      props.onError(err instanceof ApiError ? err.message : "Upload failed. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <PortalCard className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {props.uploadedName
          ? <Check className="size-5 shrink-0 text-success" />
          : <span className="size-5 shrink-0 rounded-full border" aria-hidden="true" />}
        <div className="min-w-0">
          <p className="text-sm font-medium">{props.name}</p>
          {props.uploadedName && <p className="truncate text-xs text-muted-foreground">{props.uploadedName}</p>}
        </div>
      </div>
      <label className={cn(
        "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm font-medium",
        props.uploadedName ? "text-muted-foreground" : "bg-cas-navy text-white",
      )}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {props.uploadedName ? "Replace" : "Upload"}
        <input type="file" accept=".jpg,.jpeg,image/jpeg" className="hidden" disabled={pending}
          onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
    </PortalCard>
  )
}

// ── Step 5: review ──────────────────────────────────────────────────────────

function ReviewStep({ program, draft, agreed, onAgreed }: {
  program: WizardProgram | null
  draft: DraftApplication
  agreed: boolean
  onAgreed: (v: boolean) => void
}) {
  return (
    <div className="space-y-4">
      <PortalCard className="space-y-3">
        <SectionTitle>Summary</SectionTitle>
        <div className="flex items-center gap-2 text-cas-navy">
          <GraduationCap className="size-5" />
          <p className="font-medium">{program?.name}</p>
        </div>
        <p className="text-sm text-muted-foreground">{program?.university.name}{program?.university.city ? ` · ${program.university.city}` : ""}</p>
        <div className="rounded-lg bg-subtle p-3 text-sm">
          <p>Reference <strong>{draft.application_code}</strong></p>
          {program?.service_charge && (
            <p className="mt-1">CAS service fee: <strong>{money(program.service_charge.amount, program.service_charge.currency)}</strong></p>
          )}
          <p className="mt-1 text-muted-foreground">{draft.required_documents.length} document(s) attached.</p>
        </div>
      </PortalCard>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <input type="checkbox" checked={agreed} onChange={(e) => onAgreed(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-cas-navy" />
        <span className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cas-navy" />
          I declare that the information provided is true and correct to the best of my knowledge, and I authorise CAS to process this application for admission and visa purposes.
        </span>
      </label>
    </div>
  )
}

// ── Shared ──────────────────────────────────────────────────────────────────

function Tile({ active, label, hint, onClick }: { active: boolean; label: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card p-3 text-left shadow-sm transition-colors",
        active ? "border-cas-navy ring-1 ring-cas-navy" : "hover:border-cas-navy/40",
      )}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </button>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-subtle px-2 py-0.5 text-muted-foreground">{children}</span>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="border-b pb-2 text-xs font-semibold tracking-wider text-cas-navy uppercase">{children}</p>
}
