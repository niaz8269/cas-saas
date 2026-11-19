import { useQuery } from "@tanstack/react-query"
import { Search, X } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

import type { LookupResult } from "@/features/exclusives/api"
import { cn } from "@/lib/utils"

export interface PickerItem {
  id: number
  label: string
}

interface Option extends PickerItem {
  custom?: boolean
}

/**
 * A search box with a list under it. It asks the server as you type (so every record can be found, not just the
 * first page), supports the arrow keys, Enter and Escape, and shows the choice as a name with a clear button.
 * With `onCustom`, whatever was typed can also be used as it is, for a name that is not in the catalog.
 */
export default function SearchPicker({ id, label, value, placeholder, queryKey, search, onPick, onCustom, onClear }: {
  id: string
  label: string
  /** The name of the current choice, or null when nothing is picked. */
  value: string | null
  placeholder: string
  queryKey: string
  search: (q: string) => Promise<LookupResult>
  onPick: (item: PickerItem) => void
  /** Called with the typed text when it is used as it is. */
  onCustom?: (text: string) => void
  onClear: () => void
}) {
  const listId = useId()
  const [text, setText] = useState("")
  const [debounced, setDebounced] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 250)

    return () => clearTimeout(t)
  }, [text])

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", close)

    return () => document.removeEventListener("mousedown", close)
  }, [])

  const { data: result, isFetching } = useQuery({
    queryKey: ["exclusive-picker", queryKey, debounced],
    queryFn: () => search(debounced),
    enabled: open && value === null,
  })

  const typed = text.trim()
  const items: Option[] = result?.data ?? []
  const total = result?.total ?? 0
  const options: Option[] = onCustom && typed ? [...items, { id: -1, label: `Use "${typed}" as typed (not in the list)`, custom: true }] : items

  const pick = (option: Option) => {
    if (option.custom) onCustom?.(typed)
    else onPick(option)
    setText("")
    setOpen(false)
  }

  if (value !== null) {
    return (
      <div>
        <span className="text-sm font-medium" id={`${id}-label`}>{label}</span>
        <div role="group" aria-labelledby={`${id}-label`} className="mt-1 flex min-h-9 items-center justify-between gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
          <span className="min-w-0 break-words">{value}</span>
          <button type="button" onClick={onClear} aria-label={`Change ${label.toLowerCase()}`} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-subtle hover:text-foreground">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={box} className="relative">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="relative mt-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${listId}-${options[active].id}` : undefined}
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setText(e.target.value); setOpen(true); setActive(0) }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)) }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
            else if (e.key === "Enter" && open && options[active]) { e.preventDefault(); pick(options[active]) }
            else if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false) }
          }}
          className="h-9 w-full rounded-md border bg-card pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-cas-navy/40"
        />
      </div>
      {onCustom && <p className="mt-1 text-xs text-muted-foreground">Not in the list? Type the name and choose &quot;Use as typed&quot;.</p>}
      {open && (
        <ul id={listId} role="listbox" aria-label={label} className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-card py-1 shadow-lg">
          {options.map((o, i) => (
            <li key={o.id} id={`${listId}-${o.id}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(o) }} onMouseEnter={() => setActive(i)}
              className={cn("cursor-pointer px-3 py-2 text-sm", o.custom && "border-t font-medium text-cas-navy", i === active && "bg-cas-navy-50")}>
              {o.label}
            </li>
          ))}
          {total > items.length && <li role="presentation" className="sticky bottom-0 border-t bg-subtle px-3 py-2 text-xs text-muted-foreground">Showing {items.length} of {total}. Type more of the name, or the university, to narrow it down.</li>}
          {options.length === 0 && <li role="presentation" className="px-3 py-2 text-sm text-muted-foreground">{isFetching ? "Searching…" : "Nothing found. Try another word."}</li>}
        </ul>
      )}
    </div>
  )
}
