import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { useLocation, useNavigate } from "react-router-dom"
import { z } from "zod"

import casLogo from "@/assets/cas-logo.png"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "@/features/auth/api"
import { ApiError } from "@/lib/api"
import { useAuthStore } from "@/stores/auth"

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
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const setAuth = useAuthStore((state) => state.setAuth)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/"

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
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <img
          src={casLogo}
          alt="CAS — Consultancy for Abroad Study"
          className="mx-auto mb-8 h-14 w-auto"
        />

        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Use your CAS staff account</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
            >
              {errors.root && (
                <p
                  role="alert"
                  className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive"
                >
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
                <Input
                  id="password"
                  type="password"
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

              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Student or agent?{" "}
          <a href="/portal/login" className="font-medium text-cas-navy hover:underline">
            Go to the portal
          </a>
        </p>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CAS — Consultancy for Abroad Study
        </p>
      </div>
    </main>
  )
}
