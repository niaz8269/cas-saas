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
import { listCountries, updateStudent, type StudentSummary } from "@/features/crm/api"
import { ApiError } from "@/lib/api"

const schema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().max(190).optional(),
  phone: z.string().max(30).optional(),
  passport_no: z.string().max(50).optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  country_id: z.string().optional(),
})

type Values = z.infer<typeof schema>

function toValues(s: StudentSummary): Values {
  return {
    first_name: s.first_name ?? "",
    last_name: s.last_name ?? "",
    email: s.email ?? "",
    phone: s.phone ?? "",
    passport_no: s.passport_no ?? "",
    dob: s.dob ? s.dob.slice(0, 10) : "",
    gender: s.gender ?? "",
    country_id: s.country ? String(s.country.id) : "",
  }
}

export default function EditStudentDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: StudentSummary
}) {
  const queryClient = useQueryClient()

  const { register, handleSubmit, reset, setError, formState: { errors } } =
    useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(student) })

  useEffect(() => {
    if (open) reset(toValues(student))
  }, [open, student, reset])

  const countries = useQuery({
    queryKey: ["countries"],
    queryFn: listCountries,
    enabled: open,
    staleTime: 60 * 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: (v: Values) =>
      updateStudent(student.id, {
        first_name: v.first_name,
        last_name: v.last_name,
        email: v.email?.trim() || null,
        phone: v.phone?.trim() || null,
        passport_no: v.passport_no?.trim() || null,
        dob: v.dob || null,
        gender: v.gender || null,
        country_id: v.country_id ? Number(v.country_id) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", String(student.id)] })
      queryClient.invalidateQueries({ queryKey: ["students"] })
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
          <DialogTitle>Edit student</DialogTitle>
          <DialogDescription>Update the student's personal and contact details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" error={errors.first_name?.message}>
              <Input {...register("first_name")} />
            </Field>
            <Field label="Last name" error={errors.last_name?.message}>
              <Input {...register("last_name")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register("phone")} />
            </Field>
            <Field label="Passport no." error={errors.passport_no?.message}>
              <Input {...register("passport_no")} />
            </Field>
            <Field label="Date of birth" error={errors.dob?.message}>
              <Input type="date" {...register("dob")} />
            </Field>
            <Field label="Gender" error={errors.gender?.message}>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" {...register("gender")}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Country" error={errors.country_id?.message}>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" {...register("country_id")}>
                <option value="">—</option>
                {(countries.data?.data ?? []).map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="block">
        <span className="mb-1.5 block">{label}</span>
        {children}
      </Label>
      {error && <p role="alert" className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
