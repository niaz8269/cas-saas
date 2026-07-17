import { useQuery } from "@tanstack/react-query"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getPerformanceReport } from "@/features/dashboard/api"

const NAVY = "#14357C"
const MUTED = "#94A3B8"

const money = (v: number) => `${Number(v).toLocaleString()} CNY`

export default function ReportsPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["reports", "performance"],
    queryFn: getPerformanceReport,
  })

  const d = data?.data

  if (isError) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-destructive">Couldn't load reports.</p>
      </div>
    )
  }

  if (isPending || !d) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  const uniChart = d.universities.slice(0, 8).map((u) => ({ name: u.code, Applications: u.applications, Accepted: u.accepted }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Performance reports</h2>
        <p className="mt-1 text-sm text-muted-foreground">University, agent and lead-source contribution.</p>
      </div>

      {/* Universities */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-[15px] font-semibold">University performance</h3>
        {uniChart.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No application data yet.</p>
        ) : (
          <>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={uniChart} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: MUTED }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: MUTED }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "#EAF0FB" }} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
                  <Bar dataKey="Applications" fill={MUTED} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Accepted" fill={NAVY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader className="bg-subtle">
                  <TableRow>
                    <TableHead>University</TableHead>
                    <TableHead className="text-right">Applications</TableHead>
                    <TableHead className="text-right">Accepted</TableHead>
                    <TableHead className="text-right">Commission received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.universities.map((u) => (
                    <TableRow key={u.code}>
                      <TableCell><span className="font-medium">{u.name}</span> <span className="font-mono text-xs text-muted-foreground">{u.code}</span></TableCell>
                      <TableCell className="text-right tabular-nums">{u.applications}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.accepted}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(u.commission_received)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agents */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-[15px] font-semibold">Agent performance</h3>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader className="bg-subtle">
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.agents.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">No agents yet.</TableCell></TableRow>
                )}
                {d.agents.map((a) => (
                  <TableRow key={a.agent_code}>
                    <TableCell>
                      <span className="font-medium">{a.name}</span>
                      <span className="ml-1 font-mono text-xs text-muted-foreground">{a.agent_code}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{a.students}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(a.commission_earned)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Lead sources */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-[15px] font-semibold">Lead sources</h3>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader className="bg-subtle">
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Converted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.lead_sources.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">No leads yet.</TableCell></TableRow>
                )}
                {d.lead_sources.map((s) => (
                  <TableRow key={s.source}>
                    <TableCell className="font-medium">{s.source}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.leads}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.converted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
