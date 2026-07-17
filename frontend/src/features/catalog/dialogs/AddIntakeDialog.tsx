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
import { createIntake, type Program } from "@/features/catalog/api"
import { useCatalogCreate } from "@/features/catalog/dialogs/useCatalogCreate"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  program_id: z.string().default("all"),
  start_date: z.string().optional(),
  application_deadline: z.string().optional(),
  seats: z.coerce.number().int().min(0).optional(),
})

type Values = z.infer<typeof schema>

interface AddIntakeDialogProps {
  universityId: number
  programs: Program[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddIntakeDialog({ universityId, programs, open, onOpenChange }: AddIntakeDialogProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { program_id: "all" },
  })

  const mutation = useCatalogCreate({
    mutationFn: (values: Values) =>
      createIntake({
        university_id: universityId,
        name: values.name,
        program_id: values.program_id === "all" ? null : Number(values.program_id),
        start_date: values.start_date || null,
        application_deadline: values.application_deadline || null,
        seats: values.seats ?? null,
      }),
    invalidateKey: ["university-intakes", universityId],
    onSuccess: () => {
      form.reset({ program_id: "all" })
      onOpenChange(false)
    },
    onFieldError: (field, message) =>
      form.setError(field as keyof Values, { type: "server", message }),
    onRootError: (message) => form.setError("root", { type: "server", message }),
  })

  const programId = form.watch("program_id")
  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add intake</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="intake-name">Name</Label>
            <Input id="intake-name" placeholder="September 2026" {...form.register("name")} />
            {errors.name && <p role="alert" className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Program</Label>
            <Select value={programId} onValueChange={(value) => form.setValue("program_id", value)}>
              <SelectTrigger aria-label="Program"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programs (university-wide)</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={String(program.id)}>{program.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="intake-start">Start date</Label>
              <Input id="intake-start" type="date" {...form.register("start_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intake-deadline">Application deadline</Label>
              <Input id="intake-deadline" type="date" {...form.register("application_deadline")} />
              {errors.application_deadline && (
                <p role="alert" className="text-sm text-destructive">{errors.application_deadline.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="intake-seats">Seats</Label>
            <Input id="intake-seats" type="number" placeholder="100" {...form.register("seats")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Adding…" : "Add intake"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
