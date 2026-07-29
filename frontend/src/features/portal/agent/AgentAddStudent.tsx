import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft } from "lucide-react"
import { useMemo, useState, type ComponentProps } from "react"
import { useForm, type Path } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createAgentStudent, getApplyCountries, type AgentCreateStudentPayload } from "@/features/portal/api"
import { PageTitle } from "@/features/portal/components"
import { ApiError } from "@/lib/api"

type Values = {
  first_name: string
  last_name: string
  email: string
  phone: string
  passport_no: string
  dob: string
  gender: string
  country_id: string
}

const FIELDS = ["first_name", "last_name", "email", "phone", "passport_no", "dob", "gender", "country_id"] as const

/** Drop the blanks — the API treats every optional field as nullable. */
function toPayload(v: Values): AgentCreateStudentPayload {
  return {
    first_name: v.first_name.trim(),
    last_name: v.last_name.trim(),
    ...(v.email.trim() ? { email: v.email.trim() } : {}),
    ...(v.phone.trim() ? { phone: v.phone.trim() } : {}),
    ...(v.passport_no.trim() ? { passport_no: v.passport_no.trim() } : {}),
    ...(v.dob ? { dob: v.dob } : {}),
    ...(v.gender ? { gender: v.gender as "male" | "female" | "other" } : {}),
    ...(v.country_id ? { country_id: Number(v.country_id) } : {}),
  }
}

/**
 * Partner "add student" form (report §5.7 "submit students"). Single column,
 * grouped in one card per the design system; names are the only required
 * fields, matching the server contract. A 409 DUPLICATE is surfaced as a
 * banner rather than a field error — it is about the person, not one input.
 */
export default function AgentAddStudent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [duplicate, setDuplicate] = useState<string | null>(null)

  const countries = useQuery({ queryKey: ["agent", "countries"], queryFn: () => getApplyCountries("agent") })

  const schema = useMemo(
    () =>
      z.object({
        first_name: z.string().trim().min(1, t("agentPortal.addStudent.errorFirstName")),
        last_name: z.string().trim().min(1, t("agentPortal.addStudent.errorLastName")),
        email: z.string().trim().email(t("portal.errorEmailInvalid")).or(z.literal("")),
        phone: z.string(),
        passport_no: z.string(),
        dob: z.string(),
        gender: z.string(),
        country_id: z.string(),
      }),
    [t],
  )

  const { register, handleSubmit, setError, setValue, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", last_name: "", email: "", phone: "", passport_no: "", dob: "", gender: "", country_id: "" },
  })

  const mutation = useMutation({
    mutationFn: (v: Values) => createAgentStudent(toPayload(v)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agent", "students"] })
      navigate("/portal/agent/students", { replace: true })
    },
    onError: (e) => {
      setDuplicate(null)

      if (e instanceof ApiError && e.status === 409) {
        setDuplicate(e.message)
        return
      }

      if (e instanceof ApiError && e.status === 422) {
        for (const [field, messages] of Object.entries(e.errors)) {
          if ((FIELDS as readonly string[]).includes(field)) {
            setError(field as Path<Values>, { type: "server", message: messages[0] })
          }
        }
        if (!Object.keys(e.errors).length) setError("root", { type: "server", message: e.message })
        return
      }

      setError("root", { type: "server", message: t("portal.errorServerUnreachable") })
    },
  })

  return (
    <div>
      <Button variant="ghost" size="sm" className="-ms-2 mb-2 gap-1" onClick={() => navigate("/portal/agent/students")}>
        <ChevronLeft className="size-4" /> {t("agentPortal.addStudent.back")}
      </Button>

      <PageTitle title={t("agentPortal.addStudent.title")} subtitle={t("agentPortal.addStudent.subtitle")} />

      <form
        onSubmit={handleSubmit((v) => { setDuplicate(null); mutation.mutate(v) })}
        noValidate
        className="space-y-4 rounded-xl border bg-card p-4 shadow-sm"
      >
        {duplicate && (
          <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{duplicate}</p>
        )}
        {errors.root && (
          <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="first_name" label={t("agentPortal.addStudent.firstName")} error={errors.first_name?.message} autoComplete="given-name" {...register("first_name")} />
          <Field id="last_name" label={t("agentPortal.addStudent.lastName")} error={errors.last_name?.message} autoComplete="family-name" {...register("last_name")} />
        </div>

        <Field id="email" type="email" label={t("agentPortal.addStudent.email")} hint={t("agentPortal.addStudent.contactHint")} error={errors.email?.message} inputMode="email" {...register("email")} />
        <Field id="phone" type="tel" label={t("agentPortal.addStudent.phone")} error={errors.phone?.message} {...register("phone")} />
        <Field id="passport_no" label={t("agentPortal.addStudent.passport")} error={errors.passport_no?.message} {...register("passport_no")} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="dob" type="date" label={t("agentPortal.addStudent.dob")} error={errors.dob?.message} {...register("dob")} />

          <div className="space-y-2">
            <Label htmlFor="gender">{t("agentPortal.addStudent.gender")}</Label>
            <Select value={watch("gender")} onValueChange={(v) => setValue("gender", v, { shouldValidate: true })}>
              <SelectTrigger id="gender" aria-label={t("agentPortal.addStudent.gender")}>
                <SelectValue placeholder={t("agentPortal.addStudent.selectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t("agentPortal.addStudent.genderMale")}</SelectItem>
                <SelectItem value="female">{t("agentPortal.addStudent.genderFemale")}</SelectItem>
                <SelectItem value="other">{t("agentPortal.addStudent.genderOther")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="country_id">{t("agentPortal.addStudent.country")}</Label>
          <Select value={watch("country_id")} onValueChange={(v) => setValue("country_id", v, { shouldValidate: true })}>
            <SelectTrigger id="country_id" aria-label={t("agentPortal.addStudent.country")}>
              <SelectValue placeholder={t("agentPortal.addStudent.selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {(countries.data?.data ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.country_id && <p role="alert" className="text-sm text-destructive">{errors.country_id.message}</p>}
        </div>

        <Button type="submit" className="h-11 w-full" disabled={mutation.isPending}>
          {mutation.isPending ? t("agentPortal.addStudent.submitting") : t("agentPortal.addStudent.submit")}
        </Button>
      </form>
    </div>
  )
}

const Field = ({ id, label, error, hint, ...props }: { id: string; label: string; error?: string; hint?: string } & ComponentProps<typeof Input>) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} aria-invalid={error ? true : undefined} {...props} />
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>
)
