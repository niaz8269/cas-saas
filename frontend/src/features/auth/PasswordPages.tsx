import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { CheckCircle2, MailCheck } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useSearchParams } from "react-router-dom"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell, PasswordInput, type AuthAudience } from "@/features/auth/AuthShell"
import { api, ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

type Audience = "staff" | "agent" | "student"

const forgotRequest = (audience: Audience, email: string) =>
  api<{ message: string }>(`/auth/${audience}/forgot-password`, { method: "POST", body: JSON.stringify({ email }) })

const resetRequest = (audience: Audience, body: Record<string, string>) =>
  api<{ message: string }>(`/auth/${audience}/reset-password`, { method: "POST", body: JSON.stringify(body) })

const signInPath = (mode: "staff" | "portal") => (mode === "staff" ? "/admin" : "/portal/login")

/** Student / Agent switch used on the portal variants. */
function AudienceTabs({ value, onChange }: { value: "student" | "agent"; onChange: (v: "student" | "agent") => void }) {
  return (
    <div role="tablist" aria-label="Account type" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-subtle p-1">
      {(["student", "agent"] as const).map((k) => (
        <button
          key={k}
          role="tab"
          type="button"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={cn("rounded-md py-2 text-sm font-medium capitalize transition-colors", value === k ? "bg-card text-cas-navy shadow-sm" : "text-muted-foreground")}
        >
          {k === "student" ? "Student" : "Agent"}
        </button>
      ))}
    </div>
  )
}

// ── Forgot password ───────────────────────────────────────────────────────────

const forgotSchema = z.object({ email: z.string().min(1, "Email is required").email("Enter a valid email address") })

export function ForgotPasswordPage({ mode }: { mode: "staff" | "portal" }) {
  const [portalKind, setPortalKind] = useState<"student" | "agent">("student")
  const audience: Audience = mode === "staff" ? "staff" : portalKind
  const [sent, setSent] = useState<string | null>(null)

  const { register, handleSubmit, setError, formState: { errors } } = useForm<{ email: string }>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  })

  const mutation = useMutation({
    mutationFn: ({ email }: { email: string }) => forgotRequest(audience, email),
    onSuccess: (_r, v) => setSent(v.email),
    onError: (e) =>
      setError("root", {
        type: "server",
        message: e instanceof ApiError && e.status === 429 ? "Too many attempts. Please wait a minute and try again." : "Unable to reach the server. Please try again.",
      }),
  })

  const shellAudience: AuthAudience = mode === "staff" ? "staff" : portalKind

  return (
    <AuthShell
      audience={shellAudience}
      title="Forgot your password?"
      subtitle={sent ? undefined : "Enter your email and we'll send you a link to choose a new one."}
      footer={<Link to={signInPath(mode)} className="font-medium text-cas-navy hover:underline">Back to sign in</Link>}
    >
      {sent ? (
        <div className="text-center" role="status">
          <MailCheck className="mx-auto size-12 text-cas-navy" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-cas-navy">Check your email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            If an account exists for <strong className="text-foreground">{sent}</strong>, a reset link is on its way. It expires in 60 minutes.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Nothing arrived? Check your spam folder, or wait a minute and try again.</p>
          <Button type="button" variant="outline" className="mt-5 h-10 w-full" onClick={() => setSent(null)}>Use a different email</Button>
        </div>
      ) : (
        <>
          {mode === "portal" && <AudienceTabs value={portalKind} onChange={setPortalKind} />}
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
            {errors.root && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" inputMode="email" autoFocus aria-invalid={errors.email ? true : undefined} {...register("email")} />
              {errors.email && <p role="alert" className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="h-11 w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  )
}

// ── Reset password ────────────────────────────────────────────────────────────

const resetSchema = z
  .object({
    password: z.string().min(10, "Use at least 10 characters, with letters and numbers").regex(/[A-Za-z]/, "Use at least 10 characters, with letters and numbers").regex(/[0-9]/, "Use at least 10 characters, with letters and numbers"),
    password_confirmation: z.string(),
  })
  .refine((d) => d.password === d.password_confirmation, { message: "Passwords don't match", path: ["password_confirmation"] })

export function ResetPasswordPage({ mode }: { mode: "staff" | "portal" }) {
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""
  const email = params.get("email") ?? ""
  const as = params.get("as")
  const audience: Audience = mode === "staff" ? "staff" : as === "agent" ? "agent" : "student"
  const [done, setDone] = useState(false)

  const { register, handleSubmit, setError, formState: { errors } } = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", password_confirmation: "" },
  })

  const mutation = useMutation({
    mutationFn: (v: z.infer<typeof resetSchema>) => resetRequest(audience, { email, token, ...v }),
    onSuccess: () => setDone(true),
    onError: (e) => {
      if (e instanceof ApiError && e.status === 422) {
        if (e.errors.password) setError("password", { type: "server", message: e.errors.password[0] })
        else setError("root", { type: "server", message: e.message })
        return
      }
      setError("root", { type: "server", message: "Unable to reach the server. Please try again." })
    },
  })

  const invalidLink = !token || !email

  return (
    <AuthShell
      audience={audience}
      title={done ? "Password changed" : "Choose a new password"}
      subtitle={done || invalidLink ? undefined : `For ${email}`}
      footer={done ? undefined : <Link to={signInPath(mode)} className="font-medium text-cas-navy hover:underline">Back to sign in</Link>}
    >
      {done ? (
        <div className="text-center" role="status">
          <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">Your password has been updated. Sign in with your new password.</p>
          <Button asChild className="mt-5 h-11 w-full"><Link to={signInPath(mode)}>Go to sign in</Link></Button>
        </div>
      ) : invalidLink ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">This reset link is incomplete. Request a new one to continue.</p>
          <Button asChild className="mt-5 h-11 w-full">
            <Link to={mode === "staff" ? "/admin/forgot-password" : "/portal/forgot-password"}>Request a new link</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">
              {errors.root.message}{" "}
              <Link to={mode === "staff" ? "/admin/forgot-password" : "/portal/forgot-password"} className="font-medium underline">Request a new link</Link>
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <PasswordInput id="password" autoComplete="new-password" autoFocus aria-invalid={errors.password ? true : undefined} {...register("password")} />
            {errors.password && <p role="alert" className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password_confirmation">Confirm new password</Label>
            <PasswordInput id="password_confirmation" autoComplete="new-password" aria-invalid={errors.password_confirmation ? true : undefined} {...register("password_confirmation")} />
            {errors.password_confirmation && <p role="alert" className="text-sm text-destructive">{errors.password_confirmation.message}</p>}
          </div>
          <Button type="submit" className="h-11 w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Change password"}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
