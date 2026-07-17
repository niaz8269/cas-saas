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
import { createScholarship } from "@/features/catalog/api"
import { useCatalogCreate } from "@/features/catalog/dialogs/useCatalogCreate"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(190),
  type: z.string().max(60).optional(),
  coverage: z.string().max(120).optional(),
  deadline: z.string().optional(),
})

type Values = z.infer<typeof schema>

interface AddScholarshipDialogProps {
  universityId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddScholarshipDialog({ universityId, open, onOpenChange }: AddScholarshipDialogProps) {
  const form = useForm<Values>({ resolver: zodResolver(schema) })

  const mutation = useCatalogCreate({
    mutationFn: (values: Values) =>
      createScholarship({
        university_id: universityId,
        name: values.name,
        type: values.type || null,
        coverage: values.coverage || null,
        deadline: values.deadline || null,
      }),
    invalidateKey: ["university-scholarships", universityId],
    onSuccess: () => {
      form.reset()
      onOpenChange(false)
    },
    onFieldError: (field, message) =>
      form.setError(field as keyof Values, { type: "server", message }),
    onRootError: (message) => form.setError("root", { type: "server", message }),
  })

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add scholarship</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="sch-name">Name</Label>
            <Input id="sch-name" placeholder="Presidential Scholarship" {...form.register("name")} />
            {errors.name && <p role="alert" className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sch-type">Type</Label>
              <Input id="sch-type" placeholder="full / partial / merit" {...form.register("type")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sch-deadline">Deadline</Label>
              <Input id="sch-deadline" type="date" {...form.register("deadline")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sch-coverage">Coverage</Label>
            <Input id="sch-coverage" placeholder="Full tuition" {...form.register("coverage")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Adding…" : "Add scholarship"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
