import { useQuery } from "@tanstack/react-query"
import {
  Banknote,
  FileText,
  GraduationCap,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Link } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { getExecutiveDashboard } from "@/features/dashboard/api"
import { listTasks } from "@/features/tasks/api"
import { useAuthStore } from "@/stores/auth"
import { cn } from "@/lib/utils"

const NAVY = "#14357C"
const GREEN = "#15803D"
const MUTED = "#94A3B8"

const LEAD_ORDER = ["new", "contacted", "qualified", "converted", "lost", "duplicate"]
const COMMISSION_ORDER = ["expected", "pending_arrival", "eligible", "invoiced", "received"]
const VISA_ORDER = [
  "not_started",
  "documents_collection",
  "appointment_booked",
  "submitted",
  "approved",
  "rejected",
  "travel_ready",
]

const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
const money = (v: number, currency = "CNY") => `${Number(v).toLocaleString()} ${currency}`

function toSeries(byStatus: Record<string, number>, order: string[]) {
  const keys = [...order, ...Object.keys(byStatus).filter((k) => !order.includes(k))]

  return keys
    .filter((k) => byStatus[k] !== undefined)
    .map((k) => ({ name: label(k), value: byStatus[k] }))
}

function KpiCard({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-cas-navy" aria-hidden="true" />
      </div>
      <p className="mt-2 text-3xl font-semibold text-cas-navy tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function taskDue(iso: string): string {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (days === 0) return "today"
  if (days < 0) return `${-days}d late`

  return `in ${days}d`
}

/** The current user's own pending follow-ups, surfaced on the home page. */
function MyTasksCard() {
  const { data } = useQuery({
    queryKey: ["tasks", { status: "active", page: 1 }],
    queryFn: () => listTasks({ status: "active" }),
  })

  const tasks = Array.isArray(data?.data) ? data.data : []
  const overdue = tasks.filter((t) => t.overdue).length

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">My tasks</h3>
        <Link to="/tasks" className="text-sm text-cas-navy hover:underline">View all</Link>
      </div>
      {overdue > 0 && <p className="mt-1 text-xs font-medium text-cas-red">{overdue} overdue</p>}
      <ul className="mt-3 space-y-2">
        {tasks.length === 0 && <li className="text-sm text-muted-foreground">Nothing pending — you're all caught up 🎉</li>}
        {tasks.slice(0, 5).map((task) => (
          <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{task.title}</span>
            {task.due_at && (
              <span className={cn("shrink-0 text-xs tabular-nums", task.overdue ? "text-cas-red" : "text-muted-foreground")}>
                {taskDue(task.due_at)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <div className="mt-4 h-64">{children}</div>
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const firstName = user?.name.split(" ")[0] ?? "there"

  const { data, isPending, isError } = useQuery({
    queryKey: ["dashboard", "executive"],
    queryFn: getExecutiveDashboard,
  })

  const d = data?.data

  const leadSeries = d ? toSeries(d.leads.by_status, LEAD_ORDER) : []
  const commissionSeries = d
    ? COMMISSION_ORDER
        .filter((k) => d.commissions.pipeline[k])
        .map((k) => ({
          name: label(k),
          Expected: d.commissions.pipeline[k].expected,
          Received: d.commissions.pipeline[k].received,
        }))
    : []
  const collectedPct = d && d.finance.billed > 0
    ? Math.round((d.finance.collected / d.finance.billed) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Welcome back, {firstName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Here's what's happening across CAS today.</p>
      </div>

      {isError && (
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-destructive">Couldn't load the dashboard.</p>
        </div>
      )}

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      )}

      {d && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard icon={Users} label="Leads" value={String(d.leads.total)} sub={`${d.leads.converted} converted`} />
            <KpiCard icon={TrendingUp} label="Conversion" value={`${d.leads.conversion_rate}%`} sub="lead → student" />
            <KpiCard icon={GraduationCap} label="Students" value={String(d.students.total)} />
            <KpiCard icon={FileText} label="Open applications" value={String(d.applications.open)} sub={`${d.applications.total} total`} />
            <KpiCard icon={Banknote} label="Commission received" value={money(d.commissions.received_total, d.commissions.currency)} sub={`${money(d.commissions.expected_total, d.commissions.currency)} expected`} />
          </div>

          <MyTasksCard />

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Lead funnel">
              {leadSeries.length === 0 ? (
                <p className="pt-16 text-center text-sm text-muted-foreground">No leads yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadSeries} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: MUTED }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: MUTED }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "#EAF0FB" }} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
                    <Bar dataKey="value" name="Leads" radius={[4, 4, 0, 0]}>
                      {leadSeries.map((entry) => (
                        <Cell key={entry.name} fill={entry.name === "Converted" ? GREEN : NAVY} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Commission pipeline">
              {commissionSeries.length === 0 ? (
                <p className="pt-16 text-center text-sm text-muted-foreground">No commissions yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commissionSeries} margin={{ top: 4, right: 8, bottom: 4, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                    <YAxis tick={{ fontSize: 12, fill: MUTED }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "#EAF0FB" }} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Expected" fill={MUTED} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Received" fill={GREEN} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Receivables */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Tuition receivables</h3>
              <span className="text-sm text-muted-foreground">{collectedPct}% collected</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-subtle">
              <div className="h-full rounded-full bg-cas-navy" style={{ width: `${collectedPct}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs tracking-wider text-muted-foreground uppercase">Billed</p>
                <p className="mt-0.5 font-semibold tabular-nums">{money(d.finance.billed, d.finance.currency)}</p>
              </div>
              <div>
                <p className="text-xs tracking-wider text-muted-foreground uppercase">Collected</p>
                <p className="mt-0.5 font-semibold tabular-nums text-green-700">{money(d.finance.collected, d.finance.currency)}</p>
              </div>
              <div>
                <p className="text-xs tracking-wider text-muted-foreground uppercase">Outstanding</p>
                <p className="mt-0.5 font-semibold tabular-nums text-amber-700">{money(d.finance.receivables, d.finance.currency)}</p>
              </div>
            </div>
          </div>

          {/* Visa cases */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">Visa cases</h3>
              <span className="text-sm text-muted-foreground">{d.visa.total} total</span>
            </div>
            {d.visa.total === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No visa cases yet.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {VISA_ORDER.filter((k) => d.visa.by_status[k]).map((k) => (
                  <div key={k} className="rounded-lg bg-subtle px-3 py-2">
                    <p className="text-xs text-muted-foreground">{label(k)}</p>
                    <p className="text-lg font-semibold text-cas-navy tabular-nums">{d.visa.by_status[k]}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
