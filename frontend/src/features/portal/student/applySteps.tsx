import { Check, Loader2, Plus, Upload, X } from "lucide-react"
import { useState, type ReactNode } from "react"

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
  uploadApplicationDocument,
  type CountryRow,
  type DraftApplication,
  type WizardEducation,
  type WizardGuardian,
} from "@/features/portal/api"
import { PortalCard } from "@/features/portal/components"
import { EMPTY_EDUCATION, type Profile } from "@/features/portal/student/applyShared"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

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

// ── Family + education ───────────────────────────────────────────────────────

export function BackgroundStep(props: {
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

// ── Documents ────────────────────────────────────────────────────────────────

export function DocumentsStep(props: {
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
        <PortalCard><p className="text-sm text-muted-foreground">No documents are required.</p></PortalCard>
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

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="border-b pb-2 text-xs font-semibold tracking-wider text-cas-navy uppercase">{children}</p>
}
