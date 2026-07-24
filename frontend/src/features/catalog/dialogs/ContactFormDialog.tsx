import { zodResolver } from "@hookform/resolvers/zod"
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
import { createContact, updateContact, type UniversityContact } from "@/features/catalog/api"
import { useCatalogCreate } from "@/features/catalog/dialogs/useCatalogCreate"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  email: z.string().email("Enter a valid email").max(190).optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  role: z.string().max(80).optional(),
})

type Values = z.infer<typeof schema>

const EMPTY: Values = { name: "", email: "", phone: "", role: "" }

interface ContactFormDialogProps {
  universityId: number
  /** When set, the dialog edits this contact; otherwise it creates a new one. */
  contact?: UniversityContact
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ContactFormDialog({ universityId, contact, open, onOpenChange }: ContactFormDialogProps) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  // Load the record into the form each time the dialog opens (or the target changes).
  useEffect(() => {
    if (open) {
      form.reset(
        contact
          ? { name: contact.name, email: contact.email ?? "", phone: contact.phone ?? "", role: contact.role ?? "" }
          : EMPTY,
      )
    }
  }, [open, contact, form])

  const mutation = useCatalogCreate({
    mutationFn: (values: Values) => {
      const payload = {
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        role: values.role || null,
      }

      return contact ? updateContact(contact.id, payload) : createContact(universityId, payload)
    },
    invalidateKey: ["university", String(universityId)],
    onSuccess: () => onOpenChange(false),
    onFieldError: (field, message) => form.setError(field as keyof Values, { type: "server", message }),
    onRootError: (message) => form.setError("root", { type: "server", message }),
  })

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit contact" : "Add contact"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="contact-name">Name</Label>
            <Input id="contact-name" placeholder="Ms. Chen Li" {...form.register("name")} />
            {errors.name && <p role="alert" className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-role">Role</Label>
            <Input id="contact-role" placeholder="International Admissions" {...form.register("role")} />
            {errors.role && <p role="alert" className="text-sm text-destructive">{errors.role.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input id="contact-email" type="email" placeholder="admissions@uni.edu.cn" {...form.register("email")} />
              {errors.email && <p role="alert" className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input id="contact-phone" placeholder="+86 10 1234 5678" {...form.register("phone")} />
              {errors.phone && <p role="alert" className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : contact ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
