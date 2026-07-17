import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, X } from "lucide-react"
import { useEffect } from "react"
import { useFieldArray, useForm } from "react-hook-form"
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
import { Textarea } from "@/components/ui/textarea"
import {
  createUniversity,
  updateUniversity,
  type University,
  type UniversityPayload,
} from "@/features/catalog/api"
import { ApiError } from "@/lib/api"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(190),
  code: z.string().min(1, "Code is required").max(40),
  slug: z.string().max(190).regex(/^[a-z0-9-]*$/, "Lowercase letters, numbers and hyphens only").optional(),
  status: z.enum(["active", "inactive"]),
  moe_listed: z.boolean(),
  city: z.string().max(100).optional(),
  address: z.string().max(255).optional(),
  nearest_airport: z.string().max(150).optional(),
  website: z.string().max(190).optional(),
  apply_link: z.string().max(255).optional(),
  logo_path: z.string().max(500).optional(),
  cover_path: z.string().max(500).optional(),
  about: z.string().max(20000).optional(),
  requirements: z.array(z.object({ value: z.string().max(255) })),
  rep_name: z.string().max(150).optional(),
  rep_title: z.string().max(150).optional(),
  rep_photo: z.string().max(500).optional(),
})

type Values = z.infer<typeof schema>

function toValues(u?: University): Values {
  return {
    name: u?.name ?? "",
    code: u?.code ?? "",
    slug: u?.slug ?? "",
    status: (u?.status as "active" | "inactive") ?? "active",
    moe_listed: u?.moe_listed ?? false,
    city: u?.city ?? "",
    address: u?.address ?? "",
    nearest_airport: u?.nearest_airport ?? "",
    website: u?.website ?? "",
    apply_link: u?.apply_link ?? "",
    logo_path: u?.logo_path ?? "",
    cover_path: u?.cover_path ?? "",
    about: u?.about ?? "",
    requirements: (u?.requirements ?? []).map((value) => ({ value })),
    rep_name: u?.representative_professor?.name ?? "",
    rep_title: u?.representative_professor?.title ?? "",
    rep_photo: u?.representative_professor?.photo ?? "",
  }
}

function toPayload(v: Values): UniversityPayload {
  const requirements = v.requirements.map((r) => r.value.trim()).filter(Boolean)
  const rep = {
    name: v.rep_name?.trim() || null,
    title: v.rep_title?.trim() || null,
    photo: v.rep_photo?.trim() || null,
  }
  const hasRep = rep.name || rep.title || rep.photo

  return {
    name: v.name,
    code: v.code.toUpperCase(),
    slug: v.slug || undefined,
    status: v.status,
    moe_listed: v.moe_listed,
    city: v.city || undefined,
    address: v.address || undefined,
    nearest_airport: v.nearest_airport || undefined,
    website: v.website || undefined,
    apply_link: v.apply_link || undefined,
    logo_path: v.logo_path || undefined,
    cover_path: v.cover_path || undefined,
    about: v.about || undefined,
    requirements,
    representative_professor: hasRep ? rep : null,
  }
}

export default function UniversityFormDialog({
  open,
  onOpenChange,
  university,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  university?: University
}) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(university)

  const { register, control, handleSubmit, reset, setValue, watch, setError, formState: { errors } } =
    useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(university) })

  const { fields, append, remove } = useFieldArray({ control, name: "requirements" })

  // Reset the form whenever the dialog opens (so edit loads fresh values).
  useEffect(() => {
    if (open) reset(toValues(university))
  }, [open, university, reset])

  const mutation = useMutation({
    mutationFn: (payload: UniversityPayload) =>
      isEdit ? updateUniversity(university!.id, payload) : createUniversity(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["universities"] })
      if (isEdit) queryClient.invalidateQueries({ queryKey: ["university", String(university!.id)] })
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

  const moeListed = watch("moe_listed")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit university" : "New university"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the catalog and website content." : "Add a partner university to the catalog."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(toPayload(v)))} noValidate className="space-y-5">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>
          )}

          {/* Basics */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" error={errors.name?.message} className="sm:col-span-2">
              <Input id="uni-name" placeholder="Jilin Medical University" {...register("name")} />
            </Field>
            <Field label="Code" error={errors.code?.message}>
              <Input id="uni-code" placeholder="JLMU" className="uppercase" {...register("code")} />
            </Field>
            <Field label="Slug (URL)" error={errors.slug?.message} hint="Auto-generated if blank">
              <Input placeholder="jilin-medical-university" {...register("slug")} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-cas-navy" checked={moeListed} onChange={(e) => setValue("moe_listed", e.target.checked)} />
              MoE listed
            </label>
            <label className="flex items-center gap-2 text-sm">
              Status
              <select className="rounded-md border bg-background px-2 py-1 text-sm" {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          {/* Location */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City"><Input placeholder="Jilin City" {...register("city")} /></Field>
            <Field label="Nearest airport"><Input placeholder="Changchun Longjia (CGQ)" {...register("nearest_airport")} /></Field>
            <Field label="Address" className="sm:col-span-2"><Input placeholder="No. 5 Jilin Ave…" {...register("address")} /></Field>
          </div>

          {/* Web + images */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Website"><Input placeholder="www.jlmu.cn" {...register("website")} /></Field>
            <Field label="Apply link"><Input placeholder="https://apply.jlmu.cn" {...register("apply_link")} /></Field>
            <Field label="Logo URL" hint="Upload support coming soon"><Input placeholder="https://…/logo.webp" {...register("logo_path")} /></Field>
            <Field label="Cover image URL" hint="Upload support coming soon"><Input placeholder="https://…/cover.webp" {...register("cover_path")} /></Field>
          </div>

          {/* About */}
          <Field label="About" error={errors.about?.message}>
            <Textarea rows={4} placeholder="A leading medical university in…" {...register("about")} />
          </Field>

          {/* Requirements */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Admission requirements</Label>
              <button type="button" onClick={() => append({ value: "" })} className="inline-flex items-center gap-1 text-xs font-medium text-cas-navy hover:underline">
                <Plus className="size-3.5" /> Add
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {fields.length === 0 && <p className="text-sm text-muted-foreground">No requirements added.</p>}
              {fields.map((field, i) => (
                <div key={field.id} className="flex gap-2">
                  <Input placeholder="e.g. IELTS 6.0" {...register(`requirements.${i}.value`)} />
                  <Button type="button" size="icon" variant="ghost" aria-label={`Remove requirement ${i + 1}`} onClick={() => remove(i)}>
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Representative professor */}
          <div>
            <Label>Representative professor</Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <Input placeholder="Name" {...register("rep_name")} aria-label="Professor name" />
              <Input placeholder="Title" {...register("rep_title")} aria-label="Professor title" />
              <Input placeholder="Photo URL" {...register("rep_photo")} aria-label="Professor photo" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create university"}
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
  className,
  children,
}: {
  label: string
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      {/* Wrapping the control in the label gives implicit association (the
          label text becomes the control's accessible name). */}
      <Label className="block">
        <span className="mb-1.5 block">{label}</span>
        {children}
      </Label>
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
