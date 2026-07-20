import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createTask, listStudentTasks, updateTask } from "@/features/tasks/api"
import { cn } from "@/lib/utils"

function dueShort(iso: string): string {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (days === 0) return "today"
  if (days < 0) return `${-days}d late`

  return `${days}d`
}

/** Compact follow-up tasks list for a student, shown on their profile. */
export default function StudentTasks({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")

  const { data, isPending } = useQuery({
    queryKey: ["student-tasks", studentId],
    queryFn: () => listStudentTasks(studentId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["student-tasks", studentId] })
    queryClient.invalidateQueries({ queryKey: ["tasks"] })
  }

  const add = useMutation({
    mutationFn: () => createTask({ title: title.trim(), student_id: Number(studentId) }),
    onSuccess: () => { setTitle(""); invalidate() },
  })

  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateTask(id, { status }),
    onSuccess: invalidate,
  })

  const tasks = Array.isArray(data?.data) ? data.data : []

  return (
    <div className="mt-4 border-t pt-4">
      <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Follow-up tasks</p>

      <ul className="mt-2 space-y-1">
        {!isPending && tasks.length === 0 && <li className="text-sm text-muted-foreground">No tasks yet.</li>}
        {tasks.map((task) => {
          const done = task.status === "done"

          return (
            <li key={task.id} className="flex items-center gap-2 text-sm">
              <button
                type="button"
                aria-label={done ? "Reopen task" : "Mark done"}
                onClick={() => toggle.mutate({ id: task.id, status: done ? "open" : "done" })}
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  done ? "border-success bg-success text-white" : "border-line hover:border-cas-navy",
                )}
              >
                {done && <Check className="size-3" />}
              </button>
              <span className={cn("flex-1 truncate", done && "text-muted-foreground line-through")}>{task.title}</span>
              {task.due_at && (
                <span className={cn("shrink-0 text-xs tabular-nums", task.overdue ? "text-cas-red" : "text-muted-foreground")}>
                  {dueShort(task.due_at)}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <form
        onSubmit={(e) => { e.preventDefault(); if (title.trim()) add.mutate() }}
        className="mt-2 flex gap-2"
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…" className="h-8" aria-label="New task title" />
        <Button type="submit" size="sm" disabled={!title.trim() || add.isPending}>Add</Button>
      </form>
    </div>
  )
}
