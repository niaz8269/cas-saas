import { useMutation, useQuery } from "@tanstack/react-query"
import { Check, ChevronLeft, Loader2 } from "lucide-react"
import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { AgentStudentPicker, type PickedStudent } from "@/features/portal/agent/AgentStudentPicker"
import {
  createApplication,
  getApplyAvailability,
  getApplyCountries,
  getApplyFundingOptions,
  submitApplication,
  type AgentCreateApplicationPayload,
  type Degree,
  type DraftApplication,
  type Funding,
  type WizardEducation,
  type WizardGuardian,
  type WizardProgram,
} from "@/features/portal/api"
import { EMPTY_EDUCATION, type Profile } from "@/features/portal/student/applyShared"
import {
  BackgroundStep,
  CourseStep,
  DocumentsStep,
  ProfileStep,
  ReviewStep,
  Stepper,
} from "@/features/portal/student/applySteps"
import { ApiError } from "@/lib/api"

const STEPS = ["Student", "Course", "Personal", "Background", "Documents", "Review"]

export default function AgentApplyWizard() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // A student may be pre-selected from the "Apply for this student" CTA.
  const preId = Number(params.get("student"))
  const preName = params.get("name")
  const preselected: PickedStudent | null =
    preId && preName ? { id: preId, name: preName } : null

  const [step, setStep] = useState(preselected ? 1 : 0)
  const [error, setError] = useState<string | null>(null)

  // Student (agent-only step)
  const [student, setStudent] = useState<PickedStudent | null>(preselected)

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
    queryKey: ["agent-apply", "availability", degree, funding],
    queryFn: () => getApplyAvailability("agent", degree as Degree, funding as Funding),
    enabled: step === 1 && !!degree && !!funding,
  })

  const countries = useQuery({
    queryKey: ["agent-apply", "countries"],
    queryFn: () => getApplyCountries("agent"),
  })

  const fundingOpts = useQuery({
    queryKey: ["agent-apply", "funding-options", degree],
    queryFn: () => getApplyFundingOptions("agent", degree as Degree),
    enabled: step === 1 && !!degree,
  })

  const resetDraft = () => {
    setDraft(null)
    setUploaded({})
  }

  const createDraft = useMutation({
    mutationFn: () => {
      const payload: AgentCreateApplicationPayload = {
        student_id: student!.id,
        program_id: program!.id,
        funding: funding as Funding,
        scholarship_id: scholarshipId ? Number(scholarshipId) : null,
        intake_id: intakeId ? Number(intakeId) : null,
        profile: Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== "")),
        guardians: [...guardians, emergency].filter((g) => g.name.trim() !== ""),
        education: education.filter((e) => e.degree_name.trim() !== ""),
      }

      return createApplication("agent", payload)
    },
    onSuccess: (res) => {
      setDraft(res.data)
      setError(null)
      setStep(4)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not start the application."),
  })

  const submit = useMutation({
    mutationFn: () => submitApplication("agent", draft!.id),
    onSuccess: () => navigate("/portal/agent/students", { replace: true }),
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
            <p className="text-[11px] font-semibold tracking-[0.15em] text-cas-gold uppercase">CAS · Partner portal</p>
            <h1 className="text-lg font-semibold text-white">
              Apply for a student{student ? ` · ${student.name}` : ""}
            </h1>
          </div>
        </div>
      </div>

      <Stepper steps={STEPS} step={step} />

      {error && (
        <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {step === 0 && (
        <AgentStudentPicker
          selectedId={student?.id ?? null}
          onSelect={(s) => { setStudent(s); resetDraft() }}
        />
      )}

      {step === 1 && (
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

      {step === 2 && (
        <ProfileStep
          profile={profile}
          countries={countries.data?.data ?? []}
          onChange={(k, v) => setProfile((p) => ({ ...p, [k]: v }))}
        />
      )}

      {step === 3 && (
        <BackgroundStep
          guardians={guardians}
          education={education}
          emergency={emergency}
          onGuardians={setGuardians}
          onEducation={setEducation}
          onEmergency={setEmergency}
        />
      )}

      {step === 4 && draft && (
        <DocumentsStep
          kind="agent"
          draft={draft}
          uploaded={uploaded}
          onUploaded={(typeId, name) => setUploaded((u) => ({ ...u, [typeId]: name }))}
          onError={setError}
        />
      )}

      {step === 5 && draft && (
        <ReviewStep
          program={program}
          draft={draft}
          agreed={agreed}
          onAgreed={setAgreed}
          declaration={`I confirm ${student?.name ?? "the student"} has authorised CAS to process this application on their behalf, and that the information provided is true and correct to the best of my knowledge.`}
        />
      )}

      {/* Footer actions */}
      <div className="flex gap-2">
        {step === 0 && (
          <Button className="h-11 w-full" disabled={!student} onClick={goNext}>Continue</Button>
        )}
        {step === 1 && (
          <Button className="h-11 w-full" disabled={!canLeaveCourse} onClick={goNext}>Continue</Button>
        )}
        {step === 2 && (
          <Button className="h-11 w-full" onClick={goNext}>Continue</Button>
        )}
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
