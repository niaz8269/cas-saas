import type { ProgramCustomField, ProgramFieldType } from "@/features/catalog/api"

/** The custom-field types an admin can attach to a course or university. */
export const FIELD_TYPES: [ProgramFieldType, string][] = [
  ["text", "Text"],
  ["textarea", "Paragraph"],
  ["number", "Number"],
  ["date", "Date"],
  ["select", "Dropdown"],
  ["radio", "Radio buttons"],
]

/** Field types that carry a list of options. */
export const HAS_OPTIONS: ProgramFieldType[] = ["select", "radio"]

/** The builder edits fields by label; the backend key is derived on save. */
export type EditableField = { label: string; type: ProgramFieldType; required: boolean; optionsText: string }

export const emptyField = (): EditableField => ({ label: "", type: "text", required: false, optionsText: "" })

/** Requirements/form spec → editable rows. */
export function parseFields(fields?: ProgramCustomField[] | null): EditableField[] {
  return (fields ?? [])
    .filter((f): f is ProgramCustomField => !!f && typeof f.label === "string")
    .map((f) => ({ label: f.label, type: f.type, required: !!f.required, optionsText: (f.options ?? []).join(", ") }))
}

/** Derive a snake_case key that satisfies the backend's ^[a-z][a-z0-9_]*$. */
export function toFieldKey(label: string): string {
  const k = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  if (!k) return "field"

  return /^[a-z]/.test(k) ? k : `f_${k}`
}

/** Editable rows → the spec the API stores, with distinct derived keys. */
export function buildFields(editable: EditableField[]): ProgramCustomField[] {
  const seen = new Set<string>()

  return editable
    .filter((f) => f.label.trim() !== "")
    .map((f) => {
      const base = toFieldKey(f.label)
      let key = base
      for (let i = 2; seen.has(key); i++) key = `${base}_${i}`
      seen.add(key)

      const field: ProgramCustomField = { key, label: f.label.trim(), type: f.type, required: f.required }
      if (HAS_OPTIONS.includes(f.type)) {
        field.options = f.optionsText.split(",").map((o) => o.trim()).filter((o) => o !== "")
      }

      return field
    })
}
