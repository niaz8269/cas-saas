import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/features/notifications/api"
import { cn } from "@/lib/utils"

/** Map a notification's entity reference to an in-app route, when navigable. */
const ENTITY_ROUTES: Record<string, (id: number) => string> = {
  application: (id) => `/applications/${id}`,
  student: (id) => `/students/${id}`,
  lead: (id) => `/leads/${id}`,
  visa: (id) => `/visa/${id}`,
  university: (id) => `/universities/${id}`,
}

function linkFor(n: NotificationRow): string | null {
  if (!n.entity_type || n.entity_id === null) return null

  return ENTITY_ROUTES[n.entity_type]?.(n.entity_id) ?? null
}

function timeAgo(iso: string | null): string {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`

  return `${Math.round(hrs / 24)}d ago`
}

export default function NotificationsBell() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // Poll the unread count in the background; refresh the list on open.
  const unread = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
  })

  const list = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => listNotifications(),
    enabled: open,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] })
    queryClient.invalidateQueries({ queryKey: ["notifications", "list"] })
  }

  const readOne = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: invalidate,
  })

  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  })

  const count = unread.data?.unread ?? 0
  const notifications = list.data?.data ?? []

  const openNotification = (n: NotificationRow) => {
    if (n.read_at === null) readOne.mutate(n.id)

    const link = linkFor(n)
    if (link) {
      setOpen(false)
      navigate(link)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground outline-offset-2 hover:bg-muted hover:text-foreground"
          aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        >
          <Bell className="size-5" aria-hidden="true" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-cas-red px-1 text-[10px] font-semibold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {count > 0 && (
            <button
              type="button"
              onClick={() => readAll.mutate()}
              disabled={readAll.isPending}
              className="text-xs font-medium text-cas-navy hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {list.isPending && open && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</p>
          )}

          {!list.isPending && notifications.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>
          )}

          <ul className="divide-y">
            {notifications.map((n: NotificationRow) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  className={cn(
                    "flex w-full gap-2 px-4 py-3 text-left transition-colors hover:bg-muted",
                    n.read_at === null && "bg-cas-navy-50/50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      n.read_at === null ? "bg-cas-navy" : "bg-transparent",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{n.title}</span>
                    {n.body && <span className="block text-xs text-muted-foreground">{n.body}</span>}
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
