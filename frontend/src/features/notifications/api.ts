import { api } from "@/lib/api"

export interface NotificationRow {
  id: number
  type: string
  title: string | null
  body: string | null
  entity_type: string | null
  entity_id: number | null
  channels: string[] | null
  read_at: string | null
  created_at: string | null
}

interface NotificationList {
  data: NotificationRow[]
  meta: { unread: number; current_page: number; last_page: number; total: number }
}

export const listNotifications = (params: { unread?: boolean } = {}) =>
  api<NotificationList>(`/notifications${params.unread ? "?unread=1" : ""}`)

export const getUnreadCount = () => api<{ unread: number }>("/notifications/unread-count")

export const markNotificationRead = (id: number) =>
  api<{ data: NotificationRow }>(`/notifications/${id}/read`, { method: "POST" })

export const markAllNotificationsRead = () =>
  api<{ unread: number }>("/notifications/read-all", { method: "POST" })
