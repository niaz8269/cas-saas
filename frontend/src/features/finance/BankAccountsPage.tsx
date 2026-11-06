import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Landmark, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useCan } from "@/features/auth/useCan"
import {
  createBankAccount,
  deleteBankAccount,
  listBankAccounts,
  updateBankAccount,
  type BankAccount,
  type BankAccountInput,
} from "@/features/finance/api"
import { ApiError } from "@/lib/api"

const EMPTY = {
  label: "", bank_name: "", account_name: "", account_number: "",
  iban: "", swift: "", bank_address: "", currency: "", instructions: "", is_active: true, is_default: false,
}

type Form = typeof EMPTY

const toForm = (a: BankAccount): Form => ({
  label: a.label, bank_name: a.bank_name, account_name: a.account_name, account_number: a.account_number,
  iban: a.iban ?? "", swift: a.swift ?? "", bank_address: a.bank_address ?? "",
  currency: a.currency ?? "", instructions: a.instructions ?? "", is_active: a.is_active, is_default: a.is_default,
})

/** Empty optional fields go up as null so they clear cleanly. */
const toPayload = (f: Form): BankAccountInput => ({
  label: f.label.trim(),
  bank_name: f.bank_name.trim(),
  account_name: f.account_name.trim(),
  account_number: f.account_number.trim(),
  iban: f.iban.trim() || null,
  swift: f.swift.trim() || null,
  bank_address: f.bank_address.trim() || null,
  currency: f.currency.trim().toUpperCase() || null,
  instructions: f.instructions.trim() || null,
  is_active: f.is_active,
  is_default: f.is_active && f.is_default,
})

/**
 * The accounts CAS receives money into. Add as many as needed; whoever raises an
 * invoice picks which one that invoice is paid into, and the student sees only that one.
 */
