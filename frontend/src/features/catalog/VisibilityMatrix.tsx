import type { VisibilityConfig } from "@/features/catalog/api"

/** Admin field × audience visibility matrix (ADR-0015). Rows = the record's
 *  gateable sections, columns = audiences. A cell checked = that audience sees
 *  the section on the public site; unchecked = hidden. An unconfigured section
 *  defaults to registered users only (student/agent/consultant). */

const AUDIENCES = [
  { key: "public", label: "Public" },
  { key: "student", label: "Student" },
  { key: "agent", label: "Agent" },
  { key: "counselor", label: "Consultant" },
] as const

const REGISTERED_DEFAULT = ["student", "agent", "counselor"]

export function VisibilityMatrix({
  sections,
  value,
  onChange,
}: {
  sections: { key: string; label: string }[]
  value: VisibilityConfig
  onChange: (v: VisibilityConfig) => void
}) {
  const audiencesFor = (section: string) => value[section] ?? REGISTERED_DEFAULT

  const toggle = (section: string, audience: string) => {
    const current = audiencesFor(section)
    const next = current.includes(audience) ? current.filter((a) => a !== audience) : [...current, audience]
    onChange({ ...value, [section]: next })
  }

  return (
    <div className="space-y-1.5">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-subtle">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Section</th>
              {AUDIENCES.map((a) => (
                <th key={a.key} className="px-2 py-2 text-center font-medium">{a.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {sections.map((s) => (
              <tr key={s.key}>
                <td className="px-3 py-2">{s.label}</td>
                {AUDIENCES.map((a) => (
                  <td key={a.key} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${s.label} visible to ${a.label}`}
                      checked={audiencesFor(s.key).includes(a.key)}
                      onChange={() => toggle(s.key, a.key)}
                      className="size-4 accent-cas-navy"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Unchecked = hidden from that audience on the public site. Unconfigured sections default to registered users only.
      </p>
    </div>
  )
}
