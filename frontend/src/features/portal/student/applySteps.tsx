import { Check, GraduationCap, Loader2, Plus, ShieldCheck, Upload, X } from "lucide-react"
import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

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
import { Textarea } from "@/components/ui/textarea"
import {
  uploadApplicationDocument,
  type CountryRow,
  type Degree,
  type DraftApplication,
  type Funding,
  type FundingOptions,
  type PortalCustomField,
  type WizardEducation,
  type WizardGuardian,
  type WizardProgram,
} from "@/features/portal/api"
import { PortalCard } from "@/features/portal/components"
import { money } from "@/features/portal/status"
import { DEGREES, EMPTY_EDUCATION, FUNDING, type Profile } from "@/features/portal/student/applyShared"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { PortalKind } from "@/stores/portalAuth"

/** Labelled, numbered progress rail shared by the apply wizards. */
export function Stepper({ steps, step }: { steps: string[]; step: number }) {
  return (
    <div className="flex items-start">
      {steps.map((label, i) => (
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
            <div className={cn("h-0.5 flex-1", i === steps.length - 1 ? "bg-transparent" : i < step ? "bg-cas-navy" : "bg-muted")} />
          </div>
          <span className={cn("mt-1 text-[10px]", i === step ? "font-medium text-cas-navy" : "text-muted-foreground")}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Personal details ─────────────────────────────────────────────────────────

export function ProfileStep({ profile, countries, onChange }: {
  profile: Profile
  countries: CountryRow[]
  onChange: (k: string, v: string) => void
}) {
  const { t } = useTranslation()
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => onChange(k, e.target.value)
  const hasTest = !!profile.english_test && profile.english_test !== "None"

  return (
    <div className="space-y-4">
      <PortalCard className="space-y-3">
        <SectionTitle>{t("wizard.profile.personalDetails")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Field label={t("wizard.profile.dateOfBirth")}><Input type="date" value={profile.dob ?? ""} onChange={set("dob")} /></Field>
          <Field label={t("wizard.profile.placeOfBirth")}><Input value={profile.place_of_birth ?? ""} onChange={set("place_of_birth")} /></Field>
          <Field label={t("wizard.profile.nationality")}>
            <Select value={profile.country_id ?? ""} onValueChange={(v) => onChange("country_id", v)}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={t("wizard.profile.selectCountry")} /></SelectTrigger>
              <SelectContent>
                {countries.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("wizard.profile.gender")}>
            <Select value={profile.gender ?? ""} onValueChange={(v) => onChange("gender", v)}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={t("wizard.common.select")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t("wizard.profile.male")}</SelectItem>
                <SelectItem value="female">{t("wizard.profile.female")}</SelectItem>
                <SelectItem value="other">{t("wizard.profile.other")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("wizard.profile.maritalStatus")}>
            <Select value={profile.marital_status ?? ""} onValueChange={(v) => onChange("marital_status", v)}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={t("wizard.common.select")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">{t("wizard.profile.single")}</SelectItem>
                <SelectItem value="married">{t("wizard.profile.married")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("wizard.profile.phone")}><Input value={profile.phone ?? ""} onChange={set("phone")} /></Field>
          <Field label={t("wizard.profile.religion")}><Input value={profile.religion ?? ""} onChange={set("religion")} /></Field>
          <Field label={t("wizard.profile.chineseName")}><Input value={profile.chinese_name ?? ""} onChange={set("chinese_name")} /></Field>
          <Field label={t("wizard.profile.nativeLanguage")}><Input value={profile.native_language ?? ""} onChange={set("native_language")} /></Field>
        </div>
      </PortalCard>

      <PortalCard className="space-y-3">
        <SectionTitle>{t("wizard.profile.contact")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Field label={t("wizard.profile.alternateEmail")}><Input type="email" value={profile.alternate_email ?? ""} onChange={set("alternate_email")} /></Field>
          <div />
          <Field label={t("wizard.profile.wechatId")}><Input value={profile.wechat_id ?? ""} onChange={set("wechat_id")} /></Field>
          <Field label={t("wizard.profile.skypeId")}><Input value={profile.skype_id ?? ""} onChange={set("skype_id")} /></Field>
        </div>
      </PortalCard>

      <PortalCard className="space-y-3">
        <SectionTitle>{t("wizard.profile.passport")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Field label={t("wizard.profile.passportNo")}><Input value={profile.passport_no ?? ""} onChange={set("passport_no")} /></Field>
          <div />
          <Field label={t("wizard.profile.issueDate")}><Input type="date" value={profile.passport_issue_date ?? ""} onChange={set("passport_issue_date")} /></Field>
          <Field label={t("wizard.profile.expiryDate")}><Input type="date" value={profile.passport_expiry_date ?? ""} onChange={set("passport_expiry_date")} /></Field>
        </div>
      </PortalCard>

      <PortalCard className="space-y-3">
        <SectionTitle>{t("wizard.profile.englishProficiency")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Field label={t("wizard.profile.testTaken")}>
            <Select value={profile.english_test ?? ""} onValueChange={(v) => onChange("english_test", v)}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={t("wizard.common.select")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IELTS">{t("wizard.profile.ielts")}</SelectItem>
                <SelectItem value="TOEFL">{t("wizard.profile.toefl")}</SelectItem>
                <SelectItem value="PTE Academic">{t("wizard.profile.pteAcademic")}</SelectItem>
                <SelectItem value="Duolingo">{t("wizard.profile.duolingo")}</SelectItem>
                <SelectItem value="None">{t("wizard.profile.noneNotTaken")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {hasTest && <Field label={t("wizard.profile.overallScore")}><Input value={profile.english_test_score ?? ""} onChange={set("english_test_score")} placeholder={t("wizard.profile.scoreExample")} /></Field>}
          {hasTest && <Field label={t("wizard.profile.testDate")}><Input type="date" value={profile.english_test_date ?? ""} onChange={set("english_test_date")} /></Field>}
        </div>
      </PortalCard>

      <PortalCard className="space-y-3">
        <SectionTitle>{t("wizard.profile.address")}</SectionTitle>
        <div className="space-y-3">
          <Field label={t("wizard.profile.permanentAddress")}><Input value={profile.permanent_address ?? ""} onChange={set("permanent_address")} /></Field>
          <Field label={t("wizard.profile.currentAddress")}><Input value={profile.current_address ?? ""} onChange={set("current_address")} /></Field>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Field label={t("wizard.profile.city")}><Input value={profile.city ?? ""} onChange={set("city")} /></Field>
            <Field label={t("wizard.profile.postalCode")}><Input value={profile.postal_code ?? ""} onChange={set("postal_code")} /></Field>
          </div>
        </div>
      </PortalCard>
    </div>
  )
}

// ── Family + education ───────────────────────────────────────────────────────

export function BackgroundStep(props: {
  guardians: WizardGuardian[]
  education: WizardEducation[]
  emergency: WizardGuardian
  onGuardians: (g: WizardGuardian[]) => void
  onEducation: (e: WizardEducation[]) => void
  onEmergency: (g: WizardGuardian) => void
}) {
  const { t } = useTranslation()
  const { guardians, education, emergency } = props

  const setGuardian = (i: number, k: keyof WizardGuardian, v: string) =>
    props.onGuardians(guardians.map((g, idx) => (idx === i ? { ...g, [k]: v } : g)))

  const setEdu = (i: number, k: keyof WizardEducation, v: string) =>
    props.onEducation(education.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)))

  const setEmerg = (k: keyof WizardGuardian, v: string) => props.onEmergency({ ...emergency, [k]: v })

  return (
    <div className="space-y-4">
      <PortalCard className="space-y-3">
        <SectionTitle>{t("wizard.background.family")}</SectionTitle>
        {guardians.map((g, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{g.relation}</span>
              {i > 1 && (
                <button type="button" onClick={() => props.onGuardians(guardians.filter((_, idx) => idx !== i))} aria-label={t("wizard.background.remove")}>
                  <X className="size-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t("wizard.background.name")}><Input value={g.name} onChange={(e) => setGuardian(i, "name", e.target.value)} /></Field>
              <Field label={t("wizard.background.occupation")}><Input value={g.occupation ?? ""} onChange={(e) => setGuardian(i, "occupation", e.target.value)} /></Field>
              <Field label={t("wizard.background.phone")}><Input value={g.phone ?? ""} onChange={(e) => setGuardian(i, "phone", e.target.value)} /></Field>
              {i > 1 && <Field label={t("wizard.background.relation")}><Input value={g.relation} onChange={(e) => setGuardian(i, "relation", e.target.value)} /></Field>}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => props.onGuardians([...guardians, { relation: "guardian", name: "" }])}
        >
          <Plus className="size-4" /> {t("wizard.background.addGuardian")}
        </Button>
      </PortalCard>

      <PortalCard className="space-y-3">
        <SectionTitle>{t("wizard.background.emergencyContact")}</SectionTitle>
        <p className="text-xs text-muted-foreground">{t("wizard.background.emergencyHint")}</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("wizard.background.fullName")}><Input value={emergency.name} onChange={(e) => setEmerg("name", e.target.value)} /></Field>
          <Field label={t("wizard.background.phone")}><Input value={emergency.phone ?? ""} onChange={(e) => setEmerg("phone", e.target.value)} /></Field>
          <Field label={t("wizard.background.email")}><Input value={emergency.email ?? ""} onChange={(e) => setEmerg("email", e.target.value)} /></Field>
          <Field label={t("wizard.background.address")}><Input value={emergency.address ?? ""} onChange={(e) => setEmerg("address", e.target.value)} /></Field>
        </div>
      </PortalCard>

      <PortalCard className="space-y-3">
        <SectionTitle>{t("wizard.background.mostRecentEducation")}</SectionTitle>
        {education.map((e, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            {i > 0 && (
              <div className="flex justify-end">
                <button type="button" onClick={() => props.onEducation(education.filter((_, idx) => idx !== i))} aria-label={t("wizard.background.remove")}>
                  <X className="size-4 text-muted-foreground" />
                </button>
              </div>
            )}
            <Field label={t("wizard.background.degreeQualification")}><Input value={e.degree_name} onChange={(ev) => setEdu(i, "degree_name", ev.target.value)} placeholder={t("wizard.background.degreeExample")} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t("wizard.background.institution")}><Input value={e.institution ?? ""} onChange={(ev) => setEdu(i, "institution", ev.target.value)} /></Field>
              <Field label={t("wizard.background.boardUniversity")}><Input value={e.board_or_university ?? ""} onChange={(ev) => setEdu(i, "board_or_university", ev.target.value)} /></Field>
              <Field label={t("wizard.background.completionYear")}><Input inputMode="numeric" value={e.end_year ? String(e.end_year) : ""} onChange={(ev) => setEdu(i, "end_year", ev.target.value)} /></Field>
              <Field label={t("wizard.background.grade")}><Input value={e.grade_value ?? ""} onChange={(ev) => setEdu(i, "grade_value", ev.target.value)} placeholder={t("wizard.background.gradeExample")} /></Field>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => props.onEducation([...education, { ...EMPTY_EDUCATION }])}
        >
          <Plus className="size-4" /> {t("wizard.background.addAnother")}
        </Button>
      </PortalCard>
    </div>
  )
}

// ── Documents ────────────────────────────────────────────────────────────────

export function DocumentsStep(props: {
  draft: DraftApplication
  uploaded: Record<number, string>
  onUploaded: (typeId: number, name: string, previewUrl?: string) => void
  onError: (msg: string) => void
  /** Which portal is uploading — selects the /{kind}/applications path. */
  kind?: PortalKind
}) {
  const { t } = useTranslation()
  const { draft, uploaded, kind = "student" } = props

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("wizard.documents.uploadClear")} <strong>JPG</strong> {t("wizard.documents.uploadEachDoc")} <strong>{draft.application_code}</strong>.
      </p>
      {draft.required_documents.length === 0 && (
        <PortalCard><p className="text-sm text-muted-foreground">{t("wizard.documents.noDocsRequired")}</p></PortalCard>
      )}
      {draft.required_documents.map((doc) => (
        <DocumentRow key={doc.id} kind={kind} applicationId={draft.id} docTypeId={doc.id} name={doc.name}
          uploadedName={uploaded[doc.id]} onUploaded={props.onUploaded} onError={props.onError} />
      ))}
    </div>
  )
}

function DocumentRow(props: {
  kind: PortalKind
  applicationId: number
  docTypeId: number
  name: string
  uploadedName?: string
  onUploaded: (typeId: number, name: string, previewUrl?: string) => void
  onError: (msg: string) => void
}) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (file.type !== "image/jpeg") {
      props.onError(t("wizard.documents.onlyJpg"))

      return
    }
    setPending(true)
    try {
      await uploadApplicationDocument(props.kind, props.applicationId, props.docTypeId, file)
      // A local object URL lets the applicant preview it on the review step.
      props.onUploaded(props.docTypeId, file.name, URL.createObjectURL(file))
    } catch (err) {
      props.onError(err instanceof ApiError ? err.message : t("wizard.documents.uploadFailed"))
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
        {props.uploadedName ? t("wizard.documents.replace") : t("wizard.documents.upload")}
        <input type="file" accept=".jpg,.jpeg,image/jpeg" className="hidden" disabled={pending}
          onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
    </PortalCard>
  )
}

// ── Shared bits ──────────────────────────────────────────────────────────────

export function Tile({ active, label, hint, onClick }: { active: boolean; label: string; hint: string; onClick: () => void }) {
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

export function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-subtle px-2 py-0.5 text-muted-foreground">{children}</span>
}

/**
 * Labelled wizard control. The label WRAPS its control rather than sitting
 * beside it: these fields are built generically (Input, Select, …) so there is
 * no id for `htmlFor` to point at, and without the nesting the label was purely
 * visual — never announced by a screen reader (CLAUDE.md: proper labels/ARIA).
 */
export function Field({ label, group, children }: {
  label: string
  /**
   * Set for composite controls that label their own parts (a radio group, say).
   * Nesting those inside a <label> would produce nested labels and strip each
   * option of its accessible name, so the wrapper degrades to a plain caption.
   */
  group?: boolean
  children: ReactNode
}) {
  if (group) {
    return (
      <div className="space-y-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        {children}
      </div>
    )
  }

  return (
    <Label className="block space-y-1 font-normal">
      <span className="block text-xs text-muted-foreground">{label}</span>
      {children}
    </Label>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="border-b pb-2 text-xs font-semibold tracking-wider text-cas-navy uppercase">{children}</p>
}

// ── Admin-defined custom fields (report item 11) ──────────────────────────────

export function CustomFieldsCard({ fields, answers, onChange }: {
  fields: PortalCustomField[]
  answers: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  const { t } = useTranslation()

  return (
    <PortalCard className="space-y-3">
      <SectionTitle>{t("wizard.customFields.additionalQuestions")}</SectionTitle>
      {fields.map((f) => (
        <Field key={f.key} label={f.required ? `${f.label} *` : f.label} group={f.type === "radio"}>
          {f.type === "textarea" ? (
            <Textarea aria-label={f.label} value={answers[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} />
          ) : f.type === "radio" ? (
            <div role="radiogroup" aria-label={f.label} className="flex flex-wrap gap-x-4 gap-y-1.5">
              {f.options.map((o) => (
                <label key={o} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    className="size-4 accent-cas-navy"
                    name={f.key}
                    value={o}
                    checked={answers[f.key] === o}
                    onChange={() => onChange(f.key, o)}
                  />
                  {o}
                </label>
              ))}
            </div>
          ) : f.type === "select" ? (
            <Select value={answers[f.key] ?? ""} onValueChange={(v) => onChange(f.key, v)}>
              <SelectTrigger aria-label={f.label} className="bg-background"><SelectValue placeholder={t("wizard.common.select")} /></SelectTrigger>
              <SelectContent>
                {f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input
              aria-label={f.label}
              type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
              value={answers[f.key] ?? ""}
              onChange={(e) => onChange(f.key, e.target.value)}
            />
          )}
        </Field>
      ))}
    </PortalCard>
  )
}

// ── Course step (degree → funding → program → intake/scholarship) ─────────────

export function CourseStep(props: {
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
  customAnswers: Record<string, string>
  onDegree: (d: Degree) => void
  onFunding: (f: Funding) => void
  onProgram: (p: WizardProgram) => void
  onIntake: (id: string) => void
  onScholarship: (id: string) => void
  onCustomAnswer: (key: string, value: string) => void
}) {
  const { t } = useTranslation()
  const { degree, funding, program, programs, loading, failed, fundingAvailable, fundingLoading } = props

  const fundingTiles = FUNDING.filter((f) => f.value === "self" || fundingAvailable?.[f.value])
  const noScholarships = !!fundingAvailable && !fundingAvailable.scholarship && !fundingAvailable.partial

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">{t("wizard.course.whichDegree")}</p>
        <div className="grid grid-cols-2 gap-2">
          {DEGREES.map((d) => (
            <Tile key={d.value} active={degree === d.value} label={t(d.labelKey)} hint={t(d.hintKey)} onClick={() => props.onDegree(d.value)} />
          ))}
        </div>
      </div>

      {degree && (
        <div>
          <p className="mb-2 text-sm font-medium">{t("wizard.course.howFund")}</p>
          {fundingLoading && !fundingAvailable ? (
            <p className="text-sm text-muted-foreground">{t("wizard.course.checkingOptions")}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2">
                {fundingTiles.map((f) => (
                  <Tile key={f.value} active={funding === f.value} label={t(f.labelKey)} hint={t(f.hintKey)} onClick={() => props.onFunding(f.value)} />
                ))}
              </div>
              {noScholarships && (
                <p className="mt-2 text-xs text-muted-foreground">{t("wizard.course.noScholarshipsForDegree")}</p>
              )}
            </>
          )}
        </div>
      )}

      {degree && funding && (
        <div>
          <p className="mb-2 text-sm font-medium">{t("wizard.course.availablePrograms")}</p>
          {loading && <p className="text-sm text-muted-foreground">{t("wizard.course.findingPrograms")}</p>}
          {failed && <p className="text-sm text-destructive">{t("wizard.course.couldNotLoadPrograms")}</p>}
          {!loading && !failed && programs.length === 0 && (
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              {t("wizard.course.noProgramsMatch")}
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
                    {p.duration_months && <Chip>{t("wizard.course.durationMonths", { months: p.duration_months })}</Chip>}
                    {p.tuition_fee != null && <Chip>{t("wizard.course.tuitionPerYear", { amount: money(p.tuition_fee, p.currency) })}</Chip>}
                    {p.hostel_fee != null && <Chip>{t("wizard.course.hostelPerYear", { amount: money(p.hostel_fee, p.currency) })}</Chip>}
                    {p.university.moe_listed && <Chip>{t("wizard.course.moeListed")}</Chip>}
                  </div>
                  {p.service_charge && (
                    <p className="mt-2 text-xs font-medium text-cas-navy">
                      {t("wizard.course.serviceFee", { amount: money(p.service_charge.amount, p.service_charge.currency) })}
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
              <Label className="text-sm">{t("wizard.course.intake")}</Label>
              <Select value={props.intakeId} onValueChange={props.onIntake}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder={t("wizard.course.chooseIntake")} /></SelectTrigger>
                <SelectContent>
                  {program.intakes.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.name}{i.application_deadline ? ` · ${t("wizard.course.applyBy", { date: new Date(i.application_deadline).toLocaleDateString() })}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {funding !== "self" && (
            <div>
              <Label className="text-sm">{t("wizard.course.scholarship")}</Label>
              {program.scholarships.length > 0 ? (
                <Select value={props.scholarshipId} onValueChange={props.onScholarship}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder={t("wizard.course.chooseScholarship")} /></SelectTrigger>
                  <SelectContent>
                    {program.scholarships.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}{s.coverage ? ` · ${s.coverage}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{t("wizard.course.noScholarshipsListed")}</p>
              )}
            </div>
          )}
        </div>
      )}

      {program && (program.custom_fields?.length ?? 0) > 0 && (
        <CustomFieldsCard fields={program.custom_fields!} answers={props.customAnswers} onChange={props.onCustomAnswer} />
      )}
    </div>
  )
}

// ── Review step (final summary + declaration) ────────────────────────────────

export function ReviewStep({ program, draft, agreed, onAgreed, declaration, profile, guardians, education, uploaded, previews }: {
  program: WizardProgram | null
  draft: DraftApplication
  agreed: boolean
  onAgreed: (v: boolean) => void
  /** Overrides the default (student self-apply) declaration wording. */
  declaration?: ReactNode
  /** When provided, the review also shows the applicant's details + documents. */
  profile?: Profile
  guardians?: WizardGuardian[]
  education?: WizardEducation[]
  uploaded?: Record<number, string>
  previews?: Record<number, string>
}) {
  const { t } = useTranslation()
  const profileEntries = Object.entries(profile ?? {}).filter(([, v]) => v != null && String(v).trim() !== "")
  const filledGuardians = (guardians ?? []).filter((g) => g.name.trim() !== "")
  const filledEducation = (education ?? []).filter((e) => e.degree_name.trim() !== "")
  const attachedCount = uploaded ? Object.keys(uploaded).length : draft.required_documents.length

  return (
    <div className="space-y-4">
      <PortalCard className="space-y-3">
        <SectionTitle>{t("wizard.review.summary")}</SectionTitle>
        <div className="flex items-center gap-2 text-cas-navy">
          <GraduationCap className="size-5" />
          <p className="font-medium">{program?.name}</p>
        </div>
        <p className="text-sm text-muted-foreground">{program?.university.name}{program?.university.city ? ` · ${program.university.city}` : ""}</p>
        <div className="rounded-lg bg-subtle p-3 text-sm">
          <p>{t("wizard.review.reference")} <strong>{draft.application_code}</strong></p>
          {program?.service_charge && (
            <p className="mt-1">{t("wizard.review.serviceFeeLabel")} <strong>{money(program.service_charge.amount, program.service_charge.currency)}</strong></p>
          )}
          <p className="mt-1 text-muted-foreground">{t("wizard.review.documentsAttached", { count: attachedCount })}</p>
        </div>
      </PortalCard>

      {profileEntries.length > 0 && (
        <PortalCard className="space-y-3">
          <SectionTitle>{t("wizard.review.yourDetails")}</SectionTitle>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {profileEntries.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</dt>
                <dd className="font-medium break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </PortalCard>
      )}

      {(filledGuardians.length > 0 || filledEducation.length > 0) && (
        <PortalCard className="space-y-2">
          <SectionTitle>{t("wizard.review.background")}</SectionTitle>
          {filledGuardians.map((g, i) => (
            <p key={`g${i}`} className="text-sm">
              <span className="capitalize text-muted-foreground">{g.relation}: </span>
              <span className="font-medium">{g.name}</span>{g.phone ? ` · ${g.phone}` : ""}
            </p>
          ))}
          {filledEducation.map((e, i) => (
            <p key={`e${i}`} className="text-sm">
              <span className="font-medium">{e.degree_name}</span>
              {e.institution || e.board_or_university ? ` · ${e.institution ?? e.board_or_university}` : ""}
              {e.end_year ? ` · ${e.end_year}` : ""}
            </p>
          ))}
        </PortalCard>
      )}

      {uploaded && (
        <PortalCard className="space-y-2">
          <SectionTitle>{t("wizard.review.documents")}</SectionTitle>
          {draft.required_documents.map((doc) => {
            const name = uploaded[doc.id]
            const preview = previews?.[doc.id]

            return (
              <div key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  {name
                    ? <Check className="size-4 shrink-0 text-success" />
                    : <span className="size-4 shrink-0 rounded-full border" aria-hidden="true" />}
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{doc.name}</span>
                    {name && <span className="ml-1 text-xs text-muted-foreground">— {name}</span>}
                  </span>
                </div>
                {preview
                  ? <a href={preview} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-medium text-cas-navy hover:underline">{t("wizard.review.view")}</a>
                  : !name && <span className="shrink-0 text-xs text-muted-foreground">{t("wizard.review.notUploaded")}</span>}
              </div>
            )
          })}
        </PortalCard>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <input type="checkbox" checked={agreed} onChange={(e) => onAgreed(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-cas-navy" />
        <span className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cas-navy" />
          {declaration ?? t("wizard.review.declaration")}
        </span>
      </label>
    </div>
  )
}
