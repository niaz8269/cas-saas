import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

import { logout } from "@/features/auth/api"
import { useAuthStore } from "@/stores/auth"

/**
 * Revokes the token server-side, then always clears local auth and
 * returns to /login (even if the API call fails — the token may already
 * be invalid).
 */
export function useLogout() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((state) => state.clearAuth)

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAuth()
      navigate("/login", { replace: true })
    },
  })
}
