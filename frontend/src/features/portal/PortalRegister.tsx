import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { CheckCircle2 } from "lucide-react"
import { useEffect, useMemo, useState, type ComponentProps } from "react"
import { useForm, type FieldValues, type Path, type UseFormSetError } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthShell, PasswordInput } from "@/features/auth/AuthShell"
import { agentRegister, getPublicCountries, portalRegister } from "@/features/portal/api"
import { ApiError } from "@/lib/api"
import { usePortalAuthStore } from "@/stores/portalAuth"
import { cn } from "@/lib/utils"

type Kind = "student" | "agent"

/** Map a 422 response onto the RHF fields, or the root message. */
function applyServerErrors<T extends FieldValues>(
  error: unknown,
  fields: readonly string[],
  setError: UseFormSetError<T>,
  fallback: string,
): void {
  if (error instanceof ApiError && error.status === 422) {
    for (const [field, messages] of Object.entries(error.errors)) {
      if (fields.includes(field)) setError(field as Path<T>, { type: "server", message: messages[0] })
    }
    if (!Object.keys(error.errors).length) setError("root" as Path<T>, { type: "server", message: error.message })
    return
  }
  setError("root" as Path<T>, { type: "server", message: fallback })
}

export default function PortalRegister() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = usePortalAuthStore((s) => s.token)
  const kindInStore = usePortalAuthStore((s) => s.kind)
  const [params] = useSearchParams()
  const [kind, setKind] = useState<Kind>(params.get("as") === "agent" ? "agent" : "student")

  useEffect(() => {
    if (token && kindInStore) navigate(`/portal/${kindInStore}`, { replace: true })
  }, [token, kindInStore, navigate])

  return (
    <AuthShell
      wide
      audience={kind}
      title={t(kind === "student" ? "portal.register.studentTitle" : "portal.register.agentTitle")}
      subtitle={t(kind === "student" ? "portal.register.studentSubtitle" : "portal.register.agentSubtitle")}
      footer={
        <>
          {t("portal.register.haveAccount")}{" "}
          <Link to="/portal/login" className="font-medium text-cas-navy hover:underline">{t("portal.register.signIn")}</Link>
        </>
      }
    >
      <div role="tablist" aria-label={t("portal.register.asAria")} className="grid grid-cols-2 gap-1 rounded-lg bg-subtle p-1">
            {(["student", "agent"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-md py-2 text-sm font-medium transition-colors",
                  kind === k ? "bg-card text-cas-navy shadow-sm" : "text-muted-foreground",
                )}
              >
                {t(k === "student" ? "portal.roleStudent" : "portal.roleAgent")}
              </button>
            ))}
          </div>


      {kind === "student" ? <StudentForm /> : <AgentForm />}
    </AuthShell>
  )
}

// ── Student ───────────────────────────────────────────────────────────────

type StudentValues = { first_name: string; last_name: string; email: string; phone: string; password: string; password_confirmation: string }
const STUDENT_FIELDS = ["first_name", "last_name", "email", "phone", "password", "password_confirmation"] as const

function StudentForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setAuth = usePortalAuthStore((s) => s.setAuth)

  const schema = useMemo(
    () =>
      z
        .object({
          first_name: z.string().min(1, t("portal.register.errorFirstName")),
          last_name: z.string().min(1, t("portal.register.errorLastName")),
          email: z.string().min(1, t("portal.errorEmailRequired")).email(t("portal.errorEmailInvalid")),
          phone: z.string().min(1, t("portal.register.errorPhone")),
          password: z.string().min(8, t("portal.register.errorPasswordMin")),
          password_confirmation: z.string(),
        })
        .refine((d) => d.password === d.password_confirmation, {
          message: t("portal.register.errorPasswordMatch"),
          path: ["password_confirmation"],
        }),
    [t],
  )

  const { register, handleSubmit, setError, formState: { errors } } = useForm<StudentValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", last_name: "", email: "", phone: "", password: "", password_confirmation: "" },
  })

  const mutation = useMutation({
    mutationFn: (v: StudentValues) => portalRegister(v),
    onSuccess: (res) => {
      const s = res.student
      setAuth(res.token, "student", { id: s.id, name: s.full_name, email: s.email, status: s.status, code: s.student_code, email_verified: s.email_verified })
      navigate("/portal/student", { replace: true })
    },
    onError: (e) => applyServerErrors<StudentValues>(e, STUDENT_FIELDS, setError, t("portal.errorServerUnreachable")),
  })

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="mt-4 grid gap-x-3 gap-y-2.5 sm:grid-cols-2">
      {errors.root && <p role="alert" className="sm:col-span-2 rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>}

      <Field id="first_name" label={t("portal.register.firstName")} error={errors.first_name?.message} autoComplete="given-name" {...register("first_name")} />
      <Field id="last_name" label={t("portal.register.lastName")} error={errors.last_name?.message} autoComplete="family-name" {...register("last_name")} />
      <Field id="email" type="email" label={t("portal.email")} error={errors.email?.message} autoComplete="email" inputMode="email" {...register("email")} />
      <Field id="phone" type="tel" label={t("portal.register.phone")} error={errors.phone?.message} autoComplete="tel" {...register("phone")} />
      <Field id="password" type="password" label={t("portal.password")} error={errors.password?.message} autoComplete="new-password" {...register("password")} />
      <Field id="password_confirmation" type="password" label={t("portal.register.confirmPassword")} error={errors.password_confirmation?.message} autoComplete="new-password" {...register("password_confirmation")} />

      <Button type="submit" className="mt-1 h-10 w-full sm:col-span-2" disabled={mutation.isPending}>
        {mutation.isPending ? t("portal.register.submitting") : t("portal.register.submit")}
      </Button>
    </form>
  )
}

