import { api } from "@/lib/api"

export interface ExecutiveDashboard {
  leads: {
    total: number
    by_status: Record<string, number>
    converted: number
    conversion_rate: number
  }
  students: { total: number; by_status: Record<string, number> }
  applications: { total: number; open: number; by_status: Record<string, number> }
  commissions: {
    pipeline: Record<string, { count: number; expected: number; received: number }>
    expected_total: number
    received_total: number
    currency: string
  }
  finance: { billed: number; collected: number; receivables: number; currency: string }
  visa: { total: number; by_status: Record<string, number> }
}

export const getExecutiveDashboard = () => api<{ data: ExecutiveDashboard }>("/dashboards/executive")

export interface PerformanceReport {
  universities: { name: string; code: string; applications: number; accepted: number; commission_received: number }[]
  agents: { agent_code: string; name: string; type: string; students: number; commission_earned: number }[]
  lead_sources: { source: string; leads: number; converted: number }[]
}

export const getPerformanceReport = () => api<{ data: PerformanceReport }>("/reports/performance")
