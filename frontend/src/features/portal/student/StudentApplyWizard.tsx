import { useMutation, useQuery } from "@tanstack/react-query"
import { Check, ChevronLeft, Loader2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  createStudentApplication,
  getApplicationAvailability,
  getCountries,
  getFundingOptions,
  submitStudentApplication,
  type CreateApplicationPayload,
  type Degree,
  type DraftApplication,
  type ProcessingFeeInvoice,
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
import { ProcessingFeeNotice, ProcessingFeeStep } from "@/features/portal/student/ProcessingFee"
import { getSiteUniversity } from "@/features/site/api"
import { ApiError } from "@/lib/api"

const STEPS = ["wizard.steps.course", "wizard.steps.personal", "wizard.steps.background", "wizard.steps.documents", "wizard.steps.review"]

export default function StudentApplyWizard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // When arriving from a university's "Apply" button, the course list is scoped
  // to that university (?university=<slug>).
  const universitySlug = searchParams.get("university")
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Funded study carries the one-time processing fee: acknowledged up front,
  // then paid at the end if it has not been settled on an earlier application.
  const [feeAcknowledged, setFeeAcknowledged] = useState(false)
  const [pendingFunding, setPendingFunding] = useState<Funding | null>(null)
  const [feeInvoice, setFeeInvoice] = useState<ProcessingFeeInvoice | null>(null)

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
  const [previews, setPreviews] = useState<Record<number, string>>({})
  const [agreed, setAgreed] = useState(false)

  const availability = useQuery({
    queryKey: ["apply", "availability", degree, funding],
    queryFn: () => getApplicationAvailability(degree as Degree, funding as Funding),
    enabled: step === 0 && !!degree && !!funding,
  })

  const countries = useQuery({ queryKey: ["apply", "countries"], queryFn: getCountries })

  // Resolve the scoped university's name for the banner (public endpoint).
  const scopedUniversity = useQuery({
    queryKey: ["apply", "scoped-university", universitySlug],
    queryFn: () => getSiteUniversity(universitySlug!),
    enabled: !!universitySlug,
  })
  const scopedUniversityName = scopedUniversity.data?.data.name ?? null

  // Only offer this university's programs when the flow is scoped to it.
  const availablePrograms = availability.data?.data ?? []
  const programs = universitySlug
    ? availablePrograms.filter((p) => p.university.slug === universitySlug)
    : availablePrograms

  const fundingOpts = useQuery({
    queryKey: ["apply", "funding-options", degree],
    queryFn: () => getFundingOptions(degree as Degree),
    enabled: step === 0 && !!degree,
  })

  const resetDraft = () => {
    setDraft(null)
    setUploaded({})
    setPreviews({})
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
        custom_fields: Object.fromEntries(Object.entries(customAnswers).filter(([, v]) => v.trim() !== "")),
      }

      return createStudentApplication(payload)
    },
    onSuccess: (res) => {
      setDraft(res.data)
      setError(null)
      setStep(3)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("wizard.errors.couldNotStartYours")),
  })

  const submit = useMutation({
    mutationFn: () => submitStudentApplication(draft!.id),
    onSuccess: () => navigate("/portal/student/applications", { replace: true }),
    onError: (err) => {
      // Funded study: the application is complete but owes the one-time
      // processing fee. Swap the review step for the payment step rather than
      // showing a bare error — nothing is wrong, there is just a step left.
      if (err instanceof ApiError && err.code === "PROCESSING_FEE_DUE") {
        setFeeInvoice(err.payload.invoice as ProcessingFeeInvoice)
        setError(null)

        return
      }

      setError(err instanceof ApiError ? err.message : t("wizard.errors.couldNotSubmit"))
    },
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
            <p className="text-[11px] font-semibold tracking-[0.15em] text-cas-gold uppercase">{t("wizard.brand.studyInChina")}</p>
            <h1 className="text-lg font-semibold text-white">{t("wizard.applyTitle")}</h1>
          </div>
        </div>
      </div>

      <Stepper steps={STEPS.map((k) => t(k))} step={step} />

      <ProcessingFeeNotice
        open={pendingFunding !== null}
        onCancel={() => setPendingFunding(null)}
        onAcknowledge={() => {
          setFeeAcknowledged(true)
          setFunding(pendingFunding!)
          setProgram(null)
          setScholarshipId("")
          resetDraft()
          setPendingFunding(null)
        }}
      />

      {universitySlug && scopedUniversityName && (
        <p className="rounded-md bg-cas-navy-50 px-3 py-2 text-sm font-medium text-cas-navy">
          {t("wizard.applyingToUniversity", { name: scopedUniversityName })}
        </p>
      )}

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
          programs={programs}
          loading={availability.isFetching}
          failed={availability.isError}
          fundingAvailable={fundingOpts.data?.data}
          fundingLoading={fundingOpts.isFetching}
          customAnswers={customAnswers}
          onDegree={(d) => { setDegree(d); setFunding(""); setProgram(null); resetDraft() }}
          onFunding={(f) => {
            // Scholarship and partial funding attract the processing fee —
            // say so before they invest time in the rest of the wizard.
            if (f !== "self" && !feeAcknowledged) {
              setPendingFunding(f)

              return
            }
            setFunding(f); setProgram(null); setScholarshipId(""); resetDraft()
          }}
          onProgram={(p) => { setProgram(p); setIntakeId(""); setScholarshipId(""); setCustomAnswers({}); resetDraft() }}
          onIntake={setIntakeId}
          onScholarship={setScholarshipId}
          onCustomAnswer={(k, v) => setCustomAnswers((a) => ({ ...a, [k]: v }))}
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
          onUploaded={(typeId, name, previewUrl) => {
            setUploaded((u) => ({ ...u, [typeId]: name }))
            if (previewUrl) setPreviews((p) => ({ ...p, [typeId]: previewUrl }))
          }}
          onError={setError}
        />
      )}

      {/* Everything is in; only the processing fee stands between them and CAS. */}
      {step === 4 && feeInvoice && <ProcessingFeeStep invoice={feeInvoice} />}

      {step === 4 && draft && !feeInvoice && (
        <ReviewStep
          program={program}
          draft={draft}
          agreed={agreed}
          onAgreed={setAgreed}
          profile={profile}
          guardians={[...guardians, emergency]}
          education={education}
          uploaded={uploaded}
          previews={previews}
        />
      )}

      {/* Footer actions */}
      <div className="flex gap-2">
        {step === 0 && (
          <Button className="h-11 w-full" disabled={!canLeaveCourse} onClick={goNext}>{t("wizard.buttons.continue")}</Button>
        )}
        {(step === 1) && (
          <Button className="h-11 w-full" onClick={goNext}>{t("wizard.buttons.continue")}</Button>
        )}
        {step === 2 && (
          <Button className="h-11 w-full" disabled={createDraft.isPending} onClick={goNext}>
            {createDraft.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {draft ? t("wizard.buttons.continue") : t("wizard.buttons.saveAddDocuments")}
          </Button>
        )}
        {step === 3 && (
          <Button className="h-11 w-full" disabled={!allDocsUploaded} onClick={() => setStep(4)}>
            {allDocsUploaded ? t("wizard.buttons.reviewApplication") : t("wizard.buttons.uploadAllRequired")}
          </Button>
        )}
        {step === 4 && feeInvoice && (
          <Button className="h-11 w-full" variant="secondary" onClick={() => navigate("/portal/student/applications")}>
            {t("fee.doneForNow")}
          </Button>
        )}
        {step === 4 && !feeInvoice && (
          <Button className="h-11 w-full" disabled={submit.isPending || !agreed} onClick={() => submit.mutate()}>
            {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t("wizard.buttons.submitApplication")}
          </Button>
        )}
      </div>
    </div>
  )
}
