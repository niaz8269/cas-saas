import { useMutation } from "@tanstack/react-query"
import { CheckCircle2, ChevronDown, X } from "lucide-react"
import { useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { postEnquiry, SiteApiError, type EnquiryPayload } from "@/features/site/api"
import { COUNTRIES, COUNTRY_BY_ISO2 } from "@/features/site/countryList"
import { homePopupState } from "@/features/site/homePopupState"
import { cn } from "@/lib/utils"

/** Search engine crawlers and automated browsers never see the pop-up, so it cannot cover the page they index. */
function isAutomated(): boolean {
  if (typeof navigator === "undefined") return true

  return Boolean((navigator as Navigator & { webdriver?: boolean }).webdriver) || /bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent)
}

const DEGREES = ["bachelor", "master", "phd", "non_degree"] as const
const PROGRAMS = ["mbbs", "dentistry", "tcm", "engineering", "computer", "business", "language", "other"] as const

/** 16px text on phones keeps iOS from zooming into a field; 14px from the small breakpoint up. */
const control = "h-10 [@media(max-height:640px)]:h-9 w-full rounded-none border bg-white px-3 text-base text-ink placeholder:text-slate-400 focus-visible:border-cas-navy focus-visible:ring-1 focus-visible:ring-cas-navy focus-visible:outline-none sm:text-sm"

/**
 * Quick-enquiry pop-up for the home page. Posts to the same public enquiry endpoint as every other website
 * form, so the visitor becomes a source-attributed lead in the CRM (and the enquiry inbox gets an email).
 * Dismissible with the close button, Esc or a click outside.
 */
