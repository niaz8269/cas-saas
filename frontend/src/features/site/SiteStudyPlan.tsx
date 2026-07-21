import { useMutation } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, Send, Sparkles } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { postEnquiry, SiteApiError, type EnquiryPayload } from "@/features/site/api"
import { cn } from "@/lib/utils"

// Option lists: `value` is the (unchanged) submitted form value; `labelKey`
// is the i18n key for its display text, resolved via t() at render.
const LEVELS = [
  { value: "Bachelor's", labelKey: "studyPlan.levels.bachelor" },
  { value: "Master's", labelKey: "studyPlan.levels.master" },
  { value: "PhD / Doctoral", labelKey: "studyPlan.levels.phd" },
  { value: "Non-degree", labelKey: "studyPlan.levels.nonDegree" },
  { value: "Chinese language", labelKey: "studyPlan.levels.chinese" },
]
const FIELDS = [
  { value: "Medicine / MBBS", labelKey: "studyPlan.fields.medicine" },
  { value: "Engineering", labelKey: "studyPlan.fields.engineering" },
  { value: "Business & MBA", labelKey: "studyPlan.fields.business" },
  { value: "Computer Science", labelKey: "studyPlan.fields.computerScience" },
  { value: "Natural Sciences", labelKey: "studyPlan.fields.naturalSciences" },
  { value: "Humanities & Arts", labelKey: "studyPlan.fields.humanities" },
  { value: "Law", labelKey: "studyPlan.fields.law" },
  { value: "Education", labelKey: "studyPlan.fields.education" },
  { value: "Agriculture", labelKey: "studyPlan.fields.agriculture" },
  { value: "Other", labelKey: "studyPlan.fields.other" },
]
const INTAKES = [
  { value: "Spring 2026", labelKey: "studyPlan.intakes.spring2026" },
  { value: "Autumn 2026", labelKey: "studyPlan.intakes.autumn2026" },
  { value: "Spring 2027", labelKey: "studyPlan.intakes.spring2027" },
  { value: "Autumn 2027", labelKey: "studyPlan.intakes.autumn2027" },
  { value: "Flexible", labelKey: "studyPlan.intakes.flexible" },
]
const FUNDING = [
  { value: "Self-funded", labelKey: "studyPlan.funding.selfFunded" },
  { value: "Looking for a scholarship", labelKey: "studyPlan.funding.scholarship" },
]
const CITIES = [
  { value: "Any city", labelKey: "studyPlan.cities.any" },
  { value: "Beijing", labelKey: "studyPlan.cities.beijing" },
  { value: "Shanghai", labelKey: "studyPlan.cities.shanghai" },
  { value: "Guangzhou", labelKey: "studyPlan.cities.guangzhou" },
  { value: "Nanjing", labelKey: "studyPlan.cities.nanjing" },
  { value: "Hangzhou", labelKey: "studyPlan.cities.hangzhou" },
  { value: "Wuhan", labelKey: "studyPlan.cities.wuhan" },
  { value: "Chongqing", labelKey: "studyPlan.cities.chongqing" },
  { value: "Other", labelKey: "studyPlan.cities.other" },
]
const GRADES = [
  { value: "90–100%", labelKey: "studyPlan.grades.g90" },
  { value: "80–89%", labelKey: "studyPlan.grades.g80" },
  { value: "70–79%", labelKey: "studyPlan.grades.g70" },
  { value: "60–69%", labelKey: "studyPlan.grades.g60" },
  { value: "Below 60%", labelKey: "studyPlan.grades.below60" },
  { value: "Prefer not to say", labelKey: "studyPlan.grades.preferNotToSay" },
]

const STEPS = ["studyPlan.steps.goal", "studyPlan.steps.preferences", "studyPlan.steps.details"]

const EMPTY = {
  level: "", field: "", intake: "", funding: "", city: "", grade: "",
  name: "", email: "", phone: "", nationality: "",
}

const selectClass = "w-full rounded-sm border bg-background px-3 py-2.5 text-sm"

