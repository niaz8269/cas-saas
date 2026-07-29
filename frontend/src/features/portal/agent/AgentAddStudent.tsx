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
import {
  createAgentStudent,
  getApplyCountries,
  type AgentCreateStudentPayload,
  type WizardEducation,
  type WizardGuardian,
} from "@/features/portal/api"
import { PageTitle, PortalCard } from "@/features/portal/components"
import { EMPTY_EDUCATION, type Profile } from "@/features/portal/student/applyShared"
import { BackgroundStep, ProfileStep } from "@/features/portal/student/applySteps"
import { ApiError } from "@/lib/api"

type Identity = { first_name: string; last_name: string; email: string }
const IDENTITY_FIELDS = ["first_name", "last_name", "email"] as const

/**
 * Partner "add student" form (report §5.7 "submit students").
 *
 * Deliberately built from the apply wizard's own ProfileStep and
 * BackgroundStep, so the partner is asked for exactly the applicant record an
 * application is made of — entered once here, then prefilled into the wizard
 * instead of retyped. Only identity (the two names + contact email) is local
 * to this screen; the server derives ownership, code and status.
 */
export default function AgentAddStudent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [duplicate, setDuplicate] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile>({})
  const [guardians, setGuardians] = useState<WizardGuardian[]>([
    { relation: "father", name: "" },
    { relation: "mother", name: "" },
  ])
  const [education, setEducation] = useState<WizardEducation[]>([{ ...EMPTY_EDUCATION }])
  const [emergency, setEmergency] = useState<WizardGuardian>({ relation: "Emergency contact", name: "" })

  const countries = useQuery({ queryKey: ["agent", "countries"], queryFn: () => getApplyCountries("agent") })

  const schema = useMemo(
    () =>
      z.object({
        first_name: z.string().trim().min(1, t("agentPortal.addStudent.errorFirstName")),
        last_name: z.string().trim().min(1, t("agentPortal.addStudent.errorLastName")),
        email: z.string().trim().email(t("portal.errorEmailInvalid")).or(z.literal("")),
      }),
    [t],
  )

  const { register, handleSubmit, setError, formState: { errors } } = useForm<Identity>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", last_name: "", email: "" },
  })

  const mutation = useMutation({
    mutationFn: (v: Identity) => {
      const payload: AgentCreateStudentPayload = {
        first_name: v.first_name.trim(),
        last_name: v.last_name.trim(),
        ...(v.email.trim() ? { email: v.email.trim() } : {}),
        // Blank answers are dropped, exactly as the apply wizards do.
        profile: Object.fromEntries(Object.entries(profile).filter(([, val]) => val !== "")),
        guardians: [...guardians, emergency].filter((g) => g.name.trim() !== ""),
        education: education.filter((e) => e.degree_name.trim() !== ""),
      }

      return createAgentStudent(payload)
    },
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
        // Identity errors land on their input; anything from the nested
        // applicant record (profile.*, guardians.0.name, …) has no field to
        // own it here, so it is summarised at the top of the form.
        const spillover: string[] = []

        for (const [field, messages] of Object.entries(e.errors)) {
          if ((IDENTITY_FIELDS as readonly string[]).includes(field)) {
            setError(field as Path<Identity>, { type: "server", message: messages[0] })
          } else {
            spillover.push(messages[0])
          }
        }

        if (spillover.length) setError("root", { type: "server", message: spillover.join(" ") })
        else if (!Object.keys(e.errors).length) setError("root", { type: "server", message: e.message })

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
        className="space-y-4 pb-4"
      >
        {duplicate && (
          <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{duplicate}</p>
        )}
        {errors.root && (
          <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>
        )}

        <PortalCard className="space-y-3">
          <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {t("agentPortal.addStudent.identity")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="first_name" label={t("agentPortal.addStudent.firstName")} error={errors.first_name?.message} autoComplete="given-name" {...register("first_name")} />
            <Field id="last_name" label={t("agentPortal.addStudent.lastName")} error={errors.last_name?.message} autoComplete="family-name" {...register("last_name")} />
          </div>
          <Field
            id="email"
            type="email"
            label={t("agentPortal.addStudent.email")}
            hint={t("agentPortal.addStudent.contactHint")}
            error={errors.email?.message}
            inputMode="email"
            {...register("email")}
          />
        </PortalCard>

        <ProfileStep
          profile={profile}
          countries={countries.data?.data ?? []}
          onChange={(k, v) => setProfile((p) => ({ ...p, [k]: v }))}
        />

        <BackgroundStep
          guardians={guardians}
          education={education}
          emergency={emergency}
          onGuardians={setGuardians}
          onEducation={setEducation}
          onEmergency={setEmergency}
        />

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
