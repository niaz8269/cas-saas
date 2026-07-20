import { useMutation } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, Send, Sparkles } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { postEnquiry, SiteApiError, type EnquiryPayload } from "@/features/site/api"
import { cn } from "@/lib/utils"

const LEVELS = ["Bachelor's", "Master's", "PhD / Doctoral", "Non-degree", "Chinese language"]
const FIELDS = ["Medicine / MBBS", "Engineering", "Business & MBA", "Computer Science", "Natural Sciences", "Humanities & Arts", "Law", "Education", "Agriculture", "Other"]
const INTAKES = ["Spring 2026", "Autumn 2026", "Spring 2027", "Autumn 2027", "Flexible"]
const FUNDING = ["Self-funded", "Looking for a scholarship"]
const CITIES = ["Any city", "Beijing", "Shanghai", "Guangzhou", "Nanjing", "Hangzhou", "Wuhan", "Chongqing", "Other"]
const GRADES = ["90–100%", "80–89%", "70–79%", "60–69%", "Below 60%", "Prefer not to say"]

const STEPS = ["Your goal", "Preferences", "Your details"]

const EMPTY = {
  level: "", field: "", intake: "", funding: "", city: "", grade: "",
  name: "", email: "", phone: "", nationality: "",
}

const selectClass = "w-full rounded-sm border bg-background px-3 py-2.5 text-sm"

export default function SiteStudyPlan() {
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
    if (step === 0 && !a.level) { setClientError("Please choose what you'd like to study."); return }
    setClientError(null)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const back = () => { setClientError(null); setStep((s) => Math.max(s - 1, 0)) }

  const submit = () => {
    if (!a.name.trim()) { setClientError("Please tell us your name."); return }
    if (!a.email.trim() && !a.phone.trim()) { setClientError("Add an email or a phone number so we can reach you."); return }
    setClientError(null); setErrors({})
    mutation.mutate()
  }

  if (mutation.isSuccess) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <div className="rounded-sm border bg-card p-10 shadow-sm">
          <CheckCircle2 className="mx-auto size-12 text-green-600" />
          <h1 className="mt-4 font-sans text-2xl font-bold text-cas-navy">Your study plan is on its way</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Thank you, {a.name.trim().split(/\s+/)[0]}. A CAS advisor will review your goals and get back to you
            within one working day with matched universities, programs and scholarships.
          </p>
          <Button asChild className="mt-6"><Link to="/site/universities">Browse universities meanwhile →</Link></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-cas-navy-50 px-3 py-1 text-xs font-semibold text-cas-navy">
          <Sparkles className="size-3.5" /> Free · takes 3 minutes
        </span>
        <h1 className="mt-3 font-sans text-3xl font-bold text-cas-navy sm:text-4xl">Get your free study plan</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Answer a few questions and a CAS advisor will send you a personalised shortlist of universities,
          programs and scholarships — no cost, no obligation.
        </p>
      </div>

      {/* Progress */}
      <ol className="mx-auto mt-8 flex max-w-md items-center">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                i < step ? "bg-cas-navy text-white" : i === step ? "bg-cas-orange text-cas-navy" : "bg-muted text-muted-foreground",
              )}>
                {i < step ? "✓" : i + 1}
              </span>
              <span className={cn("text-[11px] font-medium", i === step ? "text-cas-navy" : "text-muted-foreground")}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <span className={cn("mx-2 h-0.5 flex-1 rounded", i < step ? "bg-cas-navy" : "bg-muted")} />}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-sm border bg-card p-6 shadow-sm sm:p-8">
        {clientError && <p role="alert" className="mb-4 rounded-sm bg-cas-red-50 px-3 py-2 text-sm text-destructive">{clientError}</p>}

        {step === 0 && (
          <div className="space-y-6">
            <Field label="What would you like to study?">
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <Chip key={l} active={a.level === l} onClick={() => set("level", l)}>{l}</Chip>
                ))}
              </div>
            </Field>
            <Field label="Field of study" hint="Optional">
              <select className={selectClass} value={a.field} onChange={(e) => set("field", e.target.value)}>
                <option value="">Not sure yet</option>
                {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="When do you want to start?">
              <select className={selectClass} value={a.intake} onChange={(e) => set("intake", e.target.value)}>
                <option value="">No preference</option>
                {INTAKES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="How will you fund your studies?">
              <select className={selectClass} value={a.funding} onChange={(e) => set("funding", e.target.value)}>
                <option value="">No preference</option>
                {FUNDING.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Preferred city" hint="Optional">
              <select className={selectClass} value={a.city} onChange={(e) => set("city", e.target.value)}>
                {CITIES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Current average grade" hint="Optional">
              <select className={selectClass} value={a.grade} onChange={(e) => set("grade", e.target.value)}>
                <option value="">Prefer not to say</option>
                {GRADES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.first_name?.[0]}>
                <Input value={a.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
              </Field>
              <Field label="Nationality" hint="Optional">
                <Input value={a.nationality} onChange={(e) => set("nationality", e.target.value)} autoComplete="country-name" />
              </Field>
              <Field label="Email" error={errors.email?.[0]}>
                <Input type="email" value={a.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" inputMode="email" />
              </Field>
              <Field label="Phone / WhatsApp" error={errors.phone?.[0]}>
                <Input value={a.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" inputMode="tel" />
              </Field>
            </div>
            <div className="rounded-sm bg-subtle p-3 text-xs text-muted-foreground">
              <GraduationCap className="mr-1.5 inline size-4 text-cas-navy" />
              We'll match you with Ministry of Education–listed universities and scholarships based on your answers.
            </div>
            <div className="hidden" aria-hidden="true">
              <label>Company<input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} /></label>
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 0} className={cn(step === 0 && "invisible")}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>Continue <ArrowRight className="size-4" /></Button>
          ) : (
            <Button type="button" onClick={submit} disabled={mutation.isPending}>
              <Send className="size-4" /> {mutation.isPending ? "Sending…" : "Get my study plan"}
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
