import { useQuery } from "@tanstack/react-query"
import { Bell, Mail, MessageCircle, MessageSquare, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { COMM_CHANNELS, listCommunications } from "@/features/crm/comms"
import { cn } from "@/lib/utils"

const CHANNEL_ICON: Record<string, LucideIcon> = {
  email: Mail,
  whatsapp: MessageCircle,
  sms: MessageSquare,
  in_app: Bell,
}

const STATUS_BADGE: Record<string, string> = {
  queued: "bg-amber-50 text-amber-700",
  sent: "bg-green-100 text-green-800",
  delivered: "bg-green-100 text-green-800",
  failed: "bg-cas-red-50 text-cas-red",
}

const channelLabel = (value: string) =>
  COMM_CHANNELS.find((c) => c.value === value)?.label ?? value

function when(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

/** Delivery history for a student's outbound messages, with per-provider logs. */
export default function CommunicationsPanel({ studentId }: { studentId: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["student-communications", studentId],
    queryFn: () => listCommunications(studentId),
  })

  const messages = Array.isArray(data?.data) ? data.data : []

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <header className="border-b px-5 py-3">
        <h3 className="text-[15px] font-semibold">Communications</h3>
      </header>

      <div className="px-5 py-4">
        {isPending && <Skeleton className="h-24 w-full" />}

        {isError && (
          <div className="py-6 text-center">
            <p className="text-sm text-destructive">Couldn't load communications.</p>
            <button type="button" onClick={() => refetch()} className="mt-2 text-sm text-cas-navy hover:underline">
              Try again
            </button>
          </div>
        )}

        {!isPending && !isError && messages.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">No messages sent yet.</p>
        )}

        <ol className="divide-y">
          {messages.map((m) => {
            const Icon = CHANNEL_ICON[m.channel] ?? Mail

            return (
              <li key={m.id} className="flex gap-3 py-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-cas-navy-50 text-cas-navy">
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{channelLabel(m.channel)}</span>
                    {m.template && m.template !== "custom" && (
                      <span className="text-xs text-muted-foreground capitalize">{m.template.replace(/_/g, " ")}</span>
                    )}
                    <Badge variant="outline" className={cn("border-transparent capitalize", STATUS_BADGE[m.status] ?? "bg-muted text-muted-foreground")}>
                      {m.status}
                    </Badge>
                  </div>
                  {m.body && <p className="mt-1 line-clamp-2 text-sm text-ink">{m.body}</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[m.sent_by, when(m.created_at)].filter(Boolean).join(" · ")}
                  </p>
                  {(m.logs?.length ?? 0) > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {m.logs!.map((log, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          <span className="font-medium">{log.provider ?? "provider"}</span>: {log.status}
                          {log.error && <span className="text-destructive"> — {log.error}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
