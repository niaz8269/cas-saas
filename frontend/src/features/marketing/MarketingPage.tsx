import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

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
import { Label } from "@/components/ui/label"
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
import {
  createCampaign,
  createMarketingSource,
  deleteCampaign,
  deleteMarketingSource,
  listCampaigns,
  listMarketingSources,
  updateCampaign,
  updateMarketingSource,
  type Campaign,
  type MarketingSource,
} from "@/features/marketing/api"
import { cn } from "@/lib/utils"

const dateRange = (start: string | null, end: string | null) =>
  start || end ? `${start ?? "—"} → ${end ?? "—"}` : "—"

// ── Campaign create / edit ──────────────────────────────────────────────────

function CampaignDialog({
  campaign,
  open,
  onOpenChange,
}: {
  campaign?: Campaign
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: "", marketing_source_id: "", utm_source: "", utm_medium: "", utm_campaign: "", start_date: "", end_date: "",
  })
  const [error, setError] = useState<string | null>(null)

  const sources = useQuery({ queryKey: ["marketing-sources"], queryFn: listMarketingSources, enabled: open })

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm({
      name: campaign?.name ?? "",
      marketing_source_id: campaign?.marketing_source_id ? String(campaign.marketing_source_id) : "",
      utm_source: campaign?.utm_source ?? "",
      utm_medium: campaign?.utm_medium ?? "",
      utm_campaign: campaign?.utm_campaign ?? "",
      start_date: campaign?.start_date ?? "",
      end_date: campaign?.end_date ?? "",
    })
  }, [open, campaign])

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        marketing_source_id: form.marketing_source_id ? Number(form.marketing_source_id) : null,
        utm_source: form.utm_source || null,
        utm_medium: form.utm_medium || null,
        utm_campaign: form.utm_campaign || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      }

      return campaign ? updateCampaign(campaign.id, payload) : createCampaign(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      onOpenChange(false)
    },
    onError: () => setError("Couldn't save the campaign. Check the fields and try again."),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{campaign ? "Edit campaign" : "New campaign"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Autumn intake push" />
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={form.marketing_source_id || "none"} onValueChange={(v) => set("marketing_source_id", v === "none" ? "" : v)}>
              <SelectTrigger aria-label="Marketing source"><SelectValue placeholder="No source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No source</SelectItem>
                {(sources.data?.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-src">UTM source</Label>
              <Input id="c-src" value={form.utm_source} onChange={(e) => set("utm_source", e.target.value)} placeholder="facebook" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-med">UTM medium</Label>
              <Input id="c-med" value={form.utm_medium} onChange={(e) => set("utm_medium", e.target.value)} placeholder="cpc" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-camp">UTM campaign</Label>
              <Input id="c-camp" value={form.utm_campaign} onChange={(e) => set("utm_campaign", e.target.value)} placeholder="autumn26" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-start">Starts</Label>
              <Input id="c-start" type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-end">Ends</Label>
              <Input id="c-end" type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Source create / edit ────────────────────────────────────────────────────

function SourceDialog({
  source,
  open,
  onOpenChange,
}: {
  source?: MarketingSource
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: "", channel: "", is_active: "true" })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm({ name: source?.name ?? "", channel: source?.channel ?? "", is_active: source ? String(source.is_active) : "true" })
  }, [open, source])

  const save = useMutation({
    mutationFn: () => {
      const payload = { name: form.name.trim(), channel: form.channel || null, is_active: form.is_active === "true" }

      return source ? updateMarketingSource(source.id, payload) : createMarketingSource(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-sources"] })
      onOpenChange(false)
    },
    onError: () => setError("Couldn't save the source."),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{source ? "Edit source" : "New source"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Name</Label>
            <Input id="s-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Facebook Ads" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-channel">Channel</Label>
            <Input id="s-channel" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))} placeholder="social, paid, referral…" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.is_active} onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))}>
              <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function CampaignsTab({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Campaign | undefined>()

  const { data, isPending } = useQuery({ queryKey: ["campaigns"], queryFn: listCampaigns })
  const rows = data?.data ?? []

  const remove = useMutation({
    mutationFn: (id: number) => deleteCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  })

  return (
    <>
      <div className="mb-3 flex justify-end">
        {canManage && <Button onClick={() => { setEditing(undefined); setOpen(true) }}><Plus className="size-4" /> New campaign</Button>}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>UTM campaign</TableHead>
              <TableHead>Window</TableHead>
              {canManage && <TableHead className="w-24 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: canManage ? 5 : 4 }).map((_, c) => (
                <TableCell key={c}><Skeleton className="h-4 w-full max-w-28" /></TableCell>
              ))}</TableRow>
            ))}
            {!isPending && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="py-12 text-center">
                  <Megaphone className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No campaigns yet</p>
                  {canManage && <p className="mt-1 text-sm text-muted-foreground">Create one with “New campaign”.</p>}
                </TableCell>
              </TableRow>
            )}
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.marketing_source?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.utm_campaign ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{dateRange(c.start_date, c.end_date)}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => { setEditing(c); setOpen(true) }}><Pencil className="size-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-cas-red" aria-label={`Delete ${c.name}`}
                      onClick={() => window.confirm(`Delete “${c.name}”?`) && remove.mutate(c.id)}><Trash2 className="size-4" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {canManage && <CampaignDialog campaign={editing} open={open} onOpenChange={setOpen} />}
    </>
  )
}

