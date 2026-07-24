import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Fragment, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  createScholarship,
  listUniversities,
  updateScholarship,
  type Scholarship,
  type ScholarshipLevelBenefit,
  type VisibilityConfig,
} from "@/features/catalog/api"
import { VisibilityMatrix } from "@/features/catalog/VisibilityMatrix"
import { ApiError } from "@/lib/api"

const LEVELS = [["bachelor", "Bachelor"], ["master", "Master"], ["phd", "PhD"]] as const
type Level = (typeof LEVELS)[number][0]
type LevelBenefit = { tuition_after: string; hostel_after: string; stipend_monthly: string }
const emptyBenefit = (): LevelBenefit => ({ tuition_after: "", hostel_after: "", stipend_monthly: "" })
const benefitStr = (b: ScholarshipLevelBenefit | undefined, k: keyof LevelBenefit): string =>
  b?.[k] != null ? String(b[k]) : ""

/** Per-level benefits state → JSON (or null). */
function buildBenefits(levels: Record<Level, LevelBenefit>): Record<string, unknown> | null {
  const num = (x: string) => {
    const n = x ? Number(x) : NaN

    return Number.isFinite(n) ? n : undefined
  }
  const out: Record<string, unknown> = {}
  for (const [level] of LEVELS) {
    const tier: Record<string, number> = {}
    for (const key of ["tuition_after", "hostel_after", "stipend_monthly"] as const) {
      const v = num(levels[level][key])
      if (v !== undefined) tier[key] = v
    }
    if (Object.keys(tier).length) out[level] = tier
  }

  return Object.keys(out).length ? out : null
}

const schema = z.object({
  name: z.string().min(1, "Name is required").max(190),
  type: z.string().max(60).optional(),
  status: z.enum(["active", "inactive"]),
  coverage: z.string().max(120).optional(),
  amount: z.string().optional(),
  tuition_after: z.string().optional(),
  hostel_after: z.string().optional(),
  stipend_monthly: z.string().optional(),
  currency: z.string().max(3).optional(),
  deadline: z.string().optional(),
  description: z.string().max(20000).optional(),
  eligibility: z.string().max(20000).optional(),
  how_to_apply: z.string().max(20000).optional(),
  apply_link: z.string().max(255).optional(),
})

type Values = z.infer<typeof schema>

function toValues(s?: Scholarship): Values {
  return {
    name: s?.name ?? "",
    type: s?.type ?? "",
    status: (s?.status as "active" | "inactive") ?? "active",
    coverage: s?.coverage ?? "",
    amount: s?.amount != null ? String(s.amount) : "",
    tuition_after: s?.tuition_after != null ? String(s.tuition_after) : "",
    hostel_after: s?.hostel_after != null ? String(s.hostel_after) : "",
    stipend_monthly: s?.stipend_monthly != null ? String(s.stipend_monthly) : "",
    currency: s?.currency ?? "",
    deadline: s?.deadline ?? "",
    description: s?.description ?? "",
    eligibility: s?.eligibility ?? "",
    how_to_apply: s?.how_to_apply ?? "",
    apply_link: s?.apply_link ?? "",
  }
}

