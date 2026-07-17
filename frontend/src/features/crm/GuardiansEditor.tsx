import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addGuardian,
  deleteGuardian,
  updateGuardian,
  type Guardian,
  type GuardianPayload,
} from "@/features/crm/api"
import { ApiError } from "@/lib/api"

type Draft = GuardianPayload & { id?: number }

const EMPTY: Draft = { name: "", relation: "", phone: "", email: "" }

export default function GuardiansEditor({
  studentId,
  guardians,
  canEdit,
}: {
  studentId: string
  guardians: Guardian[]
  canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["student", studentId] })

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const payload: GuardianPayload = {
        name: d.name,
        relation: d.relation || null,
        phone: d.phone || null,
        email: d.email || null,
      }

      return d.id ? updateGuardian(studentId, d.id, payload) : addGuardian(studentId, payload)
    },
    onSuccess: () => { setDraft(null); setError(null); invalidate() },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save the guardian."),
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteGuardian(studentId, id),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not remove the guardian."),
  })

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Guardians</p>
        {canEdit && draft === null && (
          <button
            type="button"
            onClick={() => { setDraft({ ...EMPTY }); setError(null) }}
            className="inline-flex items-center gap-1 text-xs font-medium text-cas-navy hover:underline"
          >
            <Plus className="size-3.5" /> Add
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {guardians.length === 0 && draft === null && (
        <p className="mt-1.5 text-sm text-muted-foreground">No guardians on file.</p>
      )}

      <ul className="mt-1.5 space-y-1.5">
        {guardians.map((g) => (
          <li key={g.id} className="group flex items-start justify-between gap-2 text-sm">
            <span>
              {g.name}
              <span className="text-muted-foreground">
                {" "}· {g.relation ?? "guardian"}{g.phone ? ` · ${g.phone}` : ""}{g.email ? ` · ${g.email}` : ""}
              </span>
            </span>
            {canEdit && draft === null && (
              <span className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button type="button" aria-label={`Edit ${g.name}`} onClick={() => { setDraft({ ...g }); setError(null) }} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="size-3.5" />
                </button>
                <button type="button" aria-label={`Remove ${g.name}`} onClick={() => remove.mutate(g.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>

      {draft !== null && (
        <form
          className="mt-3 space-y-2 rounded-lg bg-subtle p-3"
          onSubmit={(e) => { e.preventDefault(); if (draft.name.trim()) save.mutate(draft) }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{draft.id ? "Edit guardian" : "New guardian"}</span>
            <button type="button" aria-label="Cancel" onClick={() => { setDraft(null); setError(null) }} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <div>
            <Label htmlFor="g-name" className="sr-only">Name</Label>
            <Input id="g-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={draft.relation ?? ""} onChange={(e) => setDraft({ ...draft, relation: e.target.value })} placeholder="Relation" aria-label="Relation" />
            <Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="Phone" aria-label="Phone" />
          </div>
          <Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="Email" aria-label="Email" />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => { setDraft(null); setError(null) }}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!draft.name.trim() || save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
