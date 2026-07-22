import { type ReactNode } from "react"
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
}: {
  universitySlug: string | null
  className?: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const token = usePortalAuthStore((s) => s.token)
  const kind = usePortalAuthStore((s) => s.kind)

  const handleClick = () => {
    const target = universitySlug
      ? `/portal/student/apply?university=${encodeURIComponent(universitySlug)}`
      : "/portal/student/apply"

    if (token && kind === "student") {
      navigate(target)
    } else {
      navigate(`/portal/login?redirect=${encodeURIComponent(target)}`)
    }
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  )
}
