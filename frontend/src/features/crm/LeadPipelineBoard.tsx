import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useCan } from "@/features/auth/useCan"
import { convertLead, listLeads, updateLead, type LeadListItem } from "@/features/crm/api"
import LeadRowActions from "@/features/crm/LeadRowActions"
import { LEAD_STATUS_BADGE } from "@/features/crm/status"
import type { Paginated } from "@/features/catalog/api"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

/**
 * Pipeline stages shown as columns. Dragging between new/assigned/contacted/
 * qualified sets the lead's status; dragging onto "Converted" runs the convert
 * action (creates a student) after a confirm. Converted cards are terminal and
 * cannot be dragged out.
 */
const PIPELINE = [
  { status: "new", label: "New" },
  { status: "assigned", label: "Assigned" },
  { status: "contacted", label: "Contacted" },
  { status: "qualified", label: "Qualified" },
  { status: "converted", label: "Converted" },
] as const

const BOARD_LIMIT = 50

type Dragging = { id: number; from: string } | null
type LeadPage = Paginated<LeadListItem>

export default function LeadPipelineBoard({ q, formType }: { q?: string; formType?: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const can = useCan()
  const canUpdate = can("leads.update.global") || can("leads.update.assigned")
  const canConvert = can("leads.convert.assigned")

  const [dragging, setDragging] = useState<Dragging>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [convertTarget, setConvertTarget] = useState<{ id: number; from: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const boardKey = (status: string) => ["leads", "board", status, q ?? "", formType ?? ""]

  const results = useQueries({
    queries: PIPELINE.map(({ status }) => ({
      queryKey: boardKey(status),
      queryFn: () => listLeads({ status, q, form_type: formType, per_page: BOARD_LIMIT }),
    })),
  })

  const move = useMutation({
    mutationFn: async ({ id, to }: { id: number; from: string; to: string }) => {
      // Return nothing — a converted lead and an updated lead have different
      // shapes; the board only cares that the move succeeded (onSettled refetches).
      if (to === "converted") await convertLead(id)
      else await updateLead(id, { status: to })
    },
    // Optimistically move the card between the two affected columns.
    onMutate: async ({ id, from, to }) => {
      await queryClient.cancelQueries({ queryKey: ["leads", "board"] })
      const fromKey = boardKey(from)
      const toKey = boardKey(to)
      const prevFrom = queryClient.getQueryData<LeadPage>(fromKey)
      const prevTo = queryClient.getQueryData<LeadPage>(toKey)
      const card = prevFrom?.data.find((l) => l.id === id)

      if (prevFrom) {
        queryClient.setQueryData<LeadPage>(fromKey, {
          ...prevFrom,
          data: prevFrom.data.filter((l) => l.id !== id),
          meta: { ...prevFrom.meta, total: Math.max(0, prevFrom.meta.total - 1) },
        })
      }
      if (prevTo && card) {
        queryClient.setQueryData<LeadPage>(toKey, {
          ...prevTo,
          data: [{ ...card, status: to }, ...prevTo.data],
          meta: { ...prevTo.meta, total: prevTo.meta.total + 1 },
        })
      }

      return { fromKey, toKey, prevFrom, prevTo }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prevFrom) queryClient.setQueryData(ctx.fromKey, ctx.prevFrom)
      if (ctx?.prevTo) queryClient.setQueryData(ctx.toKey, ctx.prevTo)
      setError(err instanceof ApiError ? err.message : "Could not move the lead.")
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["leads", "board"] }),
  })

  const handleDrop = (to: string) => {
    const d = dragging
    setDragOver(null)
    setDragging(null)
    if (!d || d.from === to) return
    setError(null)

    if (to === "converted") {
      if (!canConvert) {
        setError("You don't have permission to convert leads.")

        return
      }
      setConvertTarget({ id: d.id, from: d.from })

      return
    }
    move.mutate({ id: d.id, from: d.from, to })
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {PIPELINE.map(({ status, label }, i) => {
          const res = results[i]
          const leads = res.data?.data ?? []
          const total = res.data?.meta.total ?? 0
          const draggable = canUpdate && status !== "converted"

          return (
            <div
              key={status}
              data-status={status}
              onDragOver={(event) => {
                if (dragging && dragging.from !== status) {
                  event.preventDefault()
                  setDragOver(status)
                }
              }}
              onDragLeave={() => setDragOver((current) => (current === status ? null : current))}
              onDrop={(event) => {
                event.preventDefault()
                handleDrop(status)
              }}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-xl border bg-subtle/60 transition-shadow",
                dragOver === status && "ring-2 ring-cas-navy",
              )}
            >
              <div className="flex items-center justify-between border-b px-3 py-2">
                <Badge variant="outline" className={cn("border-transparent capitalize", LEAD_STATUS_BADGE[status])}>
                  {label}
                </Badge>
                <span className="text-xs font-medium tabular-nums text-muted-foreground">{total}</span>
              </div>

              <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
                {res.isPending &&
                  Array.from({ length: 3 }).map((_, k) => <Skeleton key={k} className="h-20 w-full rounded-lg" />)}

                {res.isError && <p className="px-1 py-2 text-xs text-destructive">Failed to load.</p>}

                {!res.isPending && !res.isError && leads.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">No leads</p>
                )}

                {leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    draggable={draggable}
                    onDragStart={() => setDragging({ id: lead.id, from: status })}
                    onDragEnd={() => setDragging(null)}
                    onOpen={() => navigate(`/leads/${lead.id}`)}
                  />
                ))}

                {total > leads.length && (
                  <p className="px-1 pt-1 text-center text-[11px] text-muted-foreground">
                    Showing {leads.length} of {total}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Drag-to-convert confirmation */}
      <Dialog open={!!convertTarget} onOpenChange={(open) => !open && setConvertTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Convert to student</DialogTitle>
            <DialogDescription>
              Creates the permanent student record and closes this lead. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConvertTarget(null)}>Cancel</Button>
            <Button
              disabled={move.isPending}
              onClick={() => {
                if (convertTarget) move.mutate({ id: convertTarget.id, from: convertTarget.from, to: "converted" })
                setConvertTarget(null)
              }}
            >
              {move.isPending ? "Converting…" : "Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** A single draggable lead card. */
function LeadCard({
  lead,
  draggable,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  lead: LeadListItem
  draggable: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onOpen: () => void
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move"
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={cn(
        "group rounded-lg border bg-card p-2.5 shadow-sm transition-shadow hover:shadow",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="min-w-0 truncate text-sm font-medium">{lead.full_name || "—"}</p>
        <LeadRowActions lead={lead} />
      </div>
      <p className="truncate text-xs text-muted-foreground">{lead.email ?? lead.phone ?? ""}</p>

      {(lead.form_type || lead.review) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {lead.form_type && (
            <Badge variant="outline" className="border-transparent bg-cas-navy-50 text-cas-navy capitalize">
              {lead.form_type.replace(/_/g, " ")}
            </Badge>
          )}
          {lead.review && (
            <Badge variant="outline" className="border-transparent bg-amber-50 text-amber-700">review</Badge>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{lead.assignee?.name ?? "Unassigned"}</span>
        {lead.country?.name && <span className="shrink-0">{lead.country.name}</span>}
      </div>
    </div>
  )
}
