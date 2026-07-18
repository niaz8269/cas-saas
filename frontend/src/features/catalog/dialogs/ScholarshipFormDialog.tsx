import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import { Textarea } from "@/components/ui/textarea"
import {
  createScholarship,
  updateScholarship,
  type Scholarship,
} from "@/features/catalog/api"
import { ApiError } from "@/lib/api"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(190),
  type: z.string().max(60).optional(),
  status: z.enum(["active", "inactive"]),
  coverage: z.string().max(120).optional(),
  amount: z.string().optional(),
  tuition_after: z.string().optional(),
  hostel_after: z.string().optional(),
  stipend_monthly: z.string().optional(),
  currency: z.string().max(3).optional(),
  deadline: z.string().optional(),
  description: z.string().max(20000).optional(),
  eligibility: z.string().max(20000).optional(),
  how_to_apply: z.string().max(20000).optional(),
  apply_link: z.string().max(255).optional(),
})

type Values = z.infer<typeof schema>

function toValues(s?: Scholarship): Values {
  return {
    name: s?.name ?? "",
    type: s?.type ?? "",
    status: (s?.status as "active" | "inactive") ?? "active",
    coverage: s?.coverage ?? "",
    amount: s?.amount != null ? String(s.amount) : "",
    tuition_after: s?.tuition_after != null ? String(s.tuition_after) : "",
    hostel_after: s?.hostel_after != null ? String(s.hostel_after) : "",
    stipend_monthly: s?.stipend_monthly != null ? String(s.stipend_monthly) : "",
    currency: s?.currency ?? "",
    deadline: s?.deadline ?? "",
    description: s?.description ?? "",
    eligibility: s?.eligibility ?? "",
    how_to_apply: s?.how_to_apply ?? "",
    apply_link: s?.apply_link ?? "",
  }
}

export default function ScholarshipFormDialog({
  universityId,
  scope = "university",
  scholarship,
  open,
  onOpenChange,
}: {
  universityId?: number
  scope?: "university" | "government"
  scholarship?: Scholarship
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(scholarship)
  const isGovernment = scope === "government"

  const { register, handleSubmit, reset, setError, formState: { errors } } =
    useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(scholarship) })

  useEffect(() => {
    if (open) reset(toValues(scholarship))
  }, [open, scholarship, reset])

  const mutation = useMutation({
    mutationFn: (v: Values) => {
      const payload: Record<string, unknown> = {
        scope,
        university_id: isGovernment ? null : universityId,
        name: v.name,
        type: v.type || null,
        status: v.status,
        coverage: v.coverage || null,
        amount: v.amount ? Number(v.amount) : null,
        tuition_after: v.tuition_after ? Number(v.tuition_after) : null,
        hostel_after: v.hostel_after ? Number(v.hostel_after) : null,
        stipend_monthly: v.stipend_monthly ? Number(v.stipend_monthly) : null,
        currency: v.currency || null,
        deadline: v.deadline || null,
        description: v.description || null,
        eligibility: v.eligibility || null,
        how_to_apply: v.how_to_apply || null,
        apply_link: v.apply_link || null,
      }

      return isEdit ? updateScholarship(scholarship!.id, payload) : createScholarship(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: isGovernment ? ["scholarships", "government"] : ["university-scholarships", universityId],
      })
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        for (const [field, messages] of Object.entries(error.errors)) {
          if (field in schema.shape) setError(field as keyof Values, { type: "server", message: messages[0] })
        }

        return
      }
      setError("root", { type: "server", message: error instanceof ApiError ? error.message : "Something went wrong." })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "Add"} {isGovernment ? "government scholarship" : "scholarship"}</DialogTitle>
          <DialogDescription>
            {isGovernment
              ? "A national/government award (e.g. CSC), not tied to a single university."
              : "Details shown on the scholarship's website page."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>
          )}

          <Field label="Name" error={errors.name?.message}>
            <Input placeholder="Belt & Road Scholarship" {...register("name")} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><Input placeholder="full / partial / merit" {...register("type")} /></Field>
            <Field label="Deadline"><Input type="date" {...register("deadline")} /></Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Coverage" className="col-span-1"><Input placeholder="Full tuition" {...register("coverage")} /></Field>
            <Field label="Amount"><Input inputMode="decimal" placeholder="30000" {...register("amount")} /></Field>
            <Field label="Currency"><Input placeholder="CNY" className="uppercase" {...register("currency")} /></Field>
          </div>

          <div className="rounded-lg border p-3">
            <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Student benefits (with this scholarship)</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tuition after"><Input type="number" placeholder="0" {...register("tuition_after")} /></Field>
              <Field label="Hostel after"><Input type="number" placeholder="0" {...register("hostel_after")} /></Field>
              <Field label="Stipend / month"><Input type="number" placeholder="0" {...register("stipend_monthly")} /></Field>
            </div>
          </div>

          <Field label="Description"><Textarea rows={3} placeholder="A flagship scholarship for…" {...register("description")} /></Field>
          <Field label="Eligibility"><Textarea rows={2} placeholder="Open to first-year international undergraduates…" {...register("eligibility")} /></Field>
          <Field label="How to apply"><Textarea rows={2} placeholder="Apply through your CAS counselor…" {...register("how_to_apply")} /></Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Apply link"><Input placeholder="https://apply…" {...register("apply_link")} /></Field>
            <Field label="Status">
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add scholarship"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="block">
        <span className="mb-1.5 block">{label}</span>
        {children}
      </Label>
      {error && <p role="alert" className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
