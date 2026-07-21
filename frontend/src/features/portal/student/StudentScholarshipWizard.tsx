import { useMutation, useQuery } from "@tanstack/react-query"
import { Check, ChevronLeft, Loader2 } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  createScholarshipApplication,
  getCountries,
  getGovernmentScholarships,
  getMajors,
  submitStudentApplication,
  type DraftApplication,
  type GovScholarship,
  type ScholarshipLevel,
  type ScholarshipPreference,
  type WizardEducation,
  type WizardGuardian,
} from "@/features/portal/api"
import { emptyPref, EMPTY_EDUCATION, type Profile } from "@/features/portal/student/applyShared"
import {
  BackgroundStep,
  DocumentsStep,
  ProfileStep,
  Stepper,
} from "@/features/portal/student/applySteps"
import {
  PreferencesStep,
  ScholarshipReviewStep,
  ScholarshipStep,
} from "@/features/portal/student/scholarshipSteps"
import { ApiError } from "@/lib/api"

const STEPS = ["Scholarship", "Preferences", "Personal", "Background", "Documents", "Review"]

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
        <ScholarshipReviewStep scholarship={scholarship} level={level as ScholarshipLevel} preferences={preferences} draft={draft} agreed={agreed} onAgreed={setAgreed} />
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
