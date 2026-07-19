import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Plus, RotateCcw, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { createTask, listTasks, updateTask, type TaskItem } from "@/features/tasks/api"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-cas-red-50 text-cas-red",
  normal: "bg-cas-navy-50 text-cas-navy",
  low: "bg-muted text-muted-foreground",
}

const RELATED_ROUTE: Record<string, string> = {
  Lead: "/leads",
  Student: "/students",
  Application: "/applications",
  VisaCase: "/visa",
}

function dueLabel(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  const days = Math.round((d.getTime() - Date.now()) / 86_400_000)
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days === -1) return "Yesterday"
  if (days < 0) return `${-days}d overdue`

  return `in ${days}d`
}

export default function TasksPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<"active" | "done" | "all">("active")
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => { setQ(searchInput); setPage(1) }, 300)

    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isPending } = useQuery({
    queryKey: ["tasks", { tab, q, page }],
    queryFn: () => listTasks({ status: tab, q: q || undefined, page }),
    placeholderData: keepPreviousData,
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateTask(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  })

  const tasks = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-subtle p-1">
          {(["active", "done", "all"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setPage(1) }}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                tab === t ? "bg-card text-cas-navy shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search tasks…" className="w-64 bg-background pl-9" aria-label="Search tasks" />
        </div>
        <Button className="ml-auto" onClick={() => setNewOpen(true)}>
          <Plus className="size-4" /> New task
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Task</TableHead>
              <TableHead>Related</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 5 }).map((_, c) => <TableCell key={c}><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>
            ))}

            {!isPending && tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <p className="text-sm font-medium">{tab === "active" ? "You're all caught up 🎉" : "No tasks."}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Tasks from lead assignments and conversions land here.</p>
                </TableCell>
              </TableRow>
            )}

            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} onSetStatus={(status) => setStatus.mutate({ id: task.id, status })} />
            ))}
          </TableBody>
        </Table>

        {meta && meta.total > 0 && meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{meta.from}–{meta.to} of {meta.total}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <NewTaskDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  )
}

function TaskRow({ task, onSetStatus }: { task: TaskItem; onSetStatus: (status: string) => void }) {
  const done = task.status === "done"
  const relatedTo = task.related && RELATED_ROUTE[task.related.type]

  return (
    <TableRow className={cn(done && "opacity-60")}>
      <TableCell>
        <button
          type="button"
          aria-label={done ? "Reopen task" : "Mark done"}
          onClick={() => onSetStatus(done ? "open" : "done")}
          className={cn(
            "flex size-5 items-center justify-center rounded-full border transition-colors",
            done ? "border-success bg-success text-white" : "border-line hover:border-cas-navy",
          )}
        >
          {done ? <Check className="size-3.5" /> : task.status === "in_progress" ? <span className="size-2 rounded-full bg-cas-navy" /> : null}
        </button>
      </TableCell>
      <TableCell>
        <p className={cn("font-medium", done && "line-through")}>{task.title}</p>
        {task.student && (
          <Link to={`/students/${task.student.id}`} className="text-xs text-cas-navy hover:underline">{task.student.name}</Link>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {relatedTo
          ? <Link to={`${relatedTo}/${task.related!.id}`} className="text-cas-navy hover:underline">{task.related!.type}</Link>
          : "—"}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("border-transparent capitalize", PRIORITY_BADGE[task.priority])}>{task.priority}</Badge>
      </TableCell>
      <TableCell className={cn("whitespace-nowrap tabular-nums", task.overdue ? "font-medium text-cas-red" : "text-muted-foreground")}>
        <span className="flex items-center gap-2">
          {dueLabel(task.due_at)}
          {done && (
            <Button size="icon" variant="ghost" className="size-6 text-muted-foreground" aria-label="Reopen" onClick={() => onSetStatus("open")}>
              <RotateCcw className="size-3.5" />
            </Button>
          )}
        </span>
      </TableCell>
    </TableRow>
  )
}

function NewTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [priority, setPriority] = useState("normal")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) { setTitle(""); setDescription(""); setDueAt(""); setPriority("normal"); setError(null) }
  }, [open])

  const mutation = useMutation({
    mutationFn: () => createTask({
      title: title.trim(),
      description: description.trim() || null,
      due_at: dueAt || null,
      priority,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      onOpenChange(false)
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not create the task."),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>

        {error && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">Title</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Call the university about transcripts" autoFocus />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">Notes (optional)</span>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted-foreground">Due</span>
              <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted-foreground">Priority</span>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={!title.trim() || mutation.isPending} onClick={() => { setError(null); mutation.mutate() }}>
            {mutation.isPending ? "Adding…" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
