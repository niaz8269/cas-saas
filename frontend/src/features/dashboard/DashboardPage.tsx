import { useAuthStore } from "@/stores/auth"

const KPIS = [
  { label: "New Leads", milestone: "M3" },
  { label: "Active Students", milestone: "M3" },
  { label: "Open Applications", milestone: "M4" },
  { label: "Commission Pipeline", milestone: "M5" },
]

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const firstName = user?.name.split(" ")[0] ?? "there"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Welcome back, {firstName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's what's happening across CAS today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border bg-card p-5 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 text-3xl font-semibold text-cas-navy">—</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Live data arrives with {kpi.milestone}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
