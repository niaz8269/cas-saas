import { type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { usePortalAuthStore } from "@/stores/portalAuth"

/**
 * Public "Apply" control. Applications go through CAS's own student wizard, so
 * a visitor must be signed in as a student first: logged-in students go
 * straight to the university-scoped application form; everyone else is sent to
 * the portal login with a `redirect` back to that same form.
 */
export default function ApplyButton({
  universitySlug,
  className,
  children,
  label,
}: {
  universitySlug: string | null
  className?: string
  children: ReactNode
  /** Spoken name when several Apply buttons share a page, e.g. "Apply for MBBS at Jilin University". */
  label?: string
}) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const hint = t("newTab", { defaultValue: "(opens in a new tab)" })
  const token = usePortalAuthStore((s) => s.token)
  const kind = usePortalAuthStore((s) => s.kind)

  const handleClick = () => {
    const target = universitySlug
      ? `/portal/student/apply?university=${encodeURIComponent(universitySlug)}`
      : "/portal/student/apply"

    // The portal opens in its own tab so the visitor keeps their place on the website.
    const url = token && kind === "student" ? target : `/portal/login?redirect=${encodeURIComponent(target)}`
    if (!window.open(url, "_blank", "noopener,noreferrer")) navigate(url)
  }

  return (
    <button type="button" onClick={handleClick} className={className} aria-label={label}>
      {children}
      <span className="sr-only"> {hint}</span>
    </button>
  )
}
