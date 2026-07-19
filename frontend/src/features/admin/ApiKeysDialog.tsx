import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, Copy, KeyRound, TriangleAlert } from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createApiKey, revokeApiKey, type ApiSourceItem } from "@/features/admin/api"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function ApiKeysDialog({
  open,
  onOpenChange,
  source,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: ApiSourceItem | null
}) {
  const queryClient = useQueryClient()
  const [rateLimit, setRateLimit] = useState("60")
  const [revealed, setRevealed] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset the one-time reveal whenever the dialog opens or switches source.
  useEffect(() => {
    if (open) { setRevealed(null); setCopied(false); setError(null); setRateLimit("60") }
  }, [open, source?.id])

  const mint = useMutation({
    mutationFn: () => createApiKey(source!.id, Number(rateLimit) || 60),
    onSuccess: (res) => {
      setRevealed(res.plain_key)
      setCopied(false)
      queryClient.invalidateQueries({ queryKey: ["api-sources"] })
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not generate a key."),
  })

  const revoke = useMutation({
    mutationFn: (keyId: number) => revokeApiKey(source!.id, keyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-sources"] }),
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not revoke the key."),
  })

  const copy = async () => {
    if (!revealed) return
    await navigator.clipboard.writeText(revealed)
    setCopied(true)
  }

  const keys = source?.keys ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>API keys — {source?.name}</DialogTitle>
          <DialogDescription>
            Give the partner site one key. Keys are stored hashed; the full value is shown only once, right after you
            generate it.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {/* One-time reveal of a freshly minted key */}
        {revealed && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
              <TriangleAlert className="size-3.5" /> Copy this now — it won't be shown again.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-background px-2 py-1.5 font-mono text-xs">{revealed}</code>
              <Button type="button" size="sm" variant="secondary" onClick={copy}>
                {copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy</>}
              </Button>
            </div>
          </div>
        )}

        {/* Generate */}
        <div className="flex items-end gap-2">
          <label className="text-sm">
            <span className="mb-1.5 block text-muted-foreground">Rate limit (req/min)</span>
            <Input
              type="number"
              min={1}
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
              className="w-36 bg-background"
            />
          </label>
          <Button type="button" onClick={() => mint.mutate()} disabled={mint.isPending}>
            <KeyRound className="size-4" /> {mint.isPending ? "Generating…" : "Generate key"}
          </Button>
        </div>

        {/* Existing keys */}
        <div className="space-y-2">
          {keys.length === 0 && <p className="text-sm text-muted-foreground">No keys yet.</p>}
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="font-mono text-sm">{key.label}</p>
                <p className="text-xs text-muted-foreground">
                  {key.rate_limit}/min · {key.created_at ? new Date(key.created_at).toLocaleDateString() : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("border-transparent", key.active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground")}
                >
                  {key.active ? "Active" : "Revoked"}
                </Badge>
                {key.active && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(key.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
