import { zodResolver } from "@hookform/resolvers/zod"
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
import { createCourse } from "@/features/catalog/api"
import { useCatalogCreate } from "@/features/catalog/dialogs/useCatalogCreate"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(190),
  level: z.enum(["bachelor", "master", "phd"]),
  duration_months: z.coerce.number().int().min(1).max(120).optional(),
  tuition_fee: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).default("CNY"),
})

type Values = z.infer<typeof schema>

interface AddCourseDialogProps {
  universityId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddCourseDialog({ universityId, open, onOpenChange }: AddCourseDialogProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { level: "bachelor", currency: "CNY" },
  })

  const mutation = useCatalogCreate({
    mutationFn: (values: Values) => createCourse({ ...values, university_id: universityId }),
    invalidateKey: ["university-courses", universityId],
    onSuccess: () => {
      form.reset({ level: "bachelor", currency: "CNY" })
      onOpenChange(false)
    },
    onFieldError: (field, message) =>
      form.setError(field as keyof Values, { type: "server", message }),
    onRootError: (message) => form.setError("root", { type: "server", message }),
  })

  const level = form.watch("level")
  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add course</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="course-name">Name</Label>
            <Input id="course-name" placeholder="MBBS" {...form.register("name")} />
            {errors.name && <p role="alert" className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={level} onValueChange={(value) => form.setValue("level", value as Values["level"])}>
                <SelectTrigger aria-label="Level"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bachelor">Bachelor</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="phd">PhD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-duration">Duration (months)</Label>
              <Input id="course-duration" type="number" placeholder="72" {...form.register("duration_months")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="course-fee">Tuition / year</Label>
              <Input id="course-fee" type="number" placeholder="30000" {...form.register("tuition_fee")} />
              {errors.tuition_fee && <p role="alert" className="text-sm text-destructive">{errors.tuition_fee.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-currency">Currency</Label>
              <Input id="course-currency" maxLength={3} className="uppercase" {...form.register("currency")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Adding…" : "Add course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