// ── Agent / partner ─────────────────────────────────────────────────────────

type AgentValues = {
  company_name: string; contact_name: string; email: string; phone: string
  website: string; country_id: string; address: string; password: string; password_confirmation: string
}
const AGENT_FIELDS = ["company_name", "contact_name", "email", "phone", "website", "country_id", "address", "password", "password_confirmation"] as const

function AgentForm() {
  const { t } = useTranslation()
  const [submitted, setSubmitted] = useState(false)

  const countries = useQuery({ queryKey: ["public-countries"], queryFn: getPublicCountries })

  const schema = useMemo(
    () =>
      z
        .object({
          company_name: z.string().min(1, t("portal.register.errorCompanyName")),
          contact_name: z.string().min(1, t("portal.register.errorContactName")),
          email: z.string().min(1, t("portal.errorEmailRequired")).email(t("portal.errorEmailInvalid")),
          phone: z.string().min(1, t("portal.register.errorPhone")),
          website: z.string().min(1, t("portal.register.errorWebsite")),
          country_id: z.string().min(1, t("portal.register.errorCountry")),
          address: z.string().min(1, t("portal.register.errorAddress")),
          password: z.string().min(8, t("portal.register.errorPasswordMin")),
          password_confirmation: z.string(),
        })
        .refine((d) => d.password === d.password_confirmation, {
          message: t("portal.register.errorPasswordMatch"),
          path: ["password_confirmation"],
        }),
    [t],
  )

  const { register, handleSubmit, setError, setValue, watch, formState: { errors } } = useForm<AgentValues>({
    resolver: zodResolver(schema),
    defaultValues: { company_name: "", contact_name: "", email: "", phone: "", website: "", country_id: "", address: "", password: "", password_confirmation: "" },
  })

  const mutation = useMutation({
    mutationFn: (v: AgentValues) => agentRegister({ ...v, country_id: Number(v.country_id) }),
    onSuccess: () => setSubmitted(true),
    onError: (e) => applyServerErrors<AgentValues>(e, AGENT_FIELDS, setError, t("portal.errorServerUnreachable")),
  })

  if (submitted) {
    return (
      <div className="mt-6 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <h2 className="mt-3 font-semibold text-cas-navy">{t("portal.register.pendingTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("portal.register.pendingBody")}</p>
        <Button asChild className="mt-5 h-11 w-full">
          <Link to="/portal/login">{t("portal.register.backToLogin")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="mt-4 grid gap-x-3 gap-y-2.5 sm:grid-cols-2">
      {errors.root && <p role="alert" className="sm:col-span-2 rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>}

      <Field id="company_name" label={t("portal.register.companyName")} error={errors.company_name?.message} autoComplete="organization" {...register("company_name")} />
      <Field id="contact_name" label={t("portal.register.contactName")} error={errors.contact_name?.message} autoComplete="name" {...register("contact_name")} />
      <Field id="email" type="email" label={t("portal.email")} error={errors.email?.message} autoComplete="email" inputMode="email" {...register("email")} />
      <Field id="phone" type="tel" label={t("portal.register.phone")} error={errors.phone?.message} autoComplete="tel" {...register("phone")} />
      <Field id="website" label={t("portal.register.website")} error={errors.website?.message} placeholder="https://" {...register("website")} />

      <div className="space-y-1.5">
        <Label htmlFor="country_id">{t("portal.register.country")}</Label>
        <Select value={watch("country_id")} onValueChange={(v) => setValue("country_id", v, { shouldValidate: true })}>
          <SelectTrigger id="country_id" aria-label={t("portal.register.country")} aria-invalid={errors.country_id ? true : undefined}>
            <SelectValue placeholder={t("portal.register.countryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {(countries.data?.data ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.country_id && <p role="alert" className="text-xs text-destructive">{errors.country_id.message}</p>}
      </div>

      <Field id="password" type="password" label={t("portal.password")} error={errors.password?.message} autoComplete="new-password" {...register("password")} />
      <Field id="password_confirmation" type="password" label={t("portal.register.confirmPassword")} error={errors.password_confirmation?.message} autoComplete="new-password" {...register("password_confirmation")} />

      <Field id="address" wrapperClassName="sm:col-span-2" label={t("portal.register.address")} error={errors.address?.message} autoComplete="street-address" {...register("address")} />

      <Button type="submit" className="mt-1 h-10 w-full sm:col-span-2" disabled={mutation.isPending}>
        {mutation.isPending ? t("portal.register.submitting") : t("portal.register.submitAgent")}
      </Button>
    </form>
  )
}

// ── Shared labelled input ─────────────────────────────────────────────────────

const Field = ({ id, label, error, type, wrapperClassName, ...props }: { id: string; label: string; error?: string; wrapperClassName?: string } & ComponentProps<typeof Input>) => (
  <div className={cn("space-y-1.5", wrapperClassName)}>
    <Label htmlFor={id}>{label}</Label>
    {type === "password"
      ? <PasswordInput id={id} aria-invalid={error ? true : undefined} {...props} />
      : <Input id={id} type={type} aria-invalid={error ? true : undefined} {...props} />}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>
)