export default function BankAccountsPage() {
  const queryClient = useQueryClient()
  const canManage = useCan()("finance.manage.global")

  const [editing, setEditing] = useState<BankAccount | "new" | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [removing, setRemoving] = useState<BankAccount | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data, isPending, isError } = useQuery({
    queryKey: ["bank-accounts", "all"],
    queryFn: () => listBankAccounts(true),
  })

  const done = () => {
    queryClient.invalidateQueries({ queryKey: ["bank-accounts"] })
    setEditing(null)
    setRemoving(null)
    setError(null)
  }
  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : "Something went wrong.")

  const save = useMutation({
    mutationFn: () =>
      editing === "new" ? createBankAccount(toPayload(form)) : updateBankAccount((editing as BankAccount).id, toPayload(form)),
    onSuccess: done,
    onError: fail,
  })

  const toggle = useMutation({
    mutationFn: (a: BankAccount) => updateBankAccount(a.id, { is_active: !a.is_active }),
    onSuccess: done,
    onError: fail,
  })

  const remove = useMutation({
    mutationFn: (a: BankAccount) => deleteBankAccount(a.id),
    onSuccess: done,
    onError: (e) => { setRemoving(null); fail(e) },
  })

  const open = (target: BankAccount | "new") => {
    setError(null)
    setForm(target === "new" ? EMPTY : toForm(target))
    setEditing(target)
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))
  const canSave = form.label.trim() && form.bank_name.trim() && form.account_name.trim() && form.account_number.trim()
  const accounts = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/finance" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Finance
          </Link>
          <h2 className="mt-1 text-lg font-semibold">Bank accounts</h2>
          <p className="text-sm text-muted-foreground">
            Accounts CAS receives payments into. Choose one on each invoice; the student sees only the one chosen.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => open("new")}>
            <Plus className="size-4" /> Add account
          </Button>
        )}
      </div>

      {error && !editing && (
        <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {isPending && <Skeleton className="h-40 w-full rounded-xl" />}
      {isError && <p className="text-sm text-destructive">Could not load bank accounts.</p>}

      {data && accounts.length === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
          <Landmark className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">No bank accounts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add one so invoices can tell students where to pay.</p>
          {canManage && <Button className="mt-4" onClick={() => open("new")}><Plus className="size-4" /> Add account</Button>}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {accounts.map((a) => (
          <section key={a.id} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold">{a.label}</h3>
                <p className="text-sm text-muted-foreground">{a.bank_name}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {a.is_default && <Badge variant="outline" className="border-transparent bg-cas-navy-50 text-cas-navy">Default</Badge>}
                {a.currency && <Badge variant="outline">{a.currency}</Badge>}
                <Badge variant="outline" className={a.is_active ? "border-transparent bg-green-100 text-green-800" : "border-transparent bg-muted text-muted-foreground"}>
                  {a.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-[7.5rem_1fr] gap-y-1 text-sm">
              <dt className="text-muted-foreground">Account name</dt><dd>{a.account_name}</dd>
              <dt className="text-muted-foreground">Account number</dt><dd className="font-mono">{a.account_number}</dd>
              {a.iban && (<><dt className="text-muted-foreground">IBAN</dt><dd className="font-mono">{a.iban}</dd></>)}
              {a.swift && (<><dt className="text-muted-foreground">SWIFT / BIC</dt><dd className="font-mono">{a.swift}</dd></>)}
              {a.bank_address && (<><dt className="text-muted-foreground">Bank address</dt><dd>{a.bank_address}</dd></>)}
            </dl>
            {a.instructions && <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{a.instructions}</p>}

            {canManage && (
              <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                <Button size="sm" variant="secondary" onClick={() => open(a)}><Pencil className="size-4" /> Edit</Button>
                <Button size="sm" variant="secondary" disabled={toggle.isPending} onClick={() => toggle.mutate(a)}>
                  {a.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setError(null); setRemoving(a) }}>
                  <Trash2 className="size-4" /> Remove
                </Button>
              </div>
            )}
          </section>
        ))}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add bank account" : "Edit bank account"}</DialogTitle>
            <DialogDescription>These details are shown to students on the invoices that use this account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {error && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Field id="ba-label" label="Label (internal)" value={form.label} onChange={(v) => set({ label: v })} placeholder="BOC CNY, Shanghai" />
            <Field id="ba-bank" label="Bank name" value={form.bank_name} onChange={(v) => set({ bank_name: v })} />
            <Field id="ba-name" label="Account name" value={form.account_name} onChange={(v) => set({ account_name: v })} />
            <Field id="ba-number" label="Account number" value={form.account_number} onChange={(v) => set({ account_number: v })} mono />
            <div className="grid grid-cols-2 gap-3">
              <Field id="ba-iban" label="IBAN (optional)" value={form.iban} onChange={(v) => set({ iban: v })} mono />
              <Field id="ba-swift" label="SWIFT / BIC (optional)" value={form.swift} onChange={(v) => set({ swift: v })} mono />
            </div>
            <Field id="ba-address" label="Bank address (optional)" value={form.bank_address} onChange={(v) => set({ bank_address: v })} />
            <Field id="ba-currency" label="Currency (optional, e.g. CNY)" value={form.currency} onChange={(v) => set({ currency: v.toUpperCase() })} maxLength={3} />
            <div className="space-y-1.5">
              <Label htmlFor="ba-instructions">Payment notes (optional)</Label>
              <textarea
                id="ba-instructions"
                rows={3}
                value={form.instructions}
                onChange={(e) => set({ instructions: e.target.value })}
                placeholder="Reference format, remittance notes…"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} />
              Active (can be chosen on new invoices)
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={form.is_active && form.is_default} disabled={!form.is_active} onChange={(e) => set({ is_default: e.target.checked })} />
              <span>
                Default for application-fee invoices
                <span className="block text-xs text-muted-foreground">
                  Used automatically for invoices the system raises itself, and applied now to open invoices that have no account yet.
                </span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={!canSave || save.isPending} onClick={() => { setError(null); save.mutate() }}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remove {removing?.label}?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            It can no longer be chosen on invoices. Invoices already using it keep showing its details.
            To stop using it without removing it, deactivate it instead.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRemoving(null)}>Keep account</Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => removing && remove.mutate(removing)}>
              {remove.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({
  id, label, value, onChange, placeholder, mono, maxLength,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
  maxLength?: number
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} maxLength={maxLength} placeholder={placeholder} className={mono ? "font-mono" : undefined} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
