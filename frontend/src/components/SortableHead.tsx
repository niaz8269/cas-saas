import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"

/**
 * A sortable column header for list tables. Emits the next `sort` value
 * (`field` asc → `-field` desc → `field` asc) so the parent just stores it and
 * refetches; the server allowlists which fields are actually sortable.
 */
export function SortableHead({
  label,
  field,
  sort,
  onSortChange,
  className,
}: {
  label: string
  field: string
  sort: string
  onSortChange: (next: string) => void
  className?: string
}) {
  const desc = sort === `-${field}`
  const active = sort === field || desc
  const next = sort === field ? `-${field}` : field

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSortChange(next)}
        aria-label={`Sort by ${label}`}
        className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}
      >
        {label}
        {active ? (
          desc ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />
        ) : (
          <ChevronsUpDown className="size-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  )
}
