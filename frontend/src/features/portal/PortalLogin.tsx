import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"

import casLogo from "@/assets/cas-logo.png"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { portalLogin, type AgentProfileData, type StudentProfileData } from "@/features/portal/api"
import { ApiError } from "@/lib/api"
import { usePortalAuthStore, type PortalKind } from "@/stores/portalAuth"
import { cn } from "@/lib/utils"

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type Values = z.infer<typeof schema>

export default function PortalLogin() {
  const navigate = useNavigate()
  const token = usePortalAuthStore((s) => s.token)
  const kindInStore = usePortalAuthStore((s) => s.kind)
  const setAuth = usePortalAuthStore((s) => s.setAuth)
  const [kind, setKind] = useState<PortalKind>("student")

  useEffect(() => {
    if (token && kindInStore) navigate(`/portal/${kindInStore}`, { replace: true })
  }, [token, kindInStore, navigate])

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
        setAuth(response.token, "student", { id: s.id, name: s.full_name, email: s.email, status: s.status, code: s.student_code })
      }
      navigate(`/portal/${kind}`, { replace: true })
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
          : "Unable to reach the server. Please try again.",
      })
    },
  })

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-subtle p-6">
      <div className="w-full max-w-sm">
        <img src={casLogo} alt="CAS — Consultancy for Abroad Study" className="mx-auto mb-8 h-14 w-auto" />

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-cas-navy">Portal sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Access your CAS records</p>

          {/* Audience toggle */}
          <div role="tablist" aria-label="Portal type" className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-subtle p-1">
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
                {k}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="mt-4 space-y-4">
            {errors.root && (
              <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" inputMode="email"
                aria-invalid={errors.email ? true : undefined} {...register("email")} />
              {errors.email && <p role="alert" className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined} {...register("password")} />
              {errors.password && <p role="alert" className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="h-11 w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CAS — Consultancy for Abroad Study
        </p>
      </div>
    </main>
  )
}