export default function SiteStudyPlan() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [a, setA] = useState({ ...EMPTY })
  const [clientError, setClientError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [company, setCompany] = useState("") // honeypot

  const set = <K extends keyof typeof a>(k: K, v: string) => setA((s) => ({ ...s, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => {
      const [first, ...rest] = a.name.trim().split(/\s+/)
      const details: Record<string, string> = {}
      const add = (k: string, v: string, skip?: string) => { if (v && v !== skip) details[k] = v }
      add("Level", a.level)
      add("Field", a.field)
      add("Intake", a.intake)
      add("Funding", a.funding)
      add("Preferred city", a.city, "Any city")
      add("Average grade", a.grade, "Prefer not to say")
      add("Nationality", a.nationality)

      const message = "Study plan request\n" + Object.entries(details).map(([k, v]) => `${k}: ${v}`).join("\n")

      return postEnquiry({
        first_name: first || a.name,
        last_name: rest.join(" ") || undefined,
        email: a.email || undefined,
        phone: a.phone || undefined,
        message,
        details,
        form_type: "study_plan",
        source_url: typeof window !== "undefined" ? window.location.href : undefined,
        ...(company ? { company } : {}),
      } as EnquiryPayload & { company?: string })
    },
    onError: (err) => setErrors(err instanceof SiteApiError ? err.errors : {}),
  })

  const next = () => {
    if (step === 0 && !a.level) { setClientError(t("studyPlan.errors.chooseStudy")); return }
    setClientError(null)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const back = () => { setClientError(null); setStep((s) => Math.max(s - 1, 0)) }

  const submit = () => {
    if (!a.name.trim()) { setClientError(t("studyPlan.errors.name")); return }
    if (!a.email.trim() && !a.phone.trim()) { setClientError(t("studyPlan.errors.contact")); return }
    setClientError(null); setErrors({})
    mutation.mutate()
  }

  if (mutation.isSuccess) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <div className="rounded-sm border bg-card p-10 shadow-sm">
          <CheckCircle2 className="mx-auto size-12 text-green-600" />
          <h1 className="mt-4 font-sans text-2xl font-bold text-cas-navy">{t("studyPlan.success.title")}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {t("studyPlan.success.body", { name: a.name.trim().split(/\s+/)[0] })}
          </p>
          <Button asChild className="mt-6"><Link to="/site/universities">{t("studyPlan.success.browse")}</Link></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-cas-navy-50 px-3 py-1 text-xs font-semibold text-cas-navy">
          <Sparkles className="size-3.5" /> {t("studyPlan.badge")}
        </span>
        <h1 className="mt-3 font-sans text-3xl font-bold text-cas-navy sm:text-4xl">{t("studyPlan.title")}</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          {t("studyPlan.subtitle")}
        </p>
      </div>

      {/* Progress */}
      <ol className="mx-auto mt-8 flex max-w-md items-center">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                i < step ? "bg-cas-navy text-white" : i === step ? "bg-cas-red text-white" : "bg-muted text-muted-foreground",
              )}>
                {i < step ? "✓" : i + 1}
              </span>
              <span className={cn("text-[11px] font-medium", i === step ? "text-cas-navy" : "text-muted-foreground")}>{t(label)}</span>
            </div>
            {i < STEPS.length - 1 && <span className={cn("mx-2 h-0.5 flex-1 rounded", i < step ? "bg-cas-navy" : "bg-muted")} />}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-sm border bg-card p-6 shadow-sm sm:p-8">
        {clientError && <p role="alert" className="mb-4 rounded-sm bg-cas-red-50 px-3 py-2 text-sm text-destructive">{clientError}</p>}

        {step === 0 && (
          <div className="space-y-6">
            <Field label={t("studyPlan.q.study")}>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <Chip key={l.value} active={a.level === l.value} onClick={() => set("level", l.value)}>{t(l.labelKey)}</Chip>
                ))}
              </div>
            </Field>
            <Field label={t("studyPlan.q.field")} hint={t("studyPlan.optional")}>
              <select className={selectClass} value={a.field} onChange={(e) => set("field", e.target.value)}>
                <option value="">{t("studyPlan.fieldNotSure")}</option>
                {FIELDS.map((f) => <option key={f.value} value={f.value}>{t(f.labelKey)}</option>)}
              </select>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={t("studyPlan.q.intake")}>
              <select className={selectClass} value={a.intake} onChange={(e) => set("intake", e.target.value)}>
                <option value="">{t("studyPlan.noPreference")}</option>
                {INTAKES.map((v) => <option key={v.value} value={v.value}>{t(v.labelKey)}</option>)}
              </select>
            </Field>
            <Field label={t("studyPlan.q.funding")}>
              <select className={selectClass} value={a.funding} onChange={(e) => set("funding", e.target.value)}>
                <option value="">{t("studyPlan.noPreference")}</option>
                {FUNDING.map((v) => <option key={v.value} value={v.value}>{t(v.labelKey)}</option>)}
              </select>
            </Field>
            <Field label={t("studyPlan.q.city")} hint={t("studyPlan.optional")}>
              <select className={selectClass} value={a.city} onChange={(e) => set("city", e.target.value)}>
                {CITIES.map((v) => <option key={v.value} value={v.value}>{t(v.labelKey)}</option>)}
              </select>
            </Field>
            <Field label={t("studyPlan.q.grade")} hint={t("studyPlan.optional")}>
              <select className={selectClass} value={a.grade} onChange={(e) => set("grade", e.target.value)}>
                <option value="">{t("studyPlan.grades.preferNotToSay")}</option>
                {GRADES.map((v) => <option key={v.value} value={v.value}>{t(v.labelKey)}</option>)}
              </select>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("studyPlan.q.name")} error={errors.first_name?.[0]}>
                <Input value={a.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
              </Field>
              <Field label={t("studyPlan.q.nationality")} hint={t("studyPlan.optional")}>
                <Input value={a.nationality} onChange={(e) => set("nationality", e.target.value)} autoComplete="country-name" />
              </Field>
              <Field label={t("studyPlan.q.email")} error={errors.email?.[0]}>
                <Input type="email" value={a.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" inputMode="email" />
              </Field>
              <Field label={t("studyPlan.q.phone")} error={errors.phone?.[0]}>
                <Input value={a.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" inputMode="tel" />
              </Field>
            </div>
            <div className="rounded-sm bg-subtle p-3 text-xs text-muted-foreground">
              <GraduationCap className="mr-1.5 inline size-4 text-cas-navy" />
              {t("studyPlan.matchNote")}
            </div>
            <div className="hidden" aria-hidden="true">
              <label>Company<input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} /></label>
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 0} className={cn(step === 0 && "invisible")}>
            <ArrowLeft className="size-4" /> {t("studyPlan.back")}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>{t("studyPlan.continue")} <ArrowRight className="size-4" /></Button>
          ) : (
            <Button type="button" onClick={submit} disabled={mutation.isPending}>
              <Send className="size-4" /> {mutation.isPending ? t("studyPlan.sending") : t("studyPlan.submit")}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p role="alert" className="mt-1 text-sm text-destructive">{error}</p>}
    </label>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active ? "border-cas-navy bg-cas-navy text-white" : "bg-background text-muted-foreground hover:border-cas-navy/40 hover:text-cas-navy",
      )}
    >
      {children}
    </button>
  )
}
