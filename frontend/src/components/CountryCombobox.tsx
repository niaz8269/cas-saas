import { ChevronDown } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"

import { normalize, searchCountries, type CountryItem } from "@/lib/countrySearch"
import { cn } from "@/lib/utils"

interface Props {
  id: string
  items: CountryItem[]
  /** The chosen item's `value`, or "" when nothing is chosen. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Names the field for screen readers when there is no visible label tied to `id`. */
  ariaLabel?: string
  invalid?: boolean
  className?: string
  /** Shown above the list when only the nearest spellings are offered. */
  closeMatchesText?: string
  noMatchText?: string
}

/**
 * A country picker you can type into. It forgives spelling mistakes ("Pakitsan", "Phillipines"), accents and the other
 * names people use ("Holland", "UAE"), shows the nearest matches, and works with the arrow keys, Enter and Escape.
 * On a phone it keeps the 16px text that stops the browser from zooming in.
 */
export default function CountryCombobox({ id, items, value, onChange, placeholder, ariaLabel, invalid, className, closeMatchesText = "Closest matches", noMatchText = "No country matches. Check the spelling." }: Props) {
  const listId = useId()
  const chosen = items.find((i) => i.value === value)
  const [text, setText] = useState(chosen?.label ?? "")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [typing, setTyping] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)

  // Follows the form when it changes the value itself (reset, or the list arriving after the page).
  useEffect(() => {
    if (!typing) setText(chosen?.label ?? "")
  }, [chosen?.label, typing])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current?.contains(e.target as Node)) return
      setOpen(false)
      setTyping(false)
    }
    document.addEventListener("mousedown", close)

    return () => document.removeEventListener("mousedown", close)
  }, [])

  const { results, close } = useMemo(() => searchCountries(items, typing ? text : "", typing ? 8 : items.length), [items, text, typing])

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" })
  }, [active, open])

  const pick = (item: CountryItem) => {
    onChange(item.value)
    setText(item.label)
    setTyping(false)
    setOpen(false)
  }

  return (
    <div ref={box} className={cn("relative", className)}>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        aria-invalid={invalid ? true : undefined}
        aria-activedescendant={open && results[active] ? `${listId}-${results[active].value}` : undefined}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        value={text}
        placeholder={placeholder}
        onFocus={(e) => { e.currentTarget.select(); setOpen(true) }}
        onChange={(e) => {
          setText(e.target.value)
          setTyping(true)
          setOpen(true)
          setActive(0)
          if (e.target.value === "") onChange("")
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)) }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          else if (e.key === "Enter" && open && results[active]) { e.preventDefault(); pick(results[active]) }
          else if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); setTyping(false); setText(chosen?.label ?? "") }
          else if (e.key === "Tab") {
            setOpen(false)
            // Tab accepts only what was typed in full; a loose guess is never picked silently.
            const exact = results.find((r) => normalize(r.label) === normalize(text))
            if (typing && exact) pick(exact)
          }
        }}
        className={cn(
          "h-9 w-full rounded-md border bg-transparent pr-9 pl-3 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm",
          invalid ? "border-destructive" : "border-input",
        )}
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />

      {open && (
        <ul ref={list} id={listId} role="listbox" aria-label={ariaLabel ?? placeholder} className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-md">
          {typing && close && results.length > 0 && <li role="presentation" className="px-3 py-1.5 text-xs text-muted-foreground">{closeMatchesText}</li>}
          {results.map((item, i) => (
            <li
              key={item.value}
              id={`${listId}-${item.value}`}
              data-index={i}
              role="option"
              aria-selected={item.value === value}
              onMouseDown={(e) => { e.preventDefault(); pick(item) }}
              onMouseEnter={() => setActive(i)}
              className={cn("cursor-pointer px-3 py-2 text-sm", i === active && "bg-accent text-accent-foreground", item.value === value && "font-medium")}
            >
              {item.label}
            </li>
          ))}
          {results.length === 0 && <li role="presentation" className="px-3 py-2 text-sm text-muted-foreground">{noMatchText}</li>}
        </ul>
      )}
    </div>
  )
}
