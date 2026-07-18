import { useMutation } from "@tanstack/react-query"
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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { testMessageTemplate } from "@/features/admin/api"
import { COMM_CHANNELS } from "@/features/crm/comms"
import { ApiError } from "@/lib/api"

/** Fires a one-off test send of a message template to verify it renders and delivers. */
export default function TemplateTestDialog({ templateKey, subject }: { templateKey: string; subject: string }) {
  const [open, setOpen] = useState(false)
  const [channel, setChannel] = useState("email")
  const [to, setTo] = useState("")
  const [error, setError] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: () => testMessageTemplate(templateKey, { channel, to: to.trim() || undefined }),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Send failed."),
  })

  const change = (next: boolean) => {
    setOpen(next)
    if (!next) { send.reset(); setError(null); setTo("") }
  }

  const result = send.data?.data

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Send className="size-3.5" /> Send test
      </Button>

      <Dialog open={open} onOpenChange={change}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Send a test</DialogTitle>
            <DialogDescription>Delivers “{subject}” with sample data so you can verify it.</DialogDescription>
          </DialogHeader>

          {result ? (
            <div role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
              Sent to <span className="font-medium">{result.to}</span> via {result.channel}.
            </div>
          ) : (
            <div className="space-y-3">
              {error && (
                <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="test-channel">Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger id="test-channel"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMM_CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {channel === "email" && (
                <div className="space-y-1.5">
                  <Label htmlFor="test-to">Recipient</Label>
                  <Input
                    id="test-to"
                    type="email"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    placeholder="defaults to your email"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {result ? (
              <Button onClick={() => change(false)}>Done</Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => change(false)}>Cancel</Button>
                <Button disabled={send.isPending} onClick={() => { setError(null); send.mutate() }}>
                  {send.isPending ? "Sending…" : "Send"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
