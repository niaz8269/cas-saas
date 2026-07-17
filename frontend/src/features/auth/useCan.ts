import { useAuthStore } from "@/stores/auth"

/**
 * Client-side mirror of the server's permission gate (UI affordances only —
 * the API always re-checks). Super Admin passes everything, matching
 * Gate::before.
 */
export function useCan() {
  const user = useAuthStore((state) => state.user)

  return (permission: string): boolean => {
    if (!user) return false
    if (user.roles.includes("Super Admin")) return true

    return user.permissions.includes(permission)
  }
}
