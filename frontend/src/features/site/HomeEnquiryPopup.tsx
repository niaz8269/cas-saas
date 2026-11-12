import { useMutation } from "@tanstack/react-query"
import { CheckCircle2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { postEnquiry, SiteApiError, type EnquiryPayload } from "@/features/site/api"
import { COUNTRIES, COUNTRY_BY_ISO2 } from "@/features/site/countryList"
import { homePopupState } from "@/features/site/homePopupState"

/** Search engine crawlers and automated browsers never see the pop-up, so it cannot cover the page they index. */
function isAutomated(): boolean {
  if (typeof navigator === "undefined") return true

  return Boolean((navigator as Navigator & { webdriver?: boolean }).webdriver) || /bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent)
}

const DEGREES = ["bachelor", "master", "phd", "non_degree"] as const
const PROGRAMS = ["mbbs", "dentistry", "tcm", "engineering", "computer", "business", "language", "other"] as const

const selectClass = "h-8 w-full rounded-none border border-input bg-background px-2 text-base sm:text-sm focus-visible:ring-2 focus-visible:ring-cas-navy focus-visible:outline-none"

/**
 * Quick-enquiry pop-up for the home page. Posts to the same public enquiry endpoint as every other website
 * form, so the visitor becomes a source-attributed lead in the CRM. Dismissible with the close button, Esc or a
 * click outside.
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
      <DialogContent className="max-h-[90dvh] gap-2 overflow-y-auto rounded-none p-4 sm:max-w-[19.5rem]" aria-describedby="home-popup-desc">
        {mutation.isSuccess ? (
          <div className="py-3 text-center">
            <CheckCircle2 className="mx-auto size-8 text-green-600" />
            <DialogTitle className="mt-2 text-base text-cas-navy">{t("enquiry.thankYou")}</DialogTitle>
            <DialogDescription id="home-popup-desc" className="mt-1 text-xs">{t("enquiry.thankYouBody")}</DialogDescription>
            <Button className="mt-3 h-8 rounded-none" onClick={() => setOpen(false)}>{t("homePopup.close")}</Button>
          </div>
        ) : (
          <>
            <DialogHeader className="gap-0.5">
              <DialogTitle className="px-5 text-center text-sm leading-tight font-semibold text-cas-navy">{t("homePopup.title")}</DialogTitle>
              <DialogDescription id="home-popup-desc" className="text-center text-[11px] leading-tight">{t("homePopup.subtitle")}</DialogDescription>
            </DialogHeader>

            <form className="space-y-1.5" onSubmit={submit} noValidate>
              {mutation.isError && Object.keys(errors).length === 0 && (
                <p role="alert" className="rounded-none bg-cas-red-50 px-2 py-1 text-xs text-destructive">{t("enquiry.errorGeneric")}</p>
              )}

              <div className="grid grid-cols-2 gap-1.5">
                <Field error={errors.degree}>
                  <select aria-label={t("homePopup.degree")} className={selectClass} value={values.degree} onChange={set("degree")}>
                    <option value="">{t("homePopup.degree")}</option>
                    {DEGREES.map((d) => <option key={d} value={d}>{t(`homePopup.degrees.${d}`)}</option>)}
                  </select>
                </Field>
                <Field error={errors.program}>
                  <select aria-label={t("homePopup.program")} className={selectClass} value={values.program} onChange={set("program")}>
                    <option value="">{t("homePopup.program")}</option>
                    {PROGRAMS.map((p) => <option key={p} value={p}>{t(`homePopup.programs.${p}`)}</option>)}
                  </select>
                </Field>
              </div>
              <Field error={errors.first_name}>
                <Input aria-label={t("homePopup.name")} placeholder={t("homePopup.name")} value={values.name} onChange={set("name")} autoComplete="name" className="h-8 rounded-none px-2 text-base sm:text-sm" />
              </Field>
              <Field error={errors.country}>
                <select aria-label={t("homePopup.nationality")} className={selectClass} value={values.country} onChange={set("country")}>
                  <option value="">{t("homePopup.nationality")}</option>
                  {COUNTRIES.map((c) => <option key={c.iso2} value={c.iso2}>{c.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-1.5">
                <Field error={errors.email}>
                  <Input aria-label={t("homePopup.email")} type="email" placeholder={t("homePopup.email")} value={values.email} onChange={set("email")} autoComplete="email" inputMode="email" className="h-8 rounded-none px-2 text-base sm:text-sm" />
                </Field>
                <Field error={errors.phone}>
                  <Input aria-label={t("homePopup.whatsapp")} placeholder={t("homePopup.whatsapp")} value={values.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" className="h-8 rounded-none px-2 text-base sm:text-sm" />
                </Field>
              </div>

              {/* Honeypot: hidden from people, off the tab order; the server drops anything that fills it. */}
              <div className="hidden" aria-hidden="true">
                <label>Company<input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} /></label>
              </div>

              <Button type="submit" className="h-8 w-full rounded-none bg-cas-navy text-sm text-white hover:bg-cas-navy-700" disabled={mutation.isPending}>
                {mutation.isPending ? t("enquiry.sending") : t("homePopup.submit")}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({ error, children }: { error?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      {children}
      {error && <p role="alert" className="mt-0.5 text-xs text-destructive">{error}</p>}
    </div>
  )
}

