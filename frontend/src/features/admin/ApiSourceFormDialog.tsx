import { zodResolver } from "@hookform/resolvers/zod"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
  createApiSource,
  updateApiSource,
  type ApiSourceItem,
  type ApiSourcePayload,
} from "@/features/admin/api"
import { listPrograms, listUniversities } from "@/features/catalog/api"
import { ApiError } from "@/lib/api"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  type: z.enum(["website", "agent", "campaign", "manual"]),
  website_url: z.string().max(255).optional(),
  university_id: z.string().optional(),
  default_program_id: z.string().optional(),
  is_active: z.boolean(),
})

type Values = z.infer<typeof schema>

function toValues(s?: ApiSourceItem): Values {
  return {
    name: s?.name ?? "",
    type: (s?.type as Values["type"]) ?? "website",
    website_url: s?.website_url ?? "",
    university_id: s?.university ? String(s.university.id) : "",
    default_program_id: s?.default_program ? String(s.default_program.id) : "",
    is_active: s?.is_active ?? true,
  }
}

function toPayload(v: Values): ApiSourcePayload {
  return {
    name: v.name,
    type: v.type,
    website_url: v.website_url?.trim() || null,
    university_id: v.university_id ? Number(v.university_id) : null,
    default_program_id: v.default_program_id ? Number(v.default_program_id) : null,
    is_active: v.is_active,
  }
}

export default function ApiSourceFormDialog({
  open,
  onOpenChange,
  source,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  source?: ApiSourceItem
}) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(source)

  const { register, handleSubmit, reset, setValue, watch, setError, formState: { errors } } =
    useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(source) })

  useEffect(() => {
    if (open) reset(toValues(source))
  }, [open, source, reset])

  const universityId = watch("university_id")
  const isActive = watch("is_active")

  const universities = useQuery({
    queryKey: ["universities", { forSource: true }],
    queryFn: () => listUniversities({ per_page: 100 }),
    enabled: open,
    placeholderData: keepPreviousData,
  })

  const programs = useQuery({
    queryKey: ["programs", { university: universityId }],
    queryFn: () => listPrograms(universityId),
    enabled: open && Boolean(universityId),
    placeholderData: keepPreviousData,
  })

  const mutation = useMutation({
    mutationFn: (payload: ApiSourcePayload) =>
      isEdit ? updateApiSource(source!.id, payload) : createApiSource(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-sources"] })
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit source" : "New integration source"}</DialogTitle>
          <DialogDescription>
            A partner site or channel that pushes applications into the ERP. Bind it to a university and default
            program so ingested applications file correctly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(toPayload(v)))} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>
          )}

          <Field label="Name" error={errors.name?.message}>
            <Input placeholder="XJMU Admissions Site" {...register("name")} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type" error={errors.type?.message}>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" {...register("type")}>
                <option value="website">Website</option>
                <option value="agent">Agent</option>
                <option value="campaign">Campaign</option>
                <option value="manual">Manual</option>
              </select>
            </Field>
            <Field label="Website URL" error={errors.website_url?.message}>
              <Input placeholder="https://admissions.example" {...register("website_url")} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="University" hint="For application ingestion">
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={universityId ?? ""}
                onChange={(e) => { setValue("university_id", e.target.value); setValue("default_program_id", "") }}
              >
                <option value="">— None —</option>
                {(universities.data?.data ?? []).map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Default program" error={errors.default_program_id?.message} hint={universityId ? undefined : "Pick a university first"}>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
                disabled={!universityId}
                value={watch("default_program_id") ?? ""}
                onChange={(e) => setValue("default_program_id", e.target.value)}
              >
                <option value="">— None —</option>
                {(programs.data?.data ?? []).map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name} ({p.level})</option>
                ))}
              </select>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-cas-navy" checked={isActive} onChange={(e) => setValue("is_active", e.target.checked)} />
            Active (keys are accepted while active)
          </label>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  error,
  hint,
  children,
}: {
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
