import { api } from "@/lib/api"
import type { Paginated } from "@/features/catalog/api"

export interface TaskItem {
  id: number
  title: string
  description: string | null
  status: "open" | "in_progress" | "done" | "cancelled" | "overdue"
  priority: "low" | "normal" | "high"
  due_at: string | null
  overdue: boolean
  assignee?: { id: number; name: string } | null
  student?: { id: number; name: string } | null
  related?: { type: string; id: number } | null
  created_at: string | null
}

export interface TaskPayload {
  title: string
  description?: string | null
  due_at?: string | null
  priority?: string
  assignee_id?: number | null
  student_id?: number | null
}

export function listTasks(params: { status?: string; overdue?: boolean; q?: string; page?: number } = {}) {
  const search = new URLSearchParams()
  if (params.status) search.set("filter[status]", params.status)
  if (params.overdue) search.set("filter[overdue]", "1")
  if (params.q) search.set("q", params.q)
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const qs = search.toString()

  return api<Paginated<TaskItem>>(`/tasks${qs ? `?${qs}` : ""}`)
}

export const listStudentTasks = (studentId: number | string) =>
  api<Paginated<TaskItem>>(`/students/${studentId}/tasks`)

export const createTask = (payload: TaskPayload) =>
  api<{ data: TaskItem }>("/tasks", { method: "POST", body: JSON.stringify(payload) })

export const updateTask = (id: number, payload: Partial<TaskPayload> & { status?: string }) =>
  api<{ data: TaskItem }>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
