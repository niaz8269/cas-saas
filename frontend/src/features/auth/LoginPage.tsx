import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useLocation, useNavigate } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "@/features/auth/api"
import { AuthShell, PasswordInput } from "@/features/auth/AuthShell"
import { ApiError } from "@/lib/api"
import { useAuthStore } from "@/stores/auth"
import { cn } from "@/lib/utils"

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const [audience, setAudience] = useState<"staff" | "admin">("staff")
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const setAuth = useAuthStore((state) => state.setAuth)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/dashboard"

  // Already signed in? Skip the form.
  useEffect(() => {
    if (token) navigate(from, { replace: true })
  }, [token, from, navigate])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ token, user }) => {
      setAuth(token, user)
      navigate(from, { replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        for (const [field, messages] of Object.entries(error.errors)) {
          if (field === "email" || field === "password") {
            setError(field, { type: "server", message: messages[0] })
          }
        }
        return
      }
      setError("root", {
        type: "server",
        message:
          error instanceof ApiError
            ? error.message
            : "Unable to reach the server. Please try again.",
      })
    },
  })

  const onSubmit = (values: LoginValues) => mutation.mutate(values)

  return (
    <AuthShell
      audience={audience}
      title="Sign in"
      subtitle={audience === "admin" ? "Use your CAS administrator account" : "Use your CAS staff account"}
      footer={
        <>
          Student or agent?{" "}
          <a href="/portal/login" className="font-medium text-cas-navy hover:underline">
            Go to the portal
          </a>
        </>
      }
    >
      {/* Changes the side panel only; the same account sign-in serves both. */}
      <div role="tablist" aria-label="Account type" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-subtle p-1">
        {(["staff", "admin"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={audience === k}
            onClick={() => setAudience(k)}
            className={cn(
              "rounded-md py-2 text-sm font-medium capitalize transition-colors",
              audience === k ? "bg-card text-cas-navy shadow-sm" : "text-muted-foreground",
            )}
          >
            {k === "staff" ? "Staff" : "Admin"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errors.root && (
          <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">
            {errors.root.message}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@cas.moe"
            aria-invalid={errors.email ? true : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p role="alert" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p role="alert" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="h-11 w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  )
}
