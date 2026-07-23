import { useMutation } from "@tanstack/react-query"
import { MailWarning } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { getStudentProfile, resendStudentVerification } from "@/features/portal/api"
import { usePortalAuthStore } from "@/stores/portalAuth"

/** Nudges an unverified student to confirm their email (resend / recheck). */
export default function StudentVerifyBanner() {
  const { t } = useTranslation()
  const kind = usePortalAuthStore((s) => s.kind)
  const profile = usePortalAuthStore((s) => s.profile)
  const setProfile = usePortalAuthStore((s) => s.setProfile)
  const [sent, setSent] = useState(false)

  const resend = useMutation({
    mutationFn: resendStudentVerification,
    onSuccess: () => setSent(true),
  })

  const refresh = useMutation({
    mutationFn: getStudentProfile,
    onSuccess: (res) => {
      if (profile) setProfile({ ...profile, email_verified: res.data.email_verified })
    },
  })

  if (kind !== "student" || !profile || profile.email_verified !== false) return null

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-1">
        <MailWarning className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0">{sent ? t("portal.verifyEmail.resent") : t("portal.verifyEmail.body")}</span>
        <span className="ms-auto flex gap-3">
          <button
            type="button"
            onClick={() => resend.mutate()}
            disabled={resend.isPending}
            className="font-medium underline underline-offset-2 disabled:opacity-60"
          >
            {t("portal.verifyEmail.resend")}
          </button>
          <button
            type="button"
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="font-medium underline underline-offset-2 disabled:opacity-60"
          >
            {t("portal.verifyEmail.refresh")}
          </button>
        </span>
      </div>
    </div>
  )
}
