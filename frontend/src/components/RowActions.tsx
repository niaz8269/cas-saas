import { useMutation } from "@tanstack/react-query"
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ApiError } from "@/lib/api"

interface Props {
  /** What the row is, for the screen-reader label and the confirm text: "Lanzhou University". */
  name: string
  /** Opens the record's page. */
  onOpen?: () => void
  /** Opens the editor. Leave out when the person cannot edit. */
  onEdit?: () => void
  /** Deletes the record. Leave out when the person cannot delete. */
  onDelete?: () => Promise<unknown>
  /** Extra sentence in the confirm box, for example what else goes with it. */
  deleteNote?: string
  /** Further entries between Edit and Delete, for example a download. */
  extra?: { label: string; icon?: ReactNode; onSelect: () => void; disabled?: boolean }[]
}

/** The "..." menu at the end of a table row: Open, Edit and Delete (with a confirmation). Stops row clicks. */
export default function RowActions({ name, onOpen, onEdit, onDelete, deleteNote, extra }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = useMutation({
    mutationFn: () => onDelete!(),
    onSuccess: () => { setConfirming(false); setError(null) },
    onError: (e) => setError(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : "Could not delete."),
  })

  if (!onOpen && !onEdit && !onDelete && !(extra?.length)) return null

  return (
    <div onClick={(event) => event.stopPropagation()} className="inline-block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${name}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {onOpen && <DropdownMenuItem onSelect={onOpen}><ExternalLink className="size-4" /> Open</DropdownMenuItem>}
          {onEdit && <DropdownMenuItem onSelect={onEdit}><Pencil className="size-4" /> Edit</DropdownMenuItem>}
          {extra?.map((item) => (
            <DropdownMenuItem key={item.label} disabled={item.disabled} onSelect={item.onSelect}>{item.icon} {item.label}</DropdownMenuItem>
          ))}
          {onDelete && (onOpen || onEdit || extra?.length) && <DropdownMenuSeparator />}
          {onDelete && (
            <DropdownMenuItem variant="destructive" onSelect={() => { setError(null); setConfirming(true) }}>
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {onDelete && (
        <Dialog open={confirming} onOpenChange={(open) => { if (!remove.isPending) setConfirming(open) }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete {name}?</DialogTitle>
              <DialogDescription>
                It is removed from the lists right away. {deleteNote ?? "It is kept in the system history, so it can be restored by a developer if needed."}
              </DialogDescription>
            </DialogHeader>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="secondary" disabled={remove.isPending} onClick={() => setConfirming(false)}>Cancel</Button>
              <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? "Deleting…" : "Delete"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
