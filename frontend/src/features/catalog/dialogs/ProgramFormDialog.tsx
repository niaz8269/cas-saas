import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
import { createProgram, updateProgram, type Program } from "@/features/catalog/api"
import { ApiError } from "@/lib/api"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(190),
  level: z.enum(["bachelor", "master", "phd"]),
  duration_months: z.string().optional(),
  tuition_fee: z.string().optional(),
  currency: z.string().max(3).optional(),
  teaching_language: z.string().max(60).optional(),
  apply_link: z.string().max(255).optional(),
})

type Values = z.infer<typeof schema>

function toValues(p?: Program): Values {
  return {
    name: p?.name ?? "",
    level: (p?.level as Values["level"]) ?? "bachelor",
    duration_months: p?.duration_months != null ? String(p.duration_months) : "",
    tuition_fee: p?.tuition_fee != null ? String(p.tuition_fee) : "",
    currency: p?.currency ?? "CNY",
    teaching_language: p?.teaching_language ?? "",
    apply_link: p?.apply_link ?? "",
  }
}

export default function ProgramFormDialog({
  universityId,
  program,
  open,
  onOpenChange,
}: {
  universityId: number
  program?: Program
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(program)

  const { register, handleSubmit, reset, setError, setValue, watch, formState: { errors } } =
    useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(program) })

  useEffect(() => {
    if (open) reset(toValues(program))
  }, [open, program, reset])

  const level = watch("level")

  const mutation = useMutation({
    mutationFn: (v: Values) => {
      const payload: Record<string, unknown> = {
        university_id: universityId,
        name: v.name,
        level: v.level,
        duration_months: v.duration_months ? Number(v.duration_months) : null,
        tuition_fee: v.tuition_fee ? Number(v.tuition_fee) : null,
        currency: v.currency || "CNY",
        teaching_language: v.teaching_language || null,
        apply_link: v.apply_link || null,
      }

      return isEdit ? updateProgram(program!.id, payload) : createProgram(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["university-programs", universityId] })
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit program" : "Add program"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="program-name">Name</Label>
            <Input id="program-name" placeholder="MBBS" {...register("name")} />
            {errors.name && <p role="alert" className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={level} onValueChange={(value) => setValue("level", value as Values["level"])}>
                <SelectTrigger aria-label="Level"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bachelor">Bachelor</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="phd">PhD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-duration">Duration (months)</Label>
              <Input id="program-duration" type="number" placeholder="72" {...register("duration_months")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="program-fee">Tuition / year</Label>
              <Input id="program-fee" type="number" placeholder="30000" {...register("tuition_fee")} />
              {errors.tuition_fee && <p role="alert" className="text-sm text-destructive">{errors.tuition_fee.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-currency">Currency</Label>
              <Input id="program-currency" maxLength={3} className="uppercase" {...register("currency")} />
              {errors.currency && <p role="alert" className="text-sm text-destructive">{errors.currency.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="program-language">Teaching language</Label>
              <Input id="program-language" placeholder="English" {...register("teaching_language")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-apply-link">Apply link</Label>
              <Input id="program-apply-link" placeholder="https://…" {...register("apply_link")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add program"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
