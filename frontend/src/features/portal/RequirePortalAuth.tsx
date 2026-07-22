import { Navigate, Outlet, useLocation } from "react-router-dom"

import { usePortalAuthStore } from "@/stores/portalAuth"

/**
 * Guards the portal routes. Requires a portal token whose kind matches the
 * area being entered — an agent token cannot open the student area or vice
 * versa (the server re-checks via the guard regardless).
 */
export default function RequirePortalAuth() {
  const token = usePortalAuthStore((s) => s.token)
  const kind = usePortalAuthStore((s) => s.kind)
  const { pathname, search } = useLocation()

  if (!token || !kind) {
    // Preserve the intended destination so login can return the user to it.
    return <Navigate to={`/portal/login?redirect=${encodeURIComponent(pathname + search)}`} replace />
  }

  const area = pathname.startsWith("/portal/agent") ? "agent" : "student"
  if (area !== kind) {
    return <Navigate to={`/portal/${kind}`} replace />
  }

  return <Outlet />
}
