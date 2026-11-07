import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell, PasswordInput } from "@/features/auth/AuthShell"
import { portalLogin, type AgentProfileData, type StudentProfileData } from "@/features/portal/api"
import { ApiError } from "@/lib/api"
import { usePortalAuthStore, type PortalKind } from "@/stores/portalAuth"
import { cn } from "@/lib/utils"

type Values = { email: string; password: string }

/** Only honour a same-origin absolute path as the post-login redirect. */
function safeRedirect(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null
}

export default function PortalLogin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = safeRedirect(searchParams.get("redirect"))
  const token = usePortalAuthStore((s) => s.token)
  const kindInStore = usePortalAuthStore((s) => s.kind)
  const setAuth = usePortalAuthStore((s) => s.setAuth)
  const [kind, setKind] = useState<PortalKind>("student")

  useEffect(() => {
    if (token && kindInStore) navigate(redirect ?? `/portal/${kindInStore}`, { replace: true })
  }, [token, kindInStore, navigate, redirect])

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, t("portal.errorEmailRequired")).email(t("portal.errorEmailInvalid")),
        password: z.string().min(1, t("portal.errorPasswordRequired")),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } })

  const mutation = useMutation({
    mutationFn: (values: Values) => portalLogin(kind, values),
    onSuccess: (response) => {
      if (kind === "agent") {
        const a = response.agent as AgentProfileData
        setAuth(response.token, "agent", { id: a.id, name: a.name, email: a.email, status: a.status, code: a.agent_code })
      } else {
        const s = response.student as StudentProfileData
        setAuth(response.token, "student", { id: s.id, name: s.full_name, email: s.email, status: s.status, code: s.student_code, email_verified: s.email_verified })
      }
      navigate(redirect ?? `/portal/${kind}`, { replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        for (const [field, messages] of Object.entries(error.errors)) {
          if (field === "email" || field === "password") setError(field, { type: "server", message: messages[0] })
        }
        if (!Object.keys(error.errors).length) {
          setError("root", { type: "server", message: error.message })
        }
        return
      }
      setError("root", {
        type: "server",
        message: error instanceof ApiError && error.status === 403
          ? error.message
          : t("portal.errorServerUnreachable"),
      })
    },
  })

  return (
    <AuthShell
      audience={kind}
      title={t("portal.loginTitle")}
      subtitle={t("portal.loginSubtitle")}
      footer={
        <>
          {t("portal.newStudent")}{" "}
          <Link to="/portal/register" className="font-medium text-cas-navy hover:underline">{t("portal.createAccount")}</Link>
        </>
      }
    >
      {/* Audience toggle */}
          <div role="tablist" aria-label={t("portal.portalTypeAria")} className="grid grid-cols-2 gap-1 rounded-lg bg-subtle p-1">
            {(["student", "agent"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-md py-2 text-sm font-medium capitalize transition-colors",
                  kind === k ? "bg-card text-cas-navy shadow-sm" : "text-muted-foreground",
                )}
              >
                {t(k === "student" ? "portal.roleStudent" : "portal.roleAgent")}
              </button>
            ))}
          </div>


          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="mt-5 space-y-4">
            {errors.root && (
              <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t("portal.email")}</Label>
              <Input id="email" type="email" autoComplete="email" inputMode="email"
                aria-invalid={errors.email ? true : undefined} {...register("email")} />
              {errors.email && <p role="alert" className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("portal.password")}</Label>
                <Link to="/portal/forgot-password" className="text-sm font-medium text-cas-navy hover:underline">{t("portal.forgotPassword", { defaultValue: "Forgot password?" })}</Link>
              </div>
              <PasswordInput id="password" autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined} {...register("password")} />
              {errors.password && <p role="alert" className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="h-11 w-full" disabled={mutation.isPending}>
              {mutation.isPending ? t("portal.signingIn") : t("portal.signIn")}
            </Button>
          </form>

    </AuthShell>
  )
}
