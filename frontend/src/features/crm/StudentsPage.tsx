import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { GraduationCap, Search } from "lucide-react"
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
import { listStudents } from "@/features/crm/api"
import { STUDENT_STATUS_BADGE, STUDENT_STATUSES } from "@/features/crm/status"
import { cn } from "@/lib/utils"

export default function StudentsPage() {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput)
      setPage(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["students", { q, status, page }],
    queryFn: () =>
      listStudents({
        q: q || undefined,
        status: status === "all" ? undefined : status,
        page,
      }),
    placeholderData: keepPreviousData,
  })

  const students = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name, code, passport…"
            className="w-72 bg-background pl-9"
            aria-label="Search students"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40 bg-background" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STUDENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Counselor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending &&
              Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 6 }).map((_, cell) => (
                    <TableCell key={cell}>
                      <Skeleton className="h-4 w-full max-w-28" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <p className="text-sm text-destructive">Failed to load students.</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => refetch()}>
                    Try again
                  </Button>
                </TableCell>
              </TableRow>
            )}

            {!isPending && !isError && students.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <GraduationCap className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No students found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Students appear here once leads are converted.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {students.map((student) => (
              <TableRow
                key={student.id}
                className="cursor-pointer"
                onClick={() => navigate(`/students/${student.id}`)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {student.student_code}
                </TableCell>
                <TableCell>
                  <p className="font-medium">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground">{student.email ?? student.phone ?? ""}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{student.country?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{student.branch?.code ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{student.counselor?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("border-transparent capitalize", STUDENT_STATUS_BADGE[student.status])}
                  >
                    {student.status.replace("_", " ")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

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
    </div>
  )
}
