import { useMutation } from "@tanstack/react-query"
import { CheckCircle2, Send } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { postEnquiry, SiteApiError, type EnquiryPayload } from "@/features/site/api"

/**
 * Compact hero lead-capture panel (the reference's docked "Leave a message"
 * card). Posts to the same /public/enquiries path as the full EnquiryForm, so
 * submissions land as source-tagged CRM leads; includes the honeypot field.
 */
export default function SiteLeadPanel() {
  const [values, setValues] = useState({ first_name: "", email: "", message: "" })
  const [company, setCompany] = useState("") // honeypot
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }))

  const mutation = useMutation({
    mutationFn: () =>
      postEnquiry({
        first_name: values.first_name,
        email: values.email || undefined,
        message: values.message || undefined,
        source_url: typeof window !== "undefined" ? window.location.href : undefined,
        ...(company ? { company } : {}),
      } as EnquiryPayload & { company?: string }),
    onError: (err) => setErrors(err instanceof SiteApiError ? err.errors : {}),
  })

  return (
    <div className="w-full rounded-2xl border border-white/15 bg-card p-5 text-left shadow-2xl">
      {mutation.isSuccess ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-green-600" />
          <h2 className="mt-3 text-base font-semibold text-ink">Thank you!</h2>
          <p className="mt-1 text-sm text-muted-foreground">A CAS advisor will be in touch shortly.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-cas-navy text-white">
              <Send className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">Leave a message</h2>
              <p className="text-xs text-muted-foreground">Free guidance — we reply within a day.</p>
            </div>
          </div>

          <form
            className="mt-4 space-y-2.5"
            onSubmit={(e) => { e.preventDefault(); setErrors({}); mutation.mutate() }}
            noValidate
          >
            {mutation.isError && Object.keys(errors).length === 0 && (
              <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-xs text-destructive">
                Something went wrong. Please try again.
              </p>
            )}
            <div>
              <Input value={values.first_name} onChange={set("first_name")} placeholder="Your name" autoComplete="given-name" aria-label="Your name" />
              {errors.first_name?.[0] && <p role="alert" className="mt-1 text-xs text-destructive">{errors.first_name[0]}</p>}
            </div>
            <div>
              <Input type="email" value={values.email} onChange={set("email")} placeholder="Email" autoComplete="email" inputMode="email" aria-label="Email" />
              {errors.email?.[0] && <p role="alert" className="mt-1 text-xs text-destructive">{errors.email[0]}</p>}
            </div>
            <Textarea rows={3} value={values.message} onChange={set("message")} placeholder="What would you like to study?" aria-label="Message" />

            {/* Honeypot — hidden, off tab order. */}
            <div className="hidden" aria-hidden="true">
              <label>Company<input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} /></label>
            </div>

            <Button type="submit" className="h-10 w-full" disabled={mutation.isPending}>
              <Send className="size-4" /> {mutation.isPending ? "Sending…" : "Send message"}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">Free · no obligation</p>
          </form>
        </>
      )}
    </div>
  )
}