function SourcesTab({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MarketingSource | undefined>()

  const { data, isPending } = useQuery({ queryKey: ["marketing-sources"], queryFn: listMarketingSources })
  const rows = data?.data ?? []

  const remove = useMutation({
    mutationFn: (id: number) => deleteMarketingSource(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketing-sources"] }),
  })

  return (
    <>
      <div className="mb-3 flex justify-end">
        {canManage && <Button onClick={() => { setEditing(undefined); setOpen(true) }}><Plus className="size-4" /> New source</Button>}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-subtle">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Campaigns</TableHead>
              {canManage && <TableHead className="w-24 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: canManage ? 5 : 4 }).map((_, c) => (
                <TableCell key={c}><Skeleton className="h-4 w-full max-w-28" /></TableCell>
              ))}</TableRow>
            ))}
            {!isPending && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="py-12 text-center">
                  <p className="text-sm font-medium">No sources yet</p>
                  {canManage && <p className="mt-1 text-sm text-muted-foreground">Add where your leads come from.</p>}
                </TableCell>
              </TableRow>
            )}
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground capitalize">{s.channel ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border-transparent capitalize", s.is_active ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground")}>
                    {s.is_active ? "active" : "inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{s.campaigns_count ?? 0}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" aria-label={`Edit ${s.name}`} onClick={() => { setEditing(s); setOpen(true) }}><Pencil className="size-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-cas-red" aria-label={`Delete ${s.name}`}
                      onClick={() => window.confirm(`Delete “${s.name}”?`) && remove.mutate(s.id)}><Trash2 className="size-4" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {canManage && <SourceDialog source={editing} open={open} onOpenChange={setOpen} />}
    </>
  )
}

export default function MarketingPage() {
  const can = useCan()
  const canManage = can("marketing.manage.global")
  const [tab, setTab] = useState<"campaigns" | "sources">("campaigns")

  const tabBtn = (key: "campaigns" | "sources", label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        tab === key ? "bg-cas-navy text-white" : "text-muted-foreground hover:bg-subtle",
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-cas-navy">Campaigns</h1>
        <p className="text-sm text-muted-foreground">Marketing campaigns and the lead sources they run through.</p>
      </div>

      <div className="flex gap-1 rounded-lg border bg-card p-1 shadow-sm w-fit">
        {tabBtn("campaigns", "Campaigns")}
        {tabBtn("sources", "Sources")}
      </div>

      {tab === "campaigns" ? <CampaignsTab canManage={canManage} /> : <SourcesTab canManage={canManage} />}
    </div>
  )
}
