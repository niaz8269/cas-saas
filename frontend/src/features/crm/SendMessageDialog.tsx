import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Send } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { COMM_CHANNELS, COMM_TEMPLATES, sendCommunication } from "@/features/crm/comms"
import { ApiError } from "@/lib/api"

export default function SendMessageDialog({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [channel, setChannel] = useState("email")
  const [template, setTemplate] = useState("welcome")
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => sendCommunication(studentId, {
      channel,
      template,
      ...(template === "custom" ? { body } : {}),
    }),
    onSuccess: () => {
      setOpen(false)
      setBody("")
      setError(null)
      // The send mirrors onto the timeline once the worker delivers it.
      queryClient.invalidateQueries({ queryKey: ["student-timeline", studentId] })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not queue the message."),
  })

  const canSend = template !== "custom" || body.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="w-full">
          <Send className="size-4" /> Send message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a message</DialogTitle>
          <DialogDescription>
            Queued for delivery and logged to the student's timeline.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="msg-channel">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger id="msg-channel"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMM_CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="msg-template">Template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger id="msg-template"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMM_TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {template === "custom" && (
            <div className="space-y-1.5">
              <Label htmlFor="msg-body">Message</Label>
              <Textarea
                id="msg-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message…"
                rows={4}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!canSend || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
