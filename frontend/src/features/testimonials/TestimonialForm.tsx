import { useMutation } from "@tanstack/react-query"
import { Camera, Trash2 } from "lucide-react"
import { useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { TestimonialPayload } from "@/features/portal/api"
import { COUNTRIES } from "@/features/site/countryList"
import { DEGREE_LABELS, SERVICE_LABELS } from "@/features/site/testimonialLabels"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

export type PhotoUpload = (file: File) => Promise<{ path: string; url: string | null }>

const STUDENT_SERVICES = ["admission", "scholarship", "visa", "arrival", "accommodation", "language"]
const PARTNER_STRENGTHS = ["commission", "communication", "portal", "speed", "support", "transparency"]
const FOUND_US: [string, string][] = [["friend", "A friend or family"], ["agent", "An agent"], ["social", "Social media"], ["search", "Online search"], ["event", "An event"], ["other", "Other"]]
const REFERRED = ["1-10", "11-50", "51-200", "200+"]
const DEGREES = ["bachelor", "master", "phd", "diploma", "non_degree"]

// Built once: 250 options should not be re-rendered on every keystroke.
const COUNTRY_OPTIONS = COUNTRIES.map((c) => <option key={c.iso2} value={c.iso2}>{c.name}</option>)

const field = "h-10 w-full rounded-md border bg-background px-3 text-sm"

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t pt-5 first:border-t-0 first:pt-0">
      <legend className="text-sm font-semibold text-cas-navy">{title}</legend>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  )
}

function Req() {
  return <span className="text-destructive" aria-hidden="true"> *</span>
}

/** Pick a photo, upload it right away, and show a round preview. */
function PhotoField({ path, preview, onChange, error, upload, optional }: { path: string; preview: string | null; onChange: (path: string, preview: string | null) => void; error?: string; upload: PhotoUpload; optional?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setProblem(null)
    setBusy(true)
    try {
      const res = await upload(file)
      onChange(res.path, res.url ?? URL.createObjectURL(file))
    } catch (e) {
      setProblem(e instanceof ApiError ? (e.errors?.image?.[0] ?? e.message) : "Could not upload the photo. Please try again.")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-subtle text-muted-foreground">
        {preview ? <img src={preview} alt="Your photo" className="size-full object-cover" /> : <Camera className="size-7" aria-hidden="true" />}
      </div>
      <div className="min-w-0 space-y-1">
        <input ref={input} id="tm-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Uploading…" : path ? "Change photo" : "Upload photo"}
          </Button>
          {path && !busy && (
            <Button type="button" variant="ghost" size="sm" aria-label="Remove photo" onClick={() => onChange("", null)}><Trash2 className="size-4" /></Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{optional ? "A photo or logo (optional). " : "A clear photo of your face. "}JPG, PNG or WebP, up to 5 MB.</p>
        {(problem || error) && <p role="alert" className="text-sm text-destructive">{problem ?? error}</p>}
      </div>
    </div>
  )
}

function Chips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o)

        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-cas-navy bg-cas-navy text-white" : "bg-card text-slate-600 hover:bg-muted")}
          >
            {SERVICE_LABELS[o] ?? o}
          </button>
        )
      })}
    </div>
  )
}

export interface TestimonialFormProps {
  kind: "student" | "agent"
  /** Public page: asks for an email and (for partners) a name; portal knows who you are. */
  mode: "portal" | "public"
  defaultName?: string
  upload: PhotoUpload
  submit: (payload: TestimonialPayload) => Promise<unknown>
  onSent: () => void
  rejectedNote?: boolean
}

