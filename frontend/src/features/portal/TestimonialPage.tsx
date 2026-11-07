import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getMyTestimonial, submitTestimonial } from "@/features/portal/api"
import { PageTitle, PortalCard } from "@/features/portal/components"
import { ApiError } from "@/lib/api"
import type { PortalKind } from "@/stores/portalAuth"

/** A student or partner shares their experience; staff review it before anything is public. */
export default function TestimonialPage({ kind }: { kind: PortalKind }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const mine = useQuery({ queryKey: ["my-testimonial", kind], queryFn: () => getMyTestimonial(kind) })

  const [quote, setQuote] = useState("")
  const [headline, setHeadline] = useState("")
  const [country, setCountry] = useState("")
  const [consent, setConsent] = useState(false)

  const send = useMutation({
    mutationFn: () => submitTestimonial(kind, { quote: quote.trim(), headline: headline.trim() || undefined, country: country.trim() || undefined, consent_public: consent }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-testimonial", kind] }),
  })

  const existing = mine.data?.data
  const error = send.error instanceof ApiError ? send.error : null
  const consentError = error?.errors?.consent_public?.[0]
  const quoteError = error?.errors?.quote?.[0]

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
          <form
            onSubmit={(e) => { e.preventDefault(); send.mutate() }}
            className="space-y-4"
            noValidate
          >
            {existing?.status === "rejected" && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                {t("testimonialPage.rejected", { defaultValue: "We could not use your earlier text. You are welcome to write a new one." })}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="tm-quote">{t("testimonialPage.quote", { defaultValue: "Your experience" })}</Label>
              <Textarea id="tm-quote" rows={5} maxLength={1200} value={quote} onChange={(e) => setQuote(e.target.value)}
                placeholder={t("testimonialPage.quotePlaceholder", { defaultValue: "What was it like working with CAS? What would you tell someone about to start?" })}
                aria-invalid={quoteError ? true : undefined} />
              {quoteError && <p role="alert" className="text-sm text-destructive">{quoteError}</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tm-headline">{t("testimonialPage.headline", { defaultValue: "Study or business (optional)" })}</Label>
                <Input id="tm-headline" value={headline} maxLength={160} onChange={(e) => setHeadline(e.target.value)}
                  placeholder={kind === "student" ? "MBBS student, Jilin University" : "Partner agency, Lahore"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tm-country">{t("testimonialPage.country", { defaultValue: "Country (optional)" })}</Label>
                <Input id="tm-country" value={country} maxLength={80} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={consentError ? true : undefined}
                  className="mt-0.5 size-4 shrink-0 rounded border-input accent-[#14357C]" />
                <span>{t("testimonialPage.consent", { defaultValue: "I agree that CAS may show my words and my first name (or company name) on its website. I can ask to have it removed at any time." })}</span>
              </label>
              {consentError && <p role="alert" className="mt-1 text-xs text-destructive">{consentError}</p>}
            </div>
            {error && !consentError && !quoteError && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
            <Button type="submit" className="h-11 w-full sm:w-auto" disabled={send.isPending}>
              {send.isPending ? t("testimonialPage.sending", { defaultValue: "Sending…" }) : t("testimonialPage.send", { defaultValue: "Send" })}
            </Button>
          </form>
        </PortalCard>
      )}
    </div>
  )
}
