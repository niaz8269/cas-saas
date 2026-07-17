import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { logout } from "@/features/auth/api"
import { useAuthStore } from "@/stores/auth"

/**
 * Placeholder landing page — the full app shell (sidebar/topbar) is M1.5.
 */
export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAuth()
      navigate("/login", { replace: true })
    },
  })

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          CAS ERP
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-cas-navy">
          Welcome, {user?.name ?? "there"}
        </h1>

        {user && (
          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p>{user.email}</p>
            <p>
              Roles:{" "}
              <span className="font-medium text-foreground">
                {user.roles.join(", ") || "—"}
              </span>
            </p>
            {user.branch && <p>Branch: {user.branch.name}</p>}
            {user.department && <p>Department: {user.department.name}</p>}
          </div>
        )}

        <p className="mt-4 text-sm text-muted-foreground">
          You are signed in. The full dashboard shell arrives in the next step.
        </p>

        <Button
          variant="secondary"
          className="mt-6"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          {logoutMutation.isPending ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </main>
  )
}
