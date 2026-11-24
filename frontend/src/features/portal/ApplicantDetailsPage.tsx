import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  getAgentStudent,
  getApplyCountries,
  getStudentApplicant,
  updateApplicantDetails,
  type WizardEducation,
  type WizardGuardian,
} from "@/features/portal/api"
import { LoadError, PageTitle } from "@/features/portal/components"
import { EMPTY_EDUCATION, type Profile } from "@/features/portal/student/applyShared"
import { BackgroundStep, ProfileStep } from "@/features/portal/student/applySteps"
import { ApiError } from "@/lib/api"
import type { PortalKind } from "@/stores/portalAuth"

/**
 * The applicant's personal details, family and education, editable until one of their applications is accepted.
 * A student edits their own; a partner edits one of their students. The same forms as the apply wizard.
 */
export default function ApplicantDetailsPage({ kind }: { kind: PortalKind }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const studentId = kind === "agent" ? Number(id) || undefined : undefined
  const back = kind === "agent" ? "/portal/agent/applications" : "/portal/student/applications"

  const record = useQuery({
    queryKey: [kind, "applicant", studentId],
    queryFn: () => (kind === "agent" ? getAgentStudent(studentId!) : getStudentApplicant()),
    enabled: kind === "student" || !!studentId,
  })
  const countries = useQuery({ queryKey: [kind, "apply", "countries"], queryFn: () => getApplyCountries(kind) })

  const [profile, setProfile] = useState<Profile>({})
  const [guardians, setGuardians] = useState<WizardGuardian[]>([{ relation: "father", name: "" }, { relation: "mother", name: "" }])
  const [education, setEducation] = useState<WizardEducation[]>([{ ...EMPTY_EDUCATION }])
  const [emergency, setEmergency] = useState<WizardGuardian>({ relation: "Emergency contact", name: "" })
  const [error, setError] = useState<string | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    const data = record.data?.data
    if (!data || loaded.current) return
    loaded.current = true

    setProfile(Object.fromEntries(Object.entries(data.profile ?? {}).filter(([, v]) => v !== null && v !== "").map(([k, v]) => [k, String(v)])))
    const onFile = data.guardians ?? []
    const family = onFile.filter((g) => g.relation !== "Emergency contact")
    const emergencyOnFile = onFile.find((g) => g.relation === "Emergency contact")
    if (family.length) setGuardians(family)
    if (emergencyOnFile) setEmergency(emergencyOnFile)
    if (data.education?.length) setEducation(data.education)
  }, [record.data])

  const save = useMutation({
    mutationFn: () => updateApplicantDetails(kind, studentId, {
      profile: Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== "")),
      guardians: [...guardians, emergency].filter((g) => g.name.trim() !== ""),
      education: education.filter((e) => e.degree_name.trim() !== ""),
    }),
    onSuccess: () => navigate(back, { replace: true }),
    onError: (e) => setError(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : t("applicantDetails.failed", { defaultValue: "Could not save. Please try again." })),
  })

  const name = record.data?.data.full_name

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link to={back} className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> {t("applicantDetails.back", { defaultValue: "Back to applications" })}
        </Link>
        <PageTitle
          title={t("applicantDetails.title", { defaultValue: "Student details" })}
          subtitle={name
            ? t("applicantDetails.subtitle", { defaultValue: "Correct or complete the details of {{name}}. You can do this until an application is accepted.", name })
            : undefined}
        />
      </div>

      {record.isError && <LoadError onRetry={record.refetch} />}

      {record.data && (
        <>
          <ProfileStep profile={profile} countries={countries.data?.data ?? []} onChange={(k, v) => setProfile((p) => ({ ...p, [k]: v }))} />
          <BackgroundStep
            guardians={guardians}
            education={education}
            emergency={emergency}
            onGuardians={setGuardians}
            onEducation={setEducation}
            onEmergency={setEmergency}
          />

          {error && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}

          <Button className="h-11 w-full" disabled={save.isPending} onClick={() => { setError(null); save.mutate() }}>
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t("applicantDetails.save", { defaultValue: "Save details" })}
          </Button>
        </>
      )}
    </div>
  )
}
