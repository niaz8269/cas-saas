import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"

import casLogo from "@/assets/cas-logo.png"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { portalRegister } from "@/features/portal/api"
import { langDef } from "@/i18n/languages"
import { ApiError } from "@/lib/api"
import { usePortalAuthStore } from "@/stores/portalAuth"

type Values = {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  password_confirmation: string
}

const FIELDS = ["first_name", "last_name", "email", "phone", "password", "password_confirmation"] as const

export default function PortalRegister() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const token = usePortalAuthStore((s) => s.token)
  const kindInStore = usePortalAuthStore((s) => s.kind)
  const setAuth = usePortalAuthStore((s) => s.setAuth)

  useEffect(() => {
    if (token && kindInStore) navigate(`/portal/${kindInStore}`, { replace: true })
  }, [token, kindInStore, navigate])

  const schema = useMemo(
    () =>
      z
        .object({
          first_name: z.string().min(1, t("portal.register.errorFirstName")),
          last_name: z.string().min(1, t("portal.register.errorLastName")),
          email: z.string().min(1, t("portal.errorEmailRequired")).email(t("portal.errorEmailInvalid")),
          phone: z.string().optional().default(""),
          password: z.string().min(8, t("portal.register.errorPasswordMin")),
          password_confirmation: z.string(),
        })
        .refine((d) => d.password === d.password_confirmation, {
          message: t("portal.register.errorPasswordMatch"),
          path: ["password_confirmation"],
        }),
    [t],
  )

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", last_name: "", email: "", phone: "", password: "", password_confirmation: "" },
  })

  const mutation = useMutation({
    mutationFn: (values: Values) => portalRegister({ ...values, phone: values.phone || undefined }),
    onSuccess: (res) => {
      const s = res.student
      setAuth(res.token, "student", { id: s.id, name: s.full_name, email: s.email, status: s.status, code: s.student_code })
      navigate("/portal/student", { replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        for (const [field, messages] of Object.entries(error.errors)) {
          if ((FIELDS as readonly string[]).includes(field)) {
            setError(field as (typeof FIELDS)[number], { type: "server", message: messages[0] })
          }
        }
        if (!Object.keys(error.errors).length) setError("root", { type: "server", message: error.message })
        return
      }
      setError("root", { type: "server", message: t("portal.errorServerUnreachable") })
    },
  })

  return (
    <main dir={langDef(i18n.language).dir} className="flex min-h-dvh flex-col items-center justify-center bg-subtle p-6">
      <div className="w-full max-w-sm">
        <img src={casLogo} alt="CAS — Consultancy for Abroad Study" className="mx-auto mb-8 h-14 w-auto" />

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-cas-navy">{t("portal.register.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("portal.register.subtitle")}</p>

          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="mt-4 space-y-4">
            {errors.root && (
              <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">{t("portal.register.firstName")}</Label>
                <Input id="first_name" autoComplete="given-name"
                  aria-invalid={errors.first_name ? true : undefined} {...register("first_name")} />
                {errors.first_name && <p role="alert" className="text-sm text-destructive">{errors.first_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">{t("portal.register.lastName")}</Label>
                <Input id="last_name" autoComplete="family-name"
                  aria-invalid={errors.last_name ? true : undefined} {...register("last_name")} />
                {errors.last_name && <p role="alert" className="text-sm text-destructive">{errors.last_name.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("portal.email")}</Label>
              <Input id="email" type="email" autoComplete="email" inputMode="email"
                aria-invalid={errors.email ? true : undefined} {...register("email")} />
              {errors.email && <p role="alert" className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("portal.register.phone")}</Label>
              <Input id="phone" type="tel" autoComplete="tel"
                aria-invalid={errors.phone ? true : undefined} {...register("phone")} />
              {errors.phone && <p role="alert" className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("portal.password")}</Label>
              <Input id="password" type="password" autoComplete="new-password"
                aria-invalid={errors.password ? true : undefined} {...register("password")} />
              {errors.password && <p role="alert" className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password_confirmation">{t("portal.register.confirmPassword")}</Label>
              <Input id="password_confirmation" type="password" autoComplete="new-password"
                aria-invalid={errors.password_confirmation ? true : undefined} {...register("password_confirmation")} />
              {errors.password_confirmation && <p role="alert" className="text-sm text-destructive">{errors.password_confirmation.message}</p>}
            </div>

            <Button type="submit" className="h-11 w-full" disabled={mutation.isPending}>
              {mutation.isPending ? t("portal.register.submitting") : t("portal.register.submit")}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("portal.register.haveAccount")}{" "}
            <Link to="/portal/login" className="font-medium text-cas-navy hover:underline">{t("portal.register.signIn")}</Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("portal.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </main>
  )
}
