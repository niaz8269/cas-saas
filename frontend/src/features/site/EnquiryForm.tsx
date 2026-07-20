import { useMutation } from "@tanstack/react-query"
import { CheckCircle2, Send } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { postEnquiry, SiteApiError, type EnquiryPayload } from "@/features/site/api"

/**
 * Public enquiry form. Posts to /public/enquiries which always returns a
 * generic acknowledgement — so we simply show a thank-you on success.
 * Includes a hidden honeypot field the backend uses to drop bots.
 */
export default function EnquiryForm({
  universityId,
  universityName,
}: {
  universityId?: number
  universityName?: string
}) {
  const [values, setValues] = useState({ first_name: "", last_name: "", email: "", phone: "", message: "" })
  const [company, setCompany] = useState("") // honeypot
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }))

  const mutation = useMutation({
    mutationFn: () => {
      const payload: EnquiryPayload = {
        first_name: values.first_name,
        last_name: values.last_name || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        message: values.message || undefined,
        interested_university_id: universityId,
        source_url: typeof window !== "undefined" ? window.location.href : undefined,
        ...(company ? { company } : {}),
      } as EnquiryPayload & { company?: string }

      return postEnquiry(payload)
    },
    onError: (err) => setFieldErrors(err instanceof SiteApiError ? err.errors : {}),
  })

  if (mutation.isSuccess) {
    return (
      <div className="rounded-sm border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-10 text-green-600" />
        <h2 className="mt-3 text-lg font-semibold">Thank you!</h2>
        <p className="mt-1 text-sm text-muted-foreground">A CAS advisor will be in touch with you shortly.</p>
      </div>
    )
  }

  return (
    <div id="enquire" className="rounded-sm border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-cas-navy">Enquire{universityName ? ` about ${universityName}` : ""}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Leave your details and a CAS advisor will guide you through the next steps.</p>

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => { e.preventDefault(); setFieldErrors({}); mutation.mutate() }}
        noValidate
      >
        {mutation.isError && Object.keys(fieldErrors).length === 0 && (
          <p role="alert" className="rounded-sm bg-cas-red-50 px-3 py-2 text-sm text-destructive">
            Something went wrong. Please try again.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name" error={fieldErrors.first_name?.[0]}>
            <Input value={values.first_name} onChange={set("first_name")} autoComplete="given-name" />
          </FormField>
          <FormField label="Last name">
            <Input value={values.last_name} onChange={set("last_name")} autoComplete="family-name" />
          </FormField>
          <FormField label="Email" error={fieldErrors.email?.[0]}>
            <Input type="email" value={values.email} onChange={set("email")} autoComplete="email" inputMode="email" />
          </FormField>
          <FormField label="Phone" error={fieldErrors.phone?.[0]}>
            <Input value={values.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" />
          </FormField>
        </div>

        <FormField label="Message">
          <Textarea rows={3} value={values.message} onChange={set("message")} placeholder="Tell us what you're interested in…" />
        </FormField>

        {/* Honeypot — hidden from users, off the tab order. */}
        <div className="hidden" aria-hidden="true">
          <label>Company<input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} /></label>
        </div>

        <Button type="submit" className="h-11 w-full sm:w-auto" disabled={mutation.isPending}>
          <Send className="size-4" />
          {mutation.isPending ? "Sending…" : "Send enquiry"}
        </Button>
      </form>
    </div>
  )
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
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
