import { zodResolver } from "@hookform/resolvers/zod"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createAgreement, type Course } from "@/features/catalog/api"
import { useCatalogCreate } from "@/features/catalog/dialogs/useCatalogCreate"

const schema = z.object({
  commission_type: z.enum(["fixed", "percent", "tiered"]),
  commission_value: z.coerce.number().min(0, "Value must be positive"),
  currency: z.string().optional(),
  course_id: z.string().default("all"),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
})

type Values = z.infer<typeof schema>

interface AddAgreementDialogProps {
  universityId: number
  courses: Course[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddAgreementDialog({ universityId, courses, open, onOpenChange }: AddAgreementDialogProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { commission_type: "percent", course_id: "all" },
  })

  const mutation = useCatalogCreate({
    mutationFn: (values: Values) =>
      createAgreement({
        university_id: universityId,
        commission_type: values.commission_type,
        commission_value: values.commission_value,
        currency: values.currency ? values.currency.toUpperCase() : null,
        course_id: values.course_id === "all" ? null : Number(values.course_id),
        valid_from: values.valid_from || null,
        valid_to: values.valid_to || null,
      }),
    invalidateKey: ["university-agreements", universityId],
    onSuccess: () => {
      form.reset({ commission_type: "percent", course_id: "all" })
      onOpenChange(false)
    },
    onFieldError: (field, message) =>
      form.setError(field as keyof Values, { type: "server", message }),
    onRootError: (message) => form.setError("root", { type: "server", message }),
  })

  const type = form.watch("commission_type")
  const courseId = form.watch("course_id")
  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add commission agreement</DialogTitle>
          <DialogDescription>
            Drives expected commission for applications to this university.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(value) => form.setValue("commission_type", value as Values["commission_type"])}
              >
                <SelectTrigger aria-label="Commission type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="tiered">Tiered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agr-value">{type === "percent" ? "Percent (%)" : "Amount"}</Label>
              <Input id="agr-value" type="number" step="0.01" placeholder={type === "percent" ? "15" : "8000"} {...form.register("commission_value")} />
              {errors.commission_value && (
                <p role="alert" className="text-sm text-destructive">{errors.commission_value.message}</p>
              )}
            </div>
          </div>

          {type !== "percent" && (
            <div className="space-y-2">
              <Label htmlFor="agr-currency">Currency</Label>
              <Input id="agr-currency" maxLength={3} placeholder="CNY" className="uppercase" {...form.register("currency")} />
              {errors.currency && <p role="alert" className="text-sm text-destructive">{errors.currency.message}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label>Applies to</Label>
            <Select value={courseId} onValueChange={(value) => form.setValue("course_id", value)}>
              <SelectTrigger aria-label="Applies to"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={String(course.id)}>{course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="agr-from">Valid from</Label>
              <Input id="agr-from" type="date" {...form.register("valid_from")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agr-to">Valid to</Label>
              <Input id="agr-to" type="date" {...form.register("valid_to")} />
              {errors.valid_to && <p role="alert" className="text-sm text-destructive">{errors.valid_to.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Adding…" : "Add agreement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