export default function HomeEnquiryPopup({ delayMs = 1200 }: { delayMs?: number }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState({ degree: "", program: "", name: "", country: "", email: "", phone: "" })
  const [company, setCompany] = useState("") // honeypot
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Opens once per page load: a refresh opens it again, browsing around the site does not.
    if (homePopupState.shown || isAutomated()) return
    const timer = setTimeout(() => {
      homePopupState.shown = true
      setOpen(true)
    }, delayMs)

    return () => clearTimeout(timer)
  }, [delayMs])

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }))

  const mutation = useMutation({
    mutationFn: () => {
      const [first, ...rest] = values.name.trim().split(/\s+/)
      const countryName = COUNTRY_BY_ISO2[values.country]?.name
      const degree = t(`homePopup.degrees.${values.degree}`)
      const program = t(`homePopup.programs.${values.program}`)
      const payload: EnquiryPayload & { company?: string; country?: string } = {
        first_name: first,
        last_name: rest.join(" ") || undefined,
        email: values.email.trim() || undefined,
        phone: values.phone.trim() || undefined,
        country: values.country || undefined,
        message: `Quick enquiry from the home page. Degree: ${degree}. Program: ${program}.${countryName ? ` Nationality: ${countryName}.` : ""}`,
        form_type: "home_popup",
        source_url: typeof window !== "undefined" ? window.location.href : undefined,
        details: { degree, program, ...(countryName ? { nationality: countryName } : {}) },
        ...(company ? { company } : {}),
      }

      return postEnquiry(payload)
    },
    onError: (err) => {
      const server = err instanceof SiteApiError ? err.errors : {}
      setErrors(Object.fromEntries(Object.entries(server).map(([k, v]) => [k, v[0]])))
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!values.degree) next.degree = t("homePopup.errorDegree")
    if (!values.program) next.program = t("homePopup.errorProgram")
    if (!values.name.trim()) next.first_name = t("homePopup.errorName")
    if (!values.country) next.country = t("homePopup.errorCountry")
    if (!values.email.trim() && !values.phone.trim()) next.phone = t("homePopup.errorContact")
    setErrors(next)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[94dvh] gap-0 overflow-y-auto rounded-none border-0 p-0 shadow-2xl [scrollbar-width:none] sm:max-w-[26rem] [&::-webkit-scrollbar]:hidden"
        aria-describedby="home-popup-desc"
      >
        <div className="relative border-b-4 border-cas-red bg-cas-navy px-5 pt-5 pb-4 text-white sm:px-6 sm:pt-6 sm:pb-5 [@media(max-height:640px)]:pt-4 [@media(max-height:640px)]:pb-3">
          <DialogClose aria-label={t("homePopup.close")} className="absolute top-3 right-3 p-1 text-white/80 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none">
            <X className="size-5" />
          </DialogClose>
          <DialogTitle className="pr-6 text-xl leading-snug font-semibold text-white">
            {mutation.isSuccess ? t("enquiry.thankYou") : t("homePopup.title")}
          </DialogTitle>
          <DialogDescription id="home-popup-desc" className="mt-1.5 text-sm leading-relaxed text-white/80 [@media(max-height:640px)]:hidden">
            {mutation.isSuccess ? t("enquiry.thankYouBody") : t("homePopup.subtitle")}
          </DialogDescription>
        </div>

        {mutation.isSuccess ? (
          <div className="px-6 py-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-green-600" />
            <Button className="mt-6 h-10 rounded-none bg-cas-navy px-8 text-white hover:bg-cas-navy-700" onClick={() => setOpen(false)}>
              {t("homePopup.close")}
            </Button>
          </div>
        ) : (
          <form className="space-y-3 px-5 py-4 sm:space-y-4 sm:px-6 sm:py-5 [@media(max-height:640px)]:space-y-2.5 [@media(max-height:640px)]:py-3" onSubmit={submit} noValidate>
            {mutation.isError && Object.keys(errors).length === 0 && (
              <p role="alert" className="border-l-4 border-destructive bg-cas-red-50 px-3 py-2 text-sm text-destructive">{t("enquiry.errorGeneric")}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <SelectField label={t("homePopup.degree")} placeholder={t("homePopup.degreePlaceholder")} value={values.degree} onChange={set("degree")} error={errors.degree}>
                {DEGREES.map((d) => <option key={d} value={d}>{t(`homePopup.degrees.${d}`)}</option>)}
              </SelectField>
              <SelectField label={t("homePopup.program")} placeholder={t("homePopup.programPlaceholder")} value={values.program} onChange={set("program")} error={errors.program}>
                {PROGRAMS.map((p) => <option key={p} value={p}>{t(`homePopup.programs.${p}`)}</option>)}
              </SelectField>
            </div>

            <TextField label={t("homePopup.name")} placeholder={t("homePopup.namePlaceholder")} value={values.name} onChange={set("name")} error={errors.first_name} autoComplete="name" />

            <SelectField label={t("homePopup.nationality")} placeholder={t("homePopup.nationalityPlaceholder")} value={values.country} onChange={set("country")} error={errors.country}>
              {COUNTRIES.map((c) => <option key={c.iso2} value={c.iso2}>{c.name}</option>)}
            </SelectField>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <TextField label={t("homePopup.email")} placeholder={t("homePopup.emailPlaceholder")} type="email" inputMode="email" autoComplete="email" value={values.email} onChange={set("email")} error={errors.email} />
              <TextField label={t("homePopup.whatsapp")} placeholder={t("homePopup.whatsappPlaceholder")} inputMode="tel" autoComplete="tel" value={values.phone} onChange={set("phone")} error={errors.phone} />
            </div>

            {/* Honeypot: hidden from people, off the tab order; the server drops anything that fills it. */}
            <div className="hidden" aria-hidden="true">
              <label>Company<input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} /></label>
            </div>

            <Button type="submit" className="h-11 [@media(max-height:640px)]:h-10 w-full rounded-none bg-cas-navy text-sm font-semibold tracking-wide text-white hover:bg-cas-navy-700" disabled={mutation.isPending}>
              {mutation.isPending ? t("enquiry.sending") : t("homePopup.submit")}
            </Button>

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              {t("homePopup.privacy")}{" "}
              <Link to="/site/privacy" onClick={() => setOpen(false)} className="font-medium text-cas-navy underline underline-offset-2">{t("homePopup.privacyLink")}</Link>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FieldShell({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-700">{label}</label>
      {children}
      {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

function TextField({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()

  return (
    <FieldShell id={id} label={label} error={error}>
      <input id={id} aria-invalid={Boolean(error)} className={cn(control, error ? "border-destructive" : "border-slate-300")} {...props} />
    </FieldShell>
  )
}

function SelectField({ label, placeholder, error, children, ...props }: { label: string; placeholder: string; error?: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()

  return (
    <FieldShell id={id} label={label} error={error}>
      <div className="relative">
        <select id={id} aria-invalid={Boolean(error)} className={cn(control, "appearance-none pr-9", error ? "border-destructive" : "border-slate-300", props.value === "" && "text-slate-400")} {...props}>
          <option value="">{placeholder}</option>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
      </div>
    </FieldShell>
  )
}
