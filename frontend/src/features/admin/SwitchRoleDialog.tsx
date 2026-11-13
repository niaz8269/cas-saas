import { useMutation } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { RoleSwitchResult } from "@/features/admin/api"
import { ApiError } from "@/lib/api"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Who is being switched, e.g. "Ali Raza". */
  name: string
  from: "Student" | "Partner"
  to: "Student" | "Partner"
  action: () => Promise<RoleSwitchResult>
  onDone: (result: RoleSwitchResult) => void
  children?: ReactNode
}

/** Confirm step for switching an account between the Student and Partner portals. */
export default function SwitchRoleDialog({ open, onOpenChange, name, from, to, action, onDone }: Props) {
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: action,
    onSuccess: (result) => {
      onOpenChange(false)
      onDone(result)
    },
    onError: (e) => setError(e instanceof ApiError ? (e.errors.account?.[0] ?? e.message) : "Something went wrong. Please try again."),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setError(null); onOpenChange(v) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change {name} to {to}?</DialogTitle>
          <DialogDescription>
            They will sign in to the {to} portal with the same email and password, and can no longer use the {from} portal.
            The {from} record is kept, deactivated and linked to the new one, so nothing is deleted.
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="border-l-4 border-destructive bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={mutation.isPending} onClick={() => { setError(null); mutation.mutate() }}>
            {mutation.isPending ? "Changing…" : `Change to ${to}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
