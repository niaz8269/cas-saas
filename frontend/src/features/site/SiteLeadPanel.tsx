import { useMutation } from "@tanstack/react-query"
import { CheckCircle2, Send } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { postEnquiry, SiteApiError, type EnquiryPayload } from "@/features/site/api"

/**
 * Compact hero lead-capture panel (the reference's docked "Leave a message"
 * card). Posts to the same /public/enquiries path as the full EnquiryForm, so
 * submissions land as source-tagged CRM leads; includes the honeypot field.
 */
export default function SiteLeadPanel() {
  const { t } = useTranslation()
  const [values, setValues] = useState({ first_name: "", email: "", message: "" })
  const [company, setCompany] = useState("") // honeypot
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }))

  const mutation = useMutation({
    mutationFn: () =>
      postEnquiry({
        first_name: values.first_name,
        email: values.email || undefined,
        message: values.message || undefined,
        source_url: typeof window !== "undefined" ? window.location.href : undefined,
        ...(company ? { company } : {}),
      } as EnquiryPayload & { company?: string }),
    onError: (err) => setErrors(err instanceof SiteApiError ? err.errors : {}),
  })

  return (
    <div className="w-full rounded-sm border border-white/15 bg-card p-5 text-left shadow-sm">
      {mutation.isSuccess ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-green-600" />
          <h2 className="mt-3 text-base font-semibold text-ink">{t("leadPanel.thankYou")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("leadPanel.thankYouBody")}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-sm bg-cas-navy text-white">
              <Send className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">{t("leadPanel.title")}</h2>
              <p className="text-xs text-muted-foreground">{t("leadPanel.subtitle")}</p>
            </div>
          </div>

          <form
            className="mt-4 space-y-2.5"
            onSubmit={(e) => { e.preventDefault(); setErrors({}); mutation.mutate() }}
            noValidate
          >
            {mutation.isError && Object.keys(errors).length === 0 && (
              <p role="alert" className="rounded-sm bg-cas-red-50 px-3 py-2 text-xs text-destructive">
                {t("leadPanel.errorGeneric")}
              </p>
            )}
            <div>
              <Input value={values.first_name} onChange={set("first_name")} placeholder={t("leadPanel.yourName")} autoComplete="given-name" aria-label={t("leadPanel.yourName")} />
              {errors.first_name?.[0] && <p role="alert" className="mt-1 text-xs text-destructive">{errors.first_name[0]}</p>}
            </div>
            <div>
              <Input type="email" value={values.email} onChange={set("email")} placeholder={t("leadPanel.email")} autoComplete="email" inputMode="email" aria-label={t("leadPanel.email")} />
              {errors.email?.[0] && <p role="alert" className="mt-1 text-xs text-destructive">{errors.email[0]}</p>}
            </div>
            <Textarea rows={3} value={values.message} onChange={set("message")} placeholder={t("leadPanel.messagePlaceholder")} aria-label={t("leadPanel.messageAria")} />

            {/* Honeypot — hidden, off tab order. */}
            <div className="hidden" aria-hidden="true">
              <label>Company<input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} /></label>
            </div>

            <Button type="submit" className="h-10 w-full" disabled={mutation.isPending}>
              <Send className="size-4" /> {mutation.isPending ? t("leadPanel.sending") : t("leadPanel.send")}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">{t("leadPanel.freeNoObligation")}</p>
          </form>
        </>
      )}
    </div>
  )
}
