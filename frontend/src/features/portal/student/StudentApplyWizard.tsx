import { useMutation, useQuery } from "@tanstack/react-query"
import { Check, ChevronLeft, GraduationCap, Loader2, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
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
import { EMPTY_EDUCATION, type Profile } from "@/features/portal/student/applyShared"
import {
  BackgroundStep,
  Chip,
  DocumentsStep,
  ProfileStep,
  SectionTitle,
  Stepper,
  Tile,
} from "@/features/portal/student/applySteps"
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

      <Stepper steps={STEPS} step={step} />

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
                    {p.tuition_fee != null && <Chip>Tuition {money(p.tuition_fee, p.currency)}/yr</Chip>}
                    {p.hostel_fee != null && <Chip>Hostel {money(p.hostel_fee, p.currency)}/yr</Chip>}
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
