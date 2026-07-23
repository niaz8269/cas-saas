import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getPortalUnreadCount,
  listPortalNotifications,
  markAllPortalNotificationsRead,
  markPortalNotificationRead,
  type PortalNotification,
} from "@/features/portal/api"
import type { PortalKind } from "@/stores/portalAuth"
import { cn } from "@/lib/utils"

function timeAgo(iso: string | null): string {
  if (!iso) return ""
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h`

  return `${Math.round(hrs / 24)}d`
}

/** Mobile-first in-app notification bell for the student & agent portals. */
export default function PortalNotificationBell({ kind }: { kind: PortalKind }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const unread = useQuery({
    queryKey: ["portal-notifications", kind, "unread-count"],
    queryFn: () => getPortalUnreadCount(kind),
    refetchInterval: 30_000,
  })

  const list = useQuery({
    queryKey: ["portal-notifications", kind, "list"],
    queryFn: () => listPortalNotifications(kind),
    enabled: open,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["portal-notifications", kind] })
  }

  const readOne = useMutation({
    mutationFn: (id: number) => markPortalNotificationRead(kind, id),
    onSuccess: invalidate,
  })

  const readAll = useMutation({
    mutationFn: () => markAllPortalNotificationsRead(kind),
    onSuccess: invalidate,
  })

  const count = unread.data?.unread ?? 0
  const notifications = list.data?.data ?? []

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
          aria-label={count > 0 ? t("portal.notifications.ariaUnread", { count }) : t("portal.notifications.aria")}
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
          <p className="text-sm font-semibold">{t("portal.notifications.title")}</p>
          {count > 0 && (
            <button
              type="button"
              onClick={() => readAll.mutate()}
              disabled={readAll.isPending}
              className="text-xs font-medium text-cas-navy hover:underline"
            >
              {t("portal.notifications.markAll")}
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {list.isPending && open && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("portal.notifications.loading")}</p>
          )}

          {!list.isPending && notifications.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("portal.notifications.empty")}</p>
          )}

          <ul className="divide-y">
            {notifications.map((n: PortalNotification) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => n.read_at === null && readOne.mutate(n.id)}
                  className={cn(
                    "flex w-full gap-2 px-4 py-3 text-left transition-colors hover:bg-subtle",
                    n.read_at === null && "bg-cas-navy-50/50",
                  )}
                >
                  <span
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at === null ? "bg-cas-navy" : "bg-transparent")}
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