/** The testimonial form, shared by the portal page and the public "share your experience" page. */
export function TestimonialForm({ kind, mode, defaultName = "", upload, submit, onSent, rejectedNote }: TestimonialFormProps) {
  const { t } = useTranslation()
  const isStudent = kind === "student"
  const isPublic = mode === "public"

  const [title, setTitle] = useState("")
  const [quote, setQuote] = useState("")
  const [displayName, setDisplayName] = useState(defaultName)
  const [photoPath, setPhotoPath] = useState("")
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [degree, setDegree] = useState("")
  const [university, setUniversity] = useState("")
  const [program, setProgram] = useState("")
  const [intakeYear, setIntakeYear] = useState("")
  const [country, setCountry] = useState("")
  const [countryCode, setCountryCode] = useState("")
  const [headline, setHeadline] = useState("")
  const [partnerSince, setPartnerSince] = useState("")
  const [referred, setReferred] = useState("")
  const [services, setServices] = useState<string[]>([])
  const [foundUs, setFoundUs] = useState("")
  const [recommend, setRecommend] = useState<boolean | null>(null)
  const [consent, setConsent] = useState(false)
  const [email, setEmail] = useState("")
  const [trap, setTrap] = useState("")

  const send = useMutation({
    mutationFn: () => {
      const payload: TestimonialPayload = {
        title: title.trim() || undefined, quote: quote.trim(), country: country.trim() || undefined,
        services: services.length ? services : undefined, recommend: recommend ?? undefined, consent_public: consent,
      }
      if (isPublic) Object.assign(payload, { audience: kind, contact_email: email.trim(), website: trap, display_name: displayName.trim(), photo_path: photoPath || undefined })
      if (isStudent) {
        Object.assign(payload, {
          display_name: displayName.trim(), country_code: countryCode || undefined, photo_path: photoPath || undefined, university: university.trim() || undefined,
          degree: degree || undefined, program: program.trim() || undefined,
          intake_year: intakeYear ? Number(intakeYear) : undefined, found_us: foundUs || undefined,
        })
      } else {
        Object.assign(payload, { headline: headline.trim() || undefined, partner_since: partnerSince || undefined, students_referred: referred || undefined })
      }

      return submit(payload)
    },
    onSuccess: onSent,
  })

  const error = send.error instanceof ApiError ? send.error : null
  const err = (k: string) => error?.errors?.[k]?.[0]
  const year = new Date().getFullYear()

  return (
    <form onSubmit={(e) => { e.preventDefault(); send.mutate() }} className="space-y-5" noValidate>
      {rejectedNote && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t("testimonialPage.rejected", { defaultValue: "We could not use your earlier text. You are welcome to write a new one." })}
        </p>
      )}

      {isStudent ? (
        <>
          <Section title={t("testimonialPage.aboutYouTitle", { defaultValue: "About you" })}>
            <PhotoField path={photoPath} preview={photoPreview} onChange={(p, v) => { setPhotoPath(p); setPhotoPreview(v) }} error={err("photo_path")} upload={upload} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tm-display">{t("testimonialPage.fullName", { defaultValue: "Your name" })}<Req /></Label>
                <Input id="tm-display" value={displayName} maxLength={120} onChange={(e) => setDisplayName(e.target.value)} aria-invalid={err("display_name") ? true : undefined} />
                {err("display_name") && <p role="alert" className="text-sm text-destructive">{err("display_name")}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tm-country">{t("testimonialPage.nationality", { defaultValue: "Nationality" })}<Req /></Label>
                <select id="tm-country" className={field} value={countryCode} onChange={(e) => setCountryCode(e.target.value)} aria-invalid={err("country_code") ? true : undefined}>
                  <option value="">—</option>
                  {COUNTRY_OPTIONS}
                </select>
                {err("country_code") && <p role="alert" className="text-sm text-destructive">{err("country_code")}</p>}
                <p className="text-xs text-muted-foreground">{t("testimonialPage.nationalityHint", { defaultValue: "You appear on the world map at this country." })}</p>
              </div>
            </div>
          </Section>

          <Section title={t("testimonialPage.studiesTitle", { defaultValue: "Your studies in China" })}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tm-university">{t("testimonialPage.university", { defaultValue: "University you are enrolled in" })}<Req /></Label>
                <Input id="tm-university" value={university} maxLength={160} onChange={(e) => setUniversity(e.target.value)} aria-invalid={err("university") ? true : undefined} />
                {err("university") && <p role="alert" className="text-sm text-destructive">{err("university")}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tm-degree">{t("testimonialPage.degree", { defaultValue: "Degree" })}<Req /></Label>
                <select id="tm-degree" className={field} value={degree} onChange={(e) => setDegree(e.target.value)} aria-invalid={err("degree") ? true : undefined}>
                  <option value="">—</option>
                  {DEGREES.map((d) => <option key={d} value={d}>{DEGREE_LABELS[d]}</option>)}
                </select>
                {err("degree") && <p role="alert" className="text-sm text-destructive">{err("degree")}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tm-program">{t("testimonialPage.program", { defaultValue: "Major" })}<Req /></Label>
                <Input id="tm-program" value={program} maxLength={160} onChange={(e) => setProgram(e.target.value)} placeholder="MBBS, Engineering…" aria-invalid={err("program") ? true : undefined} />
                {err("program") && <p role="alert" className="text-sm text-destructive">{err("program")}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tm-intake">{t("testimonialPage.intake", { defaultValue: "Intake year (optional)" })}</Label>
                <select id="tm-intake" className={field} value={intakeYear} onChange={(e) => setIntakeYear(e.target.value)}>
                  <option value="">—</option>
                  {[0, 1, 2, 3, 4, 5].map((d) => <option key={d} value={year + 1 - d}>{year + 1 - d}</option>)}
                </select>
              </div>
            </div>
          </Section>
        </>
      ) : (
        <Section title={t("testimonialPage.businessTitle", { defaultValue: "About your agency (optional)" })}>
        {isPublic && (
          <>
            <PhotoField path={photoPath} preview={photoPreview} onChange={(p, v) => { setPhotoPath(p); setPhotoPreview(v) }} error={err("photo_path")} upload={upload} optional />
            <div className="space-y-2">
              <Label htmlFor="tm-agent-name">{t("testimonialPage.agencyName", { defaultValue: "Agency name (or your name)" })}<Req /></Label>
              <Input id="tm-agent-name" value={displayName} maxLength={120} onChange={(e) => setDisplayName(e.target.value)} aria-invalid={err("display_name") ? true : undefined} />
              {err("display_name") && <p role="alert" className="text-sm text-destructive">{err("display_name")}</p>}
            </div>
          </>
        )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tm-headline">{t("testimonialPage.agencyLine", { defaultValue: "Type and city" })}</Label>
              <Input id="tm-headline" value={headline} maxLength={160} onChange={(e) => setHeadline(e.target.value)} placeholder="Partner agency, Lahore" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tm-country">{t("testimonialPage.country", { defaultValue: "Your country" })}</Label>
              <Input id="tm-country" value={country} maxLength={80} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tm-since">{t("testimonialPage.partnerSince", { defaultValue: "Partner since (year)" })}</Label>
              <select id="tm-since" className={field} value={partnerSince} onChange={(e) => setPartnerSince(e.target.value)}>
                <option value="">—</option>
                {[0, 1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={String(year - d)}>{year - d}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tm-referred">{t("testimonialPage.referred", { defaultValue: "Students sent to CAS" })}</Label>
              <select id="tm-referred" className={field} value={referred} onChange={(e) => setReferred(e.target.value)}>
                <option value="">—</option>
                {REFERRED.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </Section>
      )}

      <Section title={t("testimonialPage.storyTitle", { defaultValue: "Your story" })}>
        <div className="space-y-2">
          <Label htmlFor="tm-title">{t("testimonialPage.headlineLabel", { defaultValue: "A short headline (optional)" })}</Label>
          <Input id="tm-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)}
            placeholder={isStudent ? "Smooth from offer to arrival" : "A partner we can rely on"} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tm-quote">{t("testimonialPage.quote", { defaultValue: "Your experience" })}<Req /></Label>
          <Textarea id="tm-quote" rows={5} maxLength={1200} value={quote} onChange={(e) => setQuote(e.target.value)}
            placeholder={t("testimonialPage.quotePlaceholder", { defaultValue: "What was it like working with CAS? What would you tell someone about to start?" })}
            aria-invalid={err("quote") ? true : undefined} />
          <p className="text-right text-xs text-muted-foreground">{quote.length}/1200</p>
          {err("quote") && <p role="alert" className="text-sm text-destructive">{err("quote")}</p>}
        </div>
      </Section>

      <Section title={isStudent ? t("testimonialPage.servicesTitle", { defaultValue: "What did CAS help you with?" }) : t("testimonialPage.strengthsTitle", { defaultValue: "What do you value most?" })}
        hint={t("testimonialPage.pickAny", { defaultValue: "Pick any that apply." })}>
        <Chips options={isStudent ? STUDENT_SERVICES : PARTNER_STRENGTHS} value={services} onChange={setServices} />
      </Section>

      <Section title={t("testimonialPage.recommendTitle", { defaultValue: "Would you recommend CAS to a friend or colleague?" })}>
        <div role="radiogroup" aria-label="Recommend" className="inline-grid grid-cols-2 gap-1 rounded-lg bg-subtle p-1">
          {([[true, "Yes"], [false, "Not sure"]] as const).map(([v, label]) => (
            <button key={label} type="button" role="radio" aria-checked={recommend === v} onClick={() => setRecommend(v)}
              className={cn("rounded-md px-6 py-2 text-sm font-medium transition-colors", recommend === v ? "bg-card text-cas-navy shadow-sm" : "text-muted-foreground")}>
              {label}
            </button>
          ))}
        </div>
      </Section>

      {isStudent && (
        <Section title={t("testimonialPage.privateTitle", { defaultValue: "Just for us (never shown)" })}>
          <div className="space-y-2">
            <Label htmlFor="tm-found">{t("testimonialPage.foundUs", { defaultValue: "How did you hear about CAS?" })}</Label>
            <select id="tm-found" className={field} value={foundUs} onChange={(e) => setFoundUs(e.target.value)}>
              <option value="">—</option>
              {FOUND_US.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </Section>
      )}

      {isPublic && (
      <Section title={t("testimonialPage.contactTitle", { defaultValue: "Just for us (never shown)" })}>
        <div className="space-y-2">
          <Label htmlFor="tm-email">{t("testimonialPage.email", { defaultValue: "Your email" })}<Req /></Label>
          <Input id="tm-email" type="email" autoComplete="email" inputMode="email" value={email} maxLength={190} onChange={(e) => setEmail(e.target.value)} aria-invalid={err("contact_email") ? true : undefined} />
          <p className="text-xs text-muted-foreground">{t("testimonialPage.emailHint", { defaultValue: "So we can reach you if we have a question. It is never shown on the website." })}</p>
          {err("contact_email") && <p role="alert" className="text-sm text-destructive">{err("contact_email")}</p>}
        </div>
        {/* Honeypot: people never see or fill this; bots do. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>Website<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
        </div>
      </Section>
    )}

    <Section title={t("testimonialPage.showTitle", { defaultValue: "Showing it on our website" })}>
        <div>
          <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={err("consent_public") ? true : undefined}
              className="mt-0.5 size-4 shrink-0 rounded border-input accent-[#14357C]" />
            <span>{t("testimonialPage.consent", { defaultValue: "I agree that CAS may show my words, name and photo (or company name) on its website. I can ask to have it removed at any time." })}</span>
          </label>
          {err("consent_public") && <p role="alert" className="mt-1 text-xs text-destructive">{err("consent_public")}</p>}
        </div>
      </Section>

      {error && !Object.keys(error.errors ?? {}).length && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={send.isPending}>
        {send.isPending ? t("testimonialPage.sending", { defaultValue: "Sending…" }) : t("testimonialPage.send", { defaultValue: "Send" })}
      </Button>
    </form>
  )
}
