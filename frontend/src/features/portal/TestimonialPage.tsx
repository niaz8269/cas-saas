import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { getMyTestimonial, submitTestimonial, uploadTestimonialPhoto } from "@/features/portal/api"
import { PageTitle, PortalCard } from "@/features/portal/components"
import { TestimonialForm } from "@/features/testimonials/TestimonialForm"
import { usePortalAuthStore, type PortalKind } from "@/stores/portalAuth"

/** A signed-in student or partner shares their experience; staff review it before anything is public. */
export default function TestimonialPage({ kind }: { kind: PortalKind }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const mine = useQuery({ queryKey: ["my-testimonial", kind], queryFn: () => getMyTestimonial(kind) })
  const profile = usePortalAuthStore((st) => st.profile)
  const existing = mine.data?.data

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
          <TestimonialForm
            kind={kind}
            mode="portal"
            defaultName={profile?.name ?? ""}
            upload={uploadTestimonialPhoto(kind)}
            submit={(payload) => submitTestimonial(kind, payload)}
            onSent={() => queryClient.invalidateQueries({ queryKey: ["my-testimonial", kind] })}
            rejectedNote={existing?.status === "rejected"}
          />
        </PortalCard>
      )}
    </div>
  )
}
