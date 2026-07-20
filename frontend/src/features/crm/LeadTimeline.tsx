import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bot, Mail, Phone, RefreshCw, StickyNote, type LucideIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { addLeadNote, getLeadTimeline } from "@/features/crm/api"
import { ApiError } from "@/lib/api"

const ACTIVITY_ICON: Record<string, LucideIcon> = {
  note: StickyNote,
  call: Phone,
  email: Mail,
  status: RefreshCw,
  system: Bot,
}

function when(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

/** Activity feed + note composer for a lead, mirroring the student timeline. */
export default function LeadTimeline({ leadId, canUpdate }: { leadId: string; canUpdate: boolean }) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["lead-timeline", leadId],
    queryFn: () => getLeadTimeline(leadId),
  })

  const addNote = useMutation({
    mutationFn: () => addLeadNote(leadId, note.trim()),
    onSuccess: () => {
      setNote("")
      queryClient.invalidateQueries({ queryKey: ["lead-timeline", leadId] })
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not add the note."),
  })

  const activities = Array.isArray(data?.data) ? data.data : []

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-[15px] font-semibold">Timeline</h3>

      {canUpdate && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (note.trim()) { setError(null); addNote.mutate() } }}
          className="mt-3"
        >
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Log a note or call outcome…"
            rows={2}
            aria-label="New note"
          />
          {error && <p role="alert" className="mt-1 text-sm text-destructive">{error}</p>}
          <div className="mt-2 flex justify-end">
            <Button type="submit" size="sm" disabled={!note.trim() || addNote.isPending}>
              {addNote.isPending ? "Adding…" : "Add note"}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4 border-t pt-4">
        {isPending && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}

        {isError && (
          <div className="py-6 text-center">
            <p className="text-sm text-destructive">Couldn't load the timeline.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
          </div>
        )}

        {!isPending && !isError && activities.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">No activity yet — add the first note above.</p>
        )}

        <ol className="space-y-4">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICON[activity.type] ?? StickyNote

            return (
              <li key={activity.id} className="flex gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-cas-navy-50 text-cas-navy">
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{activity.body || <span className="capitalize text-muted-foreground">{activity.type}</span>}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {activity.user?.name ?? "System"} · {when(activity.created_at)}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
