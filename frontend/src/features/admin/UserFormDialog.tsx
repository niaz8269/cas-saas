import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
  createUser,
  listBranches,
  listDepartments,
  listRoles,
  updateUser,
  type StaffUser,
  type UserWritePayload,
} from "@/features/admin/api"
import { isSuperAdmin } from "@/lib/navigation"
import { ApiError } from "@/lib/api"
import { useAuthStore } from "@/stores/auth"

const STATUSES = ["active", "inactive", "suspended"] as const

const schema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  email: z.string().min(1, "Email is required").email("Enter a valid email").max(190),
  phone: z.string().max(30).optional(),
  password: z.string().max(255).optional(),
  branch_id: z.string().optional(),
  department_id: z.string().optional(),
  status: z.string(),
  roles: z.array(z.string()),
})

type Values = z.infer<typeof schema>

function toValues(u?: StaffUser | null): Values {
  return {
    name: u?.name ?? "",
    email: u?.email ?? "",
    phone: u?.phone ?? "",
    password: "",
    branch_id: u?.branch ? String(u.branch.id) : "",
    department_id: u?.department ? String(u.department.id) : "",
    status: u?.status ?? "active",
    roles: u?.roles ?? [],
  }
}

export default function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: StaffUser | null
}) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(user)
  const currentUser = useAuthStore((s) => s.user)
  const canManageSuperAdmin = isSuperAdmin(currentUser)

  const { register, handleSubmit, reset, setError, setValue, watch, formState: { errors } } =
    useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(user) })

  useEffect(() => {
    if (open) reset(toValues(user))
  }, [open, user, reset])

  const roles = useQuery({ queryKey: ["roles"], queryFn: listRoles, enabled: open, staleTime: 60 * 60 * 1000 })
  const branches = useQuery({ queryKey: ["branches"], queryFn: listBranches, enabled: open, staleTime: 60 * 60 * 1000 })
  const departments = useQuery({ queryKey: ["departments"], queryFn: listDepartments, enabled: open, staleTime: 60 * 60 * 1000 })

  const selectedRoles = watch("roles")

  const mutation = useMutation({
    mutationFn: (v: Values) => {
      const payload: UserWritePayload = {
        name: v.name.trim(),
        email: v.email.trim(),
        phone: v.phone?.trim() || null,
        branch_id: v.branch_id ? Number(v.branch_id) : null,
        department_id: v.department_id ? Number(v.department_id) : null,
        status: v.status,
        roles: v.roles,
      }
      const pw = v.password?.trim()
      if (pw) payload.password = pw

      return isEdit ? updateUser(user!.id, payload) : createUser(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        for (const [field, messages] of Object.entries(error.errors)) {
          if (field in schema.shape) setError(field as keyof Values, { type: "server", message: messages[0] })
        }
        if (!Object.keys(error.errors).length) setError("root", { type: "server", message: error.message })

        return
      }
      setError("root", { type: "server", message: error instanceof ApiError ? error.message : "Something went wrong." })
    },
  })

  const onSubmit = (v: Values) => {
    const pw = v.password?.trim() ?? ""
    // Password required on create; optional on edit but must be strong if set.
    if (!isEdit && pw.length < 8) {
      setError("password", { type: "manual", message: "At least 8 characters" })

      return
    }
    if (isEdit && pw && pw.length < 8) {
      setError("password", { type: "manual", message: "At least 8 characters" })

      return
    }
    mutation.mutate(v)
  }

  const toggleRole = (name: string, checked: boolean) => {
    const next = checked ? [...selectedRoles, name] : selectedRoles.filter((r) => r !== name)
    setValue("roles", next, { shouldDirty: true })
  }

  const roleOptions = (roles.data?.data ?? []).filter(
    (r) => canManageSuperAdmin || r.name !== "Super Admin",
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit user" : "New user"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this person's details, roles, and account status."
              : "Create a staff account and assign roles. They can sign in with the password you set."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" error={errors.name?.message}>
              <Input {...register("name")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register("phone")} />
            </Field>
            <Field
              label={isEdit ? "New password" : "Password"}
              error={errors.password?.message}
              hint={isEdit ? "Leave blank to keep current" : "Min. 8 characters"}
            >
              <Input type="password" autoComplete="new-password" {...register("password")} />
            </Field>
            <Field label="Branch" error={errors.branch_id?.message}>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" {...register("branch_id")}>
                <option value="">—</option>
                {(branches.data?.data ?? []).map((b) => (
                  <option key={b.id} value={String(b.id)}>{b.name} ({b.code})</option>
                ))}
              </select>
            </Field>
            <Field label="Department" error={errors.department_id?.message}>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" {...register("department_id")}>
                <option value="">—</option>
                {(departments.data?.data ?? []).map((d) => (
                  <option key={d.id} value={String(d.id)}>{d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Status" error={errors.status?.message}>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm capitalize" {...register("status")}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div>
            <Label className="mb-2 block">Roles</Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-3">
              {roleOptions.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input accent-cas-navy"
                    checked={selectedRoles.includes(r.name)}
                    onChange={(e) => toggleRole(r.name, e.target.checked)}
                  />
                  <span>{r.name}</span>
                </label>
              ))}
              {roles.isPending && <p className="text-sm text-muted-foreground">Loading roles…</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, error, hint, children }: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="block">
        <span className="mb-1.5 block">{label}</span>
        {children}
      </Label>
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