export default function ScholarshipFormDialog({
  universityId,
  scope = "university",
  scholarship,
  open,
  onOpenChange,
}: {
  universityId?: number
  scope?: "university" | "government"
  scholarship?: Scholarship
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(scholarship)
  const isGovernment = scope === "government"

  const { register, handleSubmit, reset, setError, formState: { errors } } =
    useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(scholarship) })

  const [universityIds, setUniversityIds] = useState<number[]>([])
  const [visibility, setVisibility] = useState<VisibilityConfig>({})
  const [levelBenefits, setLevelBenefits] = useState<Record<Level, LevelBenefit>>({
    bachelor: emptyBenefit(), master: emptyBenefit(), phd: emptyBenefit(),
  })

  const universities = useQuery({
    queryKey: ["universities", "all"],
    queryFn: () => listUniversities({ per_page: 100 }),
    enabled: open && isGovernment,
  })

  useEffect(() => {
    if (!open) return
    reset(toValues(scholarship))
    setUniversityIds(scholarship?.university_ids ?? [])
    setVisibility(scholarship?.visibility ?? {})
    const b = scholarship?.benefits ?? {}
    setLevelBenefits({
      bachelor: { tuition_after: benefitStr(b.bachelor, "tuition_after"), hostel_after: benefitStr(b.bachelor, "hostel_after"), stipend_monthly: benefitStr(b.bachelor, "stipend_monthly") },
      master: { tuition_after: benefitStr(b.master, "tuition_after"), hostel_after: benefitStr(b.master, "hostel_after"), stipend_monthly: benefitStr(b.master, "stipend_monthly") },
      phd: { tuition_after: benefitStr(b.phd, "tuition_after"), hostel_after: benefitStr(b.phd, "hostel_after"), stipend_monthly: benefitStr(b.phd, "stipend_monthly") },
    })
  }, [open, scholarship, reset])

  const toggleUniversity = (id: number) =>
    setUniversityIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const setBenefit = (level: Level, key: keyof LevelBenefit, v: string) =>
    setLevelBenefits((s) => ({ ...s, [level]: { ...s[level], [key]: v } }))

  const mutation = useMutation({
    mutationFn: (v: Values) => {
      const payload: Record<string, unknown> = {
        scope,
        university_id: isGovernment ? null : universityId,
        name: v.name,
        type: v.type || null,
        status: v.status,
        coverage: v.coverage || null,
        amount: v.amount ? Number(v.amount) : null,
        currency: v.currency || null,
        deadline: v.deadline || null,
        description: v.description || null,
        eligibility: v.eligibility || null,
        how_to_apply: v.how_to_apply || null,
        apply_link: v.apply_link || null,
        visibility,
      }

      if (isGovernment) {
        payload.university_ids = universityIds
        payload.benefits = buildBenefits(levelBenefits)
      } else {
        payload.tuition_after = v.tuition_after ? Number(v.tuition_after) : null
        payload.hostel_after = v.hostel_after ? Number(v.hostel_after) : null
        payload.stipend_monthly = v.stipend_monthly ? Number(v.stipend_monthly) : null
      }

      return isEdit ? updateScholarship(scholarship!.id, payload) : createScholarship(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: isGovernment ? ["scholarships", "government"] : ["university-scholarships", universityId],
      })
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "Add"} {isGovernment ? "government scholarship" : "scholarship"}</DialogTitle>
          <DialogDescription>
            {isGovernment
              ? "A national/government award (e.g. CSC), not tied to a single university."
              : "Details shown on the scholarship's website page."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{errors.root.message}</p>
          )}

          <Field label="Name" error={errors.name?.message}>
            <Input placeholder="Belt & Road Scholarship" {...register("name")} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><Input placeholder="full / partial / merit" {...register("type")} /></Field>
            <Field label="Deadline"><Input type="date" {...register("deadline")} /></Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Coverage" className="col-span-1"><Input placeholder="Full tuition" {...register("coverage")} /></Field>
            <Field label="Amount"><Input inputMode="decimal" placeholder="30000" {...register("amount")} /></Field>
            <Field label="Currency"><Input placeholder="CNY" className="uppercase" {...register("currency")} /></Field>
          </div>

          {isGovernment ? (
            <>
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Universities enrolling under this award</p>
                {universities.data?.data.length ? (
                  <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto">
                    {universities.data.data.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="size-4 shrink-0 accent-cas-navy" aria-label={u.name} checked={universityIds.includes(u.id)} onChange={() => toggleUniversity(u.id)} />
                        <span className="truncate" title={u.name}>{u.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{universities.isLoading ? "Loading universities…" : "No universities yet."}</p>
                )}
              </div>

              <div className="rounded-lg border p-3">
                <p className="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">Benefits by degree</p>
                <p className="mb-2 text-xs text-muted-foreground">Amounts in the currency set above.</p>
                <div className="grid grid-cols-[4rem_1fr_1fr_1fr] items-center gap-2 text-xs">
                  <span aria-hidden="true" />
                  <span className="text-center font-medium text-muted-foreground">Tuition after</span>
                  <span className="text-center font-medium text-muted-foreground">Hostel after</span>
                  <span className="text-center font-medium text-muted-foreground">Stipend/mo</span>
                  {LEVELS.map(([level, label]) => (
                    <Fragment key={level}>
                      <span className="text-muted-foreground">{label}</span>
                      <Input type="number" className="h-8 px-2" aria-label={`${label} tuition after`} value={levelBenefits[level].tuition_after} onChange={(e) => setBenefit(level, "tuition_after", e.target.value)} />
                      <Input type="number" className="h-8 px-2" aria-label={`${label} hostel after`} value={levelBenefits[level].hostel_after} onChange={(e) => setBenefit(level, "hostel_after", e.target.value)} />
                      <Input type="number" className="h-8 px-2" aria-label={`${label} stipend`} value={levelBenefits[level].stipend_monthly} onChange={(e) => setBenefit(level, "stipend_monthly", e.target.value)} />
                    </Fragment>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Student benefits (with this scholarship)</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Tuition after"><Input type="number" placeholder="0" {...register("tuition_after")} /></Field>
                <Field label="Hostel after"><Input type="number" placeholder="0" {...register("hostel_after")} /></Field>
                <Field label="Stipend / month"><Input type="number" placeholder="0" {...register("stipend_monthly")} /></Field>
              </div>
            </div>
          )}

          <Field label="Description"><Textarea rows={3} placeholder="A flagship scholarship for…" {...register("description")} /></Field>
          <Field label="Eligibility"><Textarea rows={2} placeholder="Open to first-year international undergraduates…" {...register("eligibility")} /></Field>
          <Field label="How to apply"><Textarea rows={2} placeholder="Apply through your CAS counselor…" {...register("how_to_apply")} /></Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Apply link"><Input placeholder="https://apply…" {...register("apply_link")} /></Field>
            <Field label="Status">
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Public visibility</p>
            <p className="mb-2 text-xs text-muted-foreground">Who sees each detail on the public site.</p>
            <VisibilityMatrix
              sections={[
                { key: "amount", label: "Award amount" },
                { key: "coverage", label: "Coverage" },
                { key: "deadline", label: "Deadline" },
                { key: "how_to_apply", label: "How to apply" },
              ]}
              value={visibility}
              onChange={setVisibility}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add scholarship"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="block">
        <span className="mb-1.5 block">{label}</span>
        {children}
      </Label>
      {error && <p role="alert" className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
