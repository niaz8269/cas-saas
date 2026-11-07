import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Camera, CheckCircle2, Trash2 } from "lucide-react"
import { useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getMyTestimonial, submitTestimonial, uploadTestimonialPhoto, type TestimonialPayload } from "@/features/portal/api"
import { PageTitle, PortalCard } from "@/features/portal/components"
import { DEGREE_LABELS, SERVICE_LABELS } from "@/features/site/testimonialLabels"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { usePortalAuthStore, type PortalKind } from "@/stores/portalAuth"

const STUDENT_SERVICES = ["admission", "scholarship", "visa", "arrival", "accommodation", "language"]
const PARTNER_STRENGTHS = ["commission", "communication", "portal", "speed", "support", "transparency"]
const FOUND_US: [string, string][] = [["friend", "A friend or family"], ["agent", "An agent"], ["social", "Social media"], ["search", "Online search"], ["event", "An event"], ["other", "Other"]]
const REFERRED = ["1-10", "11-50", "51-200", "200+"]
const DEGREES = ["bachelor", "master", "phd", "diploma", "non_degree"]

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
function PhotoField({ path, preview, onChange, error }: { path: string; preview: string | null; onChange: (path: string, preview: string | null) => void; error?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setProblem(null)
    setBusy(true)
    try {
      const res = await uploadTestimonialPhoto(file)
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
        <p className="text-xs text-muted-foreground">A clear photo of your face. JPG, PNG or WebP, up to 5 MB.</p>
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

/** A student or partner shares their experience; staff review it before anything is public. */
export default function TestimonialPage({ kind }: { kind: PortalKind }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const mine = useQuery({ queryKey: ["my-testimonial", kind], queryFn: () => getMyTestimonial(kind) })
  const isStudent = kind === "student"

  const [title, setTitle] = useState("")
  const [quote, setQuote] = useState("")
  const profile = usePortalAuthStore((st) => st.profile)
  const [displayName, setDisplayName] = useState(profile?.name ?? "")
  const [photoPath, setPhotoPath] = useState("")
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [degree, setDegree] = useState("")
  const [university, setUniversity] = useState("")
  const [program, setProgram] = useState("")
  const [intakeYear, setIntakeYear] = useState("")
  const [country, setCountry] = useState("")
  const [headline, setHeadline] = useState("")
  const [partnerSince, setPartnerSince] = useState("")
  const [referred, setReferred] = useState("")
  const [services, setServices] = useState<string[]>([])
  const [foundUs, setFoundUs] = useState("")
  const [recommend, setRecommend] = useState<boolean | null>(null)
  const [consent, setConsent] = useState(false)

  const send = useMutation({
    mutationFn: () => {
      const payload: TestimonialPayload = {
        title: title.trim() || undefined, quote: quote.trim(), country: country.trim() || undefined,
        services: services.length ? services : undefined, recommend: recommend ?? undefined, consent_public: consent,
      }
      if (isStudent) {
        Object.assign(payload, {
          display_name: displayName.trim(), photo_path: photoPath || undefined, university: university.trim() || undefined,
          degree: degree || undefined, program: program.trim() || undefined,
          intake_year: intakeYear ? Number(intakeYear) : undefined, found_us: foundUs || undefined,
        })
      } else {
        Object.assign(payload, { headline: headline.trim() || undefined, partner_since: partnerSince || undefined, students_referred: referred || undefined })
      }

      return submitTestimonial(kind, payload)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-testimonial", kind] }),
  })

  const existing = mine.data?.data
  const error = send.error instanceof ApiError ? send.error : null
  const err = (k: string) => error?.errors?.[k]?.[0]
  const year = new Date().getFullYear()

  return (
    <div className="space-y-4">
      <PageTitle
        title={t("testimonialPage.title", { defaultValue: "Share your experience" })}
        subtitle={t("testimonialPage.subtitle", { defaultValue: "Your words help the next student or partner decide. We read every one before anything is shown." })}
      />

      {existing && existing.status !== "rejected" ? (
        <PortalCard>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">
                {existing.status === "approved"
                  ? t("testimonialPage.approved", { defaultValue: "Thank you! Your words are on our website." })
                  : t("testimonialPage.pending", { defaultValue: "Thank you! Our team will review your words soon." })}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">“{existing.quote}”</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("testimonialPage.changeNote", { defaultValue: "To change or remove it, write to us and we will do it for you." })}
              </p>
            </div>
          </div>
        </PortalCard>
      ) : (
        <PortalCard>
          <form onSubmit={(e) => { e.preventDefault(); send.mutate() }} className="space-y-5" noValidate>
            {existing?.status === "rejected" && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                {t("testimonialPage.rejected", { defaultValue: "We could not use your earlier text. You are welcome to write a new one." })}
              </p>
            )}

            {isStudent ? (
              <>
                <Section title={t("testimonialPage.aboutYouTitle", { defaultValue: "About you" })}>
                  <PhotoField path={photoPath} preview={photoPreview} onChange={(p, v) => { setPhotoPath(p); setPhotoPreview(v) }} error={err("photo_path")} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tm-display">{t("testimonialPage.fullName", { defaultValue: "Your name" })}<Req /></Label>
                      <Input id="tm-display" value={displayName} maxLength={120} onChange={(e) => setDisplayName(e.target.value)} aria-invalid={err("display_name") ? true : undefined} />
                      {err("display_name") && <p role="alert" className="text-sm text-destructive">{err("display_name")}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tm-country">{t("testimonialPage.nationality", { defaultValue: "Nationality" })}<Req /></Label>
                      <Input id="tm-country" value={country} maxLength={80} onChange={(e) => setCountry(e.target.value)} placeholder="Pakistani" aria-invalid={err("country") ? true : undefined} />
                      {err("country") && <p role="alert" className="text-sm text-destructive">{err("country")}</p>}
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
        </PortalCard>
      )}
    </div>
  )
}
