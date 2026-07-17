import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ExternalLink, MoreHorizontal, UserCheck, UserPlus } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { assignLead, convertLead, listStaff, type LeadListItem } from "@/features/crm/api"
import { useCan } from "@/features/auth/useCan"
import { ApiError } from "@/lib/api"

/** Inline assign/convert quick-actions for a leads-table row. */
export default function LeadRowActions({ lead }: { lead: LeadListItem }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const can = useCan()

  const [assignOpen, setAssignOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState("")
  const [error, setError] = useState<string | null>(null)

  const isClosed = ["converted", "duplicate"].includes(lead.status)
  const canConvert = can("leads.convert.assigned") && !isClosed
  const canAssign = can("leads.assign.global") && !isClosed

  const staffQuery = useQuery({
    queryKey: ["staff-directory"],
    queryFn: listStaff,
    enabled: assignOpen,
  })

  const assignMutation = useMutation({
    mutationFn: () => assignLead(lead.id, Number(selectedStaff)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      setAssignOpen(false)
      setSelectedStaff("")
      setError(null)
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Assignment failed."),
  })

  const convertMutation = useMutation({
    mutationFn: () => convertLead(lead.id),
    onSuccess: (result) => navigate(`/students/${result.data.id}`),
    onError: (err) => {
      setConvertOpen(false)
      setError(err instanceof ApiError ? err.message : "Conversion failed.")
    },
  })

  return (
    // Stop row-click navigation from firing when interacting with the menu.
    <div onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${lead.full_name || `lead ${lead.id}`}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => navigate(`/leads/${lead.id}`)}>
            <ExternalLink className="size-4" /> Open lead
          </DropdownMenuItem>
          {lead.student_id && (
            <DropdownMenuItem onSelect={() => navigate(`/students/${lead.student_id}`)}>
              <UserPlus className="size-4" /> View student
            </DropdownMenuItem>
          )}
          {(canAssign || canConvert) && <DropdownMenuSeparator />}
          {canAssign && (
            <DropdownMenuItem onSelect={() => setAssignOpen(true)}>
              <UserCheck className="size-4" /> Assign
            </DropdownMenuItem>
          )}
          {canConvert && (
            <DropdownMenuItem onSelect={() => setConvertOpen(true)}>
              <UserPlus className="size-4" /> Convert to student
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign lead</DialogTitle>
            <DialogDescription>The counselor gets a follow-up task due in 48 hours.</DialogDescription>
          </DialogHeader>

          <Select value={selectedStaff} onValueChange={setSelectedStaff}>
            <SelectTrigger aria-label="Select counselor">
              <SelectValue placeholder={staffQuery.isPending ? "Loading staff…" : "Select a counselor"} />
            </SelectTrigger>
            <SelectContent>
              {(staffQuery.data?.data ?? []).map((staff) => (
                <SelectItem key={staff.id} value={String(staff.id)}>{staff.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button disabled={!selectedStaff || assignMutation.isPending} onClick={() => assignMutation.mutate()}>
              {assignMutation.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert confirm */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Convert to student</DialogTitle>
            <DialogDescription>
              Creates the permanent student record and closes this lead. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button disabled={convertMutation.isPending} onClick={() => convertMutation.mutate()}>
              {convertMutation.isPending ? "Converting…" : "Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
