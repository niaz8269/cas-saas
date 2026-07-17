import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Plus, School, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCan } from "@/features/auth/useCan"
import { listUniversities } from "@/features/catalog/api"
import UniversityFormDialog from "@/features/catalog/UniversityFormDialog"
import { cn } from "@/lib/utils"

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-muted text-muted-foreground",
}

export default function UniversitiesPage() {
  const navigate = useNavigate()
  const can = useCan()
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  // Debounce the search box into the query key.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput)
      setPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["universities", { q, status, page }],
    queryFn: () =>
      listUniversities({
        q: q || undefined,
        status: status === "all" ? undefined : status,
        page,
      }),
    placeholderData: keepPreviousData,
  })

  const universities = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name, code or city…"
            className="w-72 bg-background pl-9"
            aria-label="Search universities"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-36 bg-background" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {can("universities.manage.global") && (
          <Button className="ml-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New university
          </Button>
        )}
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>City</TableHead>
              <TableHead className="text-right">Courses</TableHead>
              <TableHead className="text-right">Intakes</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 6 }).map((_, cell) => (
                    <TableCell key={cell}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <p className="text-sm text-destructive">Failed to load universities.</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
                    Try again
                  </Button>
                </TableCell>
              </TableRow>
            )}

            {!isPending && !isError && universities.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <School className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No universities found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {q ? "Try a different search." : "Add your first partner university."}
                  </p>
                  {!q && can("universities.manage.global") && (
                    <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
                      <Plus className="size-4" />
                      New university
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}

            {universities.map((university) => (
              <TableRow
                key={university.id}
                className="h-10 cursor-pointer"
                onClick={() => navigate(`/universities/${university.id}`)}
              >
                <TableCell className="font-medium">{university.name}</TableCell>
                <TableCell className="text-muted-foreground">{university.code}</TableCell>
                <TableCell className="text-muted-foreground">{university.city ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{university.courses_count ?? 0}</TableCell>
                <TableCell className="text-right tabular-nums">{university.intakes_count ?? 0}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("border-transparent capitalize", STATUS_BADGE[university.status])}
                  >
                    {university.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination footer */}
        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              {meta.from}–{meta.to} of {meta.total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={meta.current_page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <UniversityFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
