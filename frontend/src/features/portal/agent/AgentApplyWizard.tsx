import { useMutation, useQuery } from "@tanstack/react-query"
import { Check, ChevronLeft, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { AgentStudentPicker, type PickedStudent } from "@/features/portal/agent/AgentStudentPicker"
import {
  createApplication,
  getAgentStudent,
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

const STEPS = ["wizard.steps.student", "wizard.steps.course", "wizard.steps.personal", "wizard.steps.background", "wizard.steps.documents", "wizard.steps.review"]

export default function AgentApplyWizard() {
  const { t } = useTranslation()
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
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})

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

  // The applicant record the partner already gave CAS (add-student form, or an
  // earlier application). Prefilled here so nothing is retyped — and so the
  // draft posts back what is on file instead of blanks.
  const applicant = useQuery({
    queryKey: ["agent", "student", student?.id],
    queryFn: () => getAgentStudent(student!.id),
    enabled: !!student,
  })

  const loadedFor = useRef<number | null>(null)

  useEffect(() => {
    const data = applicant.data?.data
    if (!data?.profile || loadedFor.current === data.id) return

    loadedFor.current = data.id

    setProfile(Object.fromEntries(
      Object.entries(data.profile)
        .filter(([, v]) => v !== null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ))

    const onFile = data.guardians ?? []
    // The emergency contact is stored as just another guardian row; split it
    // back out so BackgroundStep shows it in its own section.
    const emergencyOnFile = onFile.find((g) => g.relation === "Emergency contact")
    const family = onFile.filter((g) => g.relation !== "Emergency contact")

    if (family.length) setGuardians(family)
    if (emergencyOnFile) setEmergency(emergencyOnFile)
    if (data.education?.length) setEducation(data.education)
  }, [applicant.data])

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
        custom_fields: Object.fromEntries(Object.entries(customAnswers).filter(([, v]) => v.trim() !== "")),
      }

      return createApplication("agent", payload)
    },
    onSuccess: (res) => {
      setDraft(res.data)
      setError(null)
      setStep(4)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("wizard.errors.couldNotStart")),
  })

  const submit = useMutation({
    mutationFn: () => submitApplication("agent", draft!.id),
    onSuccess: () => navigate("/portal/agent/students", { replace: true }),
    onError: (err) => setError(err instanceof ApiError ? err.message : t("wizard.errors.couldNotSubmit")),
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

  const requiredCustomAnswered = (program?.custom_fields ?? [])
    .filter((f) => f.required)
    .every((f) => (customAnswers[f.key] ?? "").trim() !== "")
  const canLeaveCourse = !!program && (funding === "self" || !!scholarshipId) && requiredCustomAnswered
  const allDocsUploaded = (draft?.required_documents ?? []).every((d) => uploaded[d.id])

  return (
    <div className="space-y-4 pb-4">
      <div className="overflow-hidden rounded-xl border bg-cas-navy shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3">
          {step > 0 && step < 4 && (
            <button type="button" onClick={goBack} className="text-white/70 hover:text-white" aria-label={t("wizard.buttons.back")}>
              <ChevronLeft className="size-5" />
            </button>
          )}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.15em] text-cas-gold uppercase">{t("wizard.brand.partnerPortal")}</p>
            <h1 className="text-lg font-semibold text-white">
              {t("wizard.agentApplyTitle")}{student ? ` · ${student.name}` : ""}
            </h1>
          </div>
        </div>
      </div>

      <Stepper steps={STEPS.map((k) => t(k))} step={step} />

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
          customAnswers={customAnswers}
          onDegree={(d) => { setDegree(d); setFunding(""); setProgram(null); resetDraft() }}
          onFunding={(f) => { setFunding(f); setProgram(null); setScholarshipId(""); resetDraft() }}
          onProgram={(p) => { setProgram(p); setIntakeId(""); setScholarshipId(""); setCustomAnswers({}); resetDraft() }}
          onIntake={setIntakeId}
          onScholarship={setScholarshipId}
          onCustomAnswer={(k, v) => setCustomAnswers((a) => ({ ...a, [k]: v }))}
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
          declaration={t("wizard.review.agentDeclaration", { name: student?.name ?? t("wizard.review.theStudent") })}
        />
      )}

      {/* Footer actions */}
      <div className="flex gap-2">
        {step === 0 && (
          <Button className="h-11 w-full" disabled={!student} onClick={goNext}>{t("wizard.buttons.continue")}</Button>
        )}
        {step === 1 && (
          <Button className="h-11 w-full" disabled={!canLeaveCourse} onClick={goNext}>{t("wizard.buttons.continue")}</Button>
        )}
        {step === 2 && (
          <Button className="h-11 w-full" onClick={goNext}>{t("wizard.buttons.continue")}</Button>
        )}
        {step === 3 && (
          <Button className="h-11 w-full" disabled={createDraft.isPending} onClick={goNext}>
            {createDraft.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {draft ? t("wizard.buttons.continue") : t("wizard.buttons.saveAddDocuments")}
          </Button>
        )}
        {step === 4 && (
          <Button className="h-11 w-full" disabled={!allDocsUploaded} onClick={() => setStep(5)}>
            {allDocsUploaded ? t("wizard.buttons.reviewApplication") : t("wizard.buttons.uploadAllRequired")}
          </Button>
        )}
        {step === 5 && (
          <Button className="h-11 w-full" disabled={submit.isPending || !agreed} onClick={() => submit.mutate()}>
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t("wizard.buttons.submitApplication")}
          </Button>
        )}
      </div>
    </div>
  )
}
