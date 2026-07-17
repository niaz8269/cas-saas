import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import { createUniversity } from "@/features/catalog/api"
import { ApiError } from "@/lib/api"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(190),
  code: z.string().min(1, "Code is required").max(40),
  city: z.string().max(100).optional(),
  website: z.string().max(190).optional(),
})

type Values = z.infer<typeof schema>

interface UniversityCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UniversityCreateDialog({
  open,
  onOpenChange,
}: UniversityCreateDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: createUniversity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["universities"] })
      reset()
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        for (const [field, messages] of Object.entries(error.errors)) {
          if (field === "name" || field === "code" || field === "city" || field === "website") {
            setError(field, { type: "server", message: messages[0] })
          }
        }
        return
      }
      setError("root", {
        type: "server",
        message: error instanceof ApiError ? error.message : "Something went wrong.",
      })
    },
  })

  const onSubmit = (values: Values) =>
    mutation.mutate({
      ...values,
      code: values.code.toUpperCase(),
      city: values.city || undefined,
      website: values.website || undefined,
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New university</DialogTitle>
          <DialogDescription>
            Add a partner university to the catalog.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="uni-name">Name</Label>
            <Input id="uni-name" placeholder="Jilin Medical University" {...register("name")} />
            {errors.name && (
              <p role="alert" className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="uni-code">Code</Label>
              <Input id="uni-code" placeholder="JLMU" className="uppercase" {...register("code")} />
              {errors.code && (
                <p role="alert" className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="uni-city">City</Label>
              <Input id="uni-city" placeholder="Jilin City" {...register("city")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="uni-website">Website</Label>
            <Input id="uni-website" placeholder="www.jlmu.cn" {...register("website")} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create university"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
