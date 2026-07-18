import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listDocumentTypes } from "@/features/admissions/api"
import {
  createProgram,
  updateProgram,
  type Program,
  type ProgramRequirements,
  type ProgramSections,
  type ServiceChargeTier,
} from "@/features/catalog/api"
import { ApiError } from "@/lib/api"

const SECTION_OPTIONS: [keyof ProgramSections, string][] = [
  ["work_experience", "Work experience"],
  ["research", "Research details"],
  ["study_plan", "Study plan"],
  ["intro_video", "Self-intro video"],
]

/** Merge the picker's documents + section toggles back into requirements,
 * preserving any other keys (e.g. min_age). */
function buildRequirements(
  base: ProgramRequirements | null | undefined,
  documents: number[],
  sections: ProgramSections,
): ProgramRequirements {
  const rest = { ...(base ?? {}) }
  delete rest.documents
  delete rest.sections

  return { ...rest, documents, sections }
}

const schema = z.object({
  name: z.string().min(1, "Name is required").max(190),
  level: z.enum(["bachelor", "master", "phd"]),
  duration_months: z.string().optional(),
  tuition_fee: z.string().optional(),
  currency: z.string().max(3).optional(),
  teaching_language: z.string().max(60).optional(),
  apply_link: z.string().max(255).optional(),
  sc_currency: z.string().max(3).optional(),
  sc_self_student: z.string().optional(),
  sc_self_agent: z.string().optional(),
  sc_sch_student: z.string().optional(),
  sc_sch_agent: z.string().optional(),
  sc_partial_student: z.string().optional(),
  sc_partial_agent: z.string().optional(),
})

type Values = z.infer<typeof schema>

const tierValue = (tier: ServiceChargeTier | null | undefined, key: "student" | "agent"): string =>
  tier?.[key] != null ? String(tier[key]) : ""

function toValues(p?: Program): Values {
  const sc = p?.service_charges ?? {}

  return {
    name: p?.name ?? "",
    level: (p?.level as Values["level"]) ?? "bachelor",
    duration_months: p?.duration_months != null ? String(p.duration_months) : "",
    tuition_fee: p?.tuition_fee != null ? String(p.tuition_fee) : "",
    currency: p?.currency ?? "CNY",
    teaching_language: p?.teaching_language ?? "",
    apply_link: p?.apply_link ?? "",
    sc_currency: sc.currency ?? "USD",
    sc_self_student: tierValue(sc.self, "student"),
    sc_self_agent: tierValue(sc.self, "agent"),
    sc_sch_student: tierValue(sc.scholarship, "student"),
    sc_sch_agent: tierValue(sc.scholarship, "agent"),
    sc_partial_student: tierValue(sc.partial, "student"),
    sc_partial_agent: tierValue(sc.partial, "agent"),
  }
}

/** Build the service_charges JSON from the flat form fields (or null). */
function buildServiceCharges(v: Values): Record<string, unknown> | null {
  const num = (x?: string) => {
    const n = x ? Number(x) : NaN

    return Number.isFinite(n) ? n : undefined
  }
  const tier = (st?: string, ag?: string) => {
    const t: Record<string, number> = {}
    const s = num(st)
    const a = num(ag)
    if (s !== undefined) t.student = s
    if (a !== undefined) t.agent = a

    return Object.keys(t).length ? t : undefined
  }

  const tiers = {
    self: tier(v.sc_self_student, v.sc_self_agent),
    scholarship: tier(v.sc_sch_student, v.sc_sch_agent),
    partial: tier(v.sc_partial_student, v.sc_partial_agent),
  }

  if (!tiers.self && !tiers.scholarship && !tiers.partial) return null

  const out: Record<string, unknown> = { currency: (v.sc_currency || "USD").toUpperCase() }
  if (tiers.self) out.self = tiers.self
  if (tiers.scholarship) out.scholarship = tiers.scholarship
  if (tiers.partial) out.partial = tiers.partial

  return out
}

