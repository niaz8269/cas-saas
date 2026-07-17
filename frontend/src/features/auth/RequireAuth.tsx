import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAuthStore } from "@/stores/auth"

export default function RequireAuth() {
  const token = useAuthStore((state) => state.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
