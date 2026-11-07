import { CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useSearchParams } from "react-router-dom"

import { SitePageHeader } from "@/features/site/components"
import { TestimonialForm } from "@/features/testimonials/TestimonialForm"
import { submitPublicTestimonial, uploadPublicTestimonialPhoto } from "@/features/testimonials/publicApi"
import { useSeo } from "@/lib/seo"
import { cn } from "@/lib/utils"

/**
 * The page behind the "Share your experience" button. Open to everyone, no account: CAS shares the link
 * with its students and partners. Whatever they send waits for staff approval before it is shown.
 * `?as=agent` opens it on the partner form.
 */
export default function SiteShareExperience() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [kind, setKind] = useState<"student" | "agent">(params.get("as") === "agent" ? "agent" : "student")
  const [sent, setSent] = useState(false)

  useSeo({
    title: t("shareExperience.seoTitle", { defaultValue: "Share your experience with CAS" }),
    description: t("shareExperience.seoDescription", { defaultValue: "Students and partners: tell others what it was like to work with CAS." }),
    canonicalPath: "/site/share-your-experience",
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SitePageHeader
        title={t("shareExperience.title", { defaultValue: "Share your experience" })}
        subtitle={t("shareExperience.subtitle", { defaultValue: "Studying in China, or working with us as a partner? Your words help the next person decide." })}
      />

      {sent ? (
        <div className="rounded-sm border bg-card p-8 text-center shadow-sm" role="status">
          <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-semibold text-cas-navy">{t("shareExperience.thanksTitle", { defaultValue: "Thank you!" })}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("shareExperience.thanksBody", { defaultValue: "We received your words. Our team reads every one, and we will show it on our website once it is approved." })}
          </p>
          <Link to="/site" className="mt-5 inline-flex h-11 items-center rounded-sm bg-cas-navy px-6 text-sm font-semibold text-white hover:bg-cas-navy-700">
            {t("shareExperience.backHome", { defaultValue: "Back to the website" })}
          </Link>
        </div>
      ) : (
        <div className="rounded-sm border bg-card p-6 shadow-sm sm:p-8">
          <div role="tablist" aria-label={t("shareExperience.iAm", { defaultValue: "I am" })} className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-subtle p-1">
            {(["student", "agent"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                type="button"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={cn("rounded-md py-2 text-sm font-medium transition-colors", kind === k ? "bg-card text-cas-navy shadow-sm" : "text-muted-foreground")}
              >
                {k === "student" ? t("shareExperience.student", { defaultValue: "A student" }) : t("shareExperience.partner", { defaultValue: "A partner agency" })}
              </button>
            ))}
          </div>

          {/* Remount when the tab changes so each form starts clean. */}
          <TestimonialForm
            key={kind}
            kind={kind}
            mode="public"
            upload={uploadPublicTestimonialPhoto}
            submit={submitPublicTestimonial}
            onSent={() => setSent(true)}
          />
        </div>
      )}
    </div>
  )
}