export default function ProgramFormDialog({
  universityId,
  program,
  open,
  onOpenChange,
}: {
  universityId: number
  program?: Program
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(program)

  const { register, handleSubmit, reset, setError, setValue, watch, formState: { errors } } =
    useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(program) })

  const [reqDocs, setReqDocs] = useState<number[]>([])
  const [reqSections, setReqSections] = useState<ProgramSections>({})

  const docTypes = useQuery({ queryKey: ["document-types"], queryFn: listDocumentTypes, enabled: open })

  useEffect(() => {
    if (!open) return
    reset(toValues(program))
    const req = program?.requirements ?? {}
    setReqDocs((req.documents ?? []).filter((d): d is number => typeof d === "number"))
    setReqSections(req.sections ?? {})
  }, [open, program, reset])

  const toggleDoc = (id: number) =>
    setReqDocs((docs) => (docs.includes(id) ? docs.filter((x) => x !== id) : [...docs, id]))
  const toggleSection = (key: keyof ProgramSections) =>
    setReqSections((s) => ({ ...s, [key]: !s[key] }))

  const level = watch("level")

  const mutation = useMutation({
    mutationFn: (v: Values) => {
      const payload: Record<string, unknown> = {
        university_id: universityId,
        name: v.name,
        level: v.level,
        duration_months: v.duration_months ? Number(v.duration_months) : null,
        tuition_fee: v.tuition_fee ? Number(v.tuition_fee) : null,
        currency: v.currency || "CNY",
        teaching_language: v.teaching_language || null,
        apply_link: v.apply_link || null,
        requirements: buildRequirements(program?.requirements, reqDocs, reqSections),
        service_charges: buildServiceCharges(v),
      }

      return isEdit ? updateProgram(program!.id, payload) : createProgram(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["university-programs", universityId] })
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        for (const [field, messages] of Object.entries(error.errors)) {
          if (field in schema.shape) setError(field as keyof Values, { type: "server", message: messages[0] })
        }

        return
      }
      setError("root", { type: "server", message: error instanceof ApiError ? error.message : "Something went wrong." })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit program" : "Add program"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-2">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="program-name">Name</Label>
            <Input id="program-name" placeholder="MBBS" {...register("name")} />
            {errors.name && <p role="alert" className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={level} onValueChange={(value) => setValue("level", value as Values["level"])}>
                <SelectTrigger aria-label="Level"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bachelor">Bachelor</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="phd">PhD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-duration">Duration (months)</Label>
              <Input id="program-duration" type="number" placeholder="72" {...register("duration_months")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="program-fee">Tuition / year</Label>
              <Input id="program-fee" type="number" placeholder="30000" {...register("tuition_fee")} />
              {errors.tuition_fee && <p role="alert" className="text-sm text-destructive">{errors.tuition_fee.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-currency">Currency</Label>
              <Input id="program-currency" maxLength={3} className="uppercase" {...register("currency")} />
              {errors.currency && <p role="alert" className="text-sm text-destructive">{errors.currency.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="program-language">Teaching language</Label>
              <Input id="program-language" placeholder="English" {...register("teaching_language")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-apply-link">Apply link</Label>
              <Input id="program-apply-link" placeholder="https://…" {...register("apply_link")} />
            </div>
          </div>

          <div className="grid items-start gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label>CAS service charges</Label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Currency</span>
                <Input aria-label="Service charge currency" maxLength={3} className="h-8 w-16 uppercase" {...register("sc_currency")} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">What CAS charges to process this course, per funding type.</p>
            <div className="grid grid-cols-3 items-center gap-2 text-xs">
              <span className="sr-only">Funding</span>
              <span className="text-center font-medium text-muted-foreground">Direct student</span>
              <span className="text-center font-medium text-muted-foreground">Agent / partner</span>

              <span className="text-muted-foreground">Self-funded</span>
              <Input type="number" className="h-8" aria-label="Self-funded student charge" {...register("sc_self_student")} />
              <Input type="number" className="h-8" aria-label="Self-funded agent charge" {...register("sc_self_agent")} />

              <span className="text-muted-foreground">Scholarship</span>
              <Input type="number" className="h-8" aria-label="Scholarship student charge" {...register("sc_sch_student")} />
              <Input type="number" className="h-8" aria-label="Scholarship agent charge" {...register("sc_sch_agent")} />

              <span className="text-muted-foreground">Partial</span>
              <Input type="number" className="h-8" aria-label="Partial student charge" {...register("sc_partial_student")} />
              <Input type="number" className="h-8" aria-label="Partial agent charge" {...register("sc_partial_agent")} />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <Label>Application requirements</Label>
            <p className="text-xs text-muted-foreground">What applicants must provide for this course — reflected in the apply form.</p>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Required documents</p>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border p-2">
                {docTypes.data?.data.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-cas-navy"
                      aria-label={t.name}
                      checked={reqDocs.includes(t.id)}
                      onChange={() => toggleDoc(t.id)}
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Extra sections (typically Master / PhD)</p>
              <div className="space-y-1.5">
                {SECTION_OPTIONS.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-cas-navy"
                      aria-label={label}
                      checked={Boolean(reqSections[key])}
                      onChange={() => toggleSection(key)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          </div>

          </div>

          <DialogFooter className="mt-2 shrink-0 border-t pt-3">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add program"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
