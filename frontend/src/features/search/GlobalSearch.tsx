import { useQuery } from "@tanstack/react-query"
import { Building2, FileText, GraduationCap, Search, UserPlus, type LucideIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Input } from "@/components/ui/input"
import { globalSearch, type SearchResult } from "@/features/search/api"
import { cn } from "@/lib/utils"

const GROUPS: { type: SearchResult["type"]; label: string; icon: LucideIcon; to: (id: number) => string }[] = [
  { type: "student", label: "Students", icon: GraduationCap, to: (id) => `/students/${id}` },
  { type: "lead", label: "Leads", icon: UserPlus, to: (id) => `/leads/${id}` },
  { type: "application", label: "Applications", icon: FileText, to: (id) => `/applications/${id}` },
  { type: "university", label: "Universities", icon: Building2, to: (id) => `/universities/${id}` },
]

const routeFor = (result: SearchResult) => GROUPS.find((g) => g.type === result.type)!.to(result.id)

export default function GlobalSearch() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [term, setTerm] = useState("")
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  // Debounce the network query behind the typed term.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(term.trim()), 250)

    return () => clearTimeout(timer)
  }, [term])

  // Close the panel on an outside click.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)

    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const enabled = query.length >= 2
  const { data, isFetching } = useQuery({
    queryKey: ["global-search", query],
    queryFn: () => globalSearch(query),
    enabled,
  })

  // Flat results follow the group display order (backend appends the same way).
  const results = data?.data ?? []
  const ordered = GROUPS.flatMap((g) => results.filter((r) => r.type === g.type))

  // Keep the active row in range as results change.
  useEffect(() => setActive(0), [query, ordered.length])

  const go = (result: SearchResult) => {
    setOpen(false)
    setTerm("")
    setQuery("")
    navigate(routeFor(result))
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") { setOpen(false); return }
    if (!open || ordered.length === 0) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, ordered.length - 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === "Enter" && ordered[active]) {
      event.preventDefault()
      go(ordered[active])
    }
  }

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={term}
        onChange={(event) => { setTerm(event.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search students, leads, applications…"
        aria-label="Global search"
        className="w-56 bg-subtle pl-9 lg:w-72"
      />

      {open && enabled && (
        <div
          role="listbox"
          className="absolute top-full right-0 z-30 mt-1.5 max-h-96 w-80 overflow-auto rounded-xl border bg-popover p-1 shadow-lg lg:w-96"
        >
          {ordered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {isFetching ? "Searching…" : "No matches found."}
            </p>
          ) : (
            GROUPS.map((group) => {
              const items = results.filter((r) => r.type === group.type)
              if (items.length === 0) return null
              const Icon = group.icon

              return (
                <div key={group.type} className="mb-1 last:mb-0">
                  <p className="px-2 pt-2 pb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    {group.label}
                  </p>
                  {items.map((result) => {
                    const index = ordered.indexOf(result)
                    const isActive = index === active

                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(result)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm focus:outline-none",
                          isActive ? "bg-muted" : "hover:bg-muted",
                        )}
                      >
                        <Icon className="size-4 shrink-0 text-cas-navy" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{result.label}</span>
                          {result.sublabel && (
                            <span className="block truncate text-xs text-muted-foreground">{result.sublabel}</span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
