import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProgramFieldType } from "@/features/catalog/api"
import { emptyField, FIELD_TYPES, HAS_OPTIONS, type EditableField } from "@/features/catalog/dialogs/applicationForm"

/** A checkbox list of document types the applicant must upload. */
export function DocumentPicker({
  docTypes,
  selected,
  onToggle,
}: {
  docTypes: { id: number; name: string }[]
  selected: number[]
  onToggle: (id: number) => void
}) {
  return (
    <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border p-2">
      {docTypes.map((t) => (
        <label key={t.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-cas-navy"
            aria-label={t.name}
            checked={selected.includes(t.id)}
            onChange={() => onToggle(t.id)}
          />
          {t.name}
        </label>
      ))}
    </div>
  )
}

/** A controlled builder for the applicant's custom questions. */
export function CustomFieldsBuilder({
  value,
  onChange,
}: {
  value: EditableField[]
  onChange: (fields: EditableField[]) => void
}) {
  const add = () => onChange([...value, emptyField()])
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const set = (i: number, patch: Partial<EditableField>) =>
    onChange(value.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))

  return (
    <div>
      <div className="space-y-2">
        {value.map((f, i) => (
          <div key={i} className="space-y-2 rounded-md border p-2">
            <div className="flex items-center gap-2">
              <Input
                aria-label={`Field ${i + 1} label`}
                placeholder="Question (e.g. Portfolio URL)"
                className="h-8"
                value={f.label}
                onChange={(e) => set(i, { label: e.target.value })}
              />
              <button type="button" onClick={() => remove(i)} aria-label={`Remove field ${i + 1}`}>
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Select value={f.type} onValueChange={(v) => set(i, { type: v as ProgramFieldType })}>
                <SelectTrigger aria-label={`Field ${i + 1} type`} className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-4 accent-cas-navy"
                  aria-label={`Field ${i + 1} required`}
                  checked={f.required}
                  onChange={(e) => set(i, { required: e.target.checked })}
                />
                Required
              </label>
            </div>
            {HAS_OPTIONS.includes(f.type) && (
              <Input
                aria-label={`Field ${i + 1} options`}
                placeholder="Options, comma-separated"
                className="h-8"
                value={f.optionsText}
                onChange={(e) => set(i, { optionsText: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" size="sm" className="mt-2 w-full" onClick={add}>
        <Plus className="size-4" /> Add field
      </Button>
    </div>
  )
}
