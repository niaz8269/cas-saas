import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Fragment, useEffect, useState } from "react"
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
  listScholarships,
  updateProgram,
  type Program,
  type ProgramCustomField,
  type ProgramRequirements,
  type ProgramSections,
  type ServiceChargeTier,
  type VisibilityConfig,
} from "@/features/catalog/api"
import { VisibilityMatrix } from "@/features/catalog/VisibilityMatrix"
import { buildFields, parseFields, type EditableField } from "@/features/catalog/dialogs/applicationForm"
import { CustomFieldsBuilder, DocumentPicker } from "@/features/catalog/dialogs/applicationFormControls"
import { ApiError } from "@/lib/api"

const SECTION_OPTIONS: [keyof ProgramSections, string][] = [
  ["work_experience", "Work experience"],
  ["research", "Research details"],
  ["study_plan", "Study plan"],
  ["intro_video", "Self-intro video"],
]

type ChargeTier = { student: string; agent: string }
const emptyTier = (): ChargeTier => ({ student: "", agent: "" })
const tierStr = (tier: ServiceChargeTier | null | undefined, key: "student" | "agent"): string =>
  tier?.[key] != null ? String(tier[key]) : ""

/** Merge the picker's documents + section toggles + custom fields back into
 * requirements, preserving any other keys (e.g. min_age). */
function buildRequirements(
  base: ProgramRequirements | null | undefined,
  documents: number[],
  sections: ProgramSections,
  fields: ProgramCustomField[],
): ProgramRequirements {
  const rest = { ...(base ?? {}) }
  delete rest.documents
  delete rest.sections
  delete rest.fields

  const out: ProgramRequirements = { ...rest, documents, sections }
  if (fields.length) out.fields = fields

  return out
}

/** Build the service_charges JSON (self + per-scholarship) or null. */
function buildServiceCharges(
  currency: string,
  self: ChargeTier,
  scholarships: Record<number, ChargeTier>,
): Record<string, unknown> | null {
  const num = (x: string) => {
    const n = x ? Number(x) : NaN

    return Number.isFinite(n) ? n : undefined
  }
  const tier = (t: ChargeTier) => {
    const o: Record<string, number> = {}
    const s = num(t.student)
    const a = num(t.agent)
    if (s !== undefined) o.student = s
    if (a !== undefined) o.agent = a

    return Object.keys(o).length ? o : undefined
  }

  const self_ = tier(self)
  const schOut: Array<Record<string, unknown>> = []
  for (const [id, t] of Object.entries(scholarships)) {
    const tt = tier(t)
    if (tt) schOut.push({ scholarship_id: Number(id), ...tt })
  }

  if (!self_ && schOut.length === 0) return null

  const out: Record<string, unknown> = { currency: (currency || "USD").toUpperCase() }
  if (self_) out.self = self_
  if (schOut.length) out.scholarships = schOut

  return out
}

const schema = z.object({
  name: z.string().min(1, "Name is required").max(190),
  level: z.enum(["bachelor", "master", "phd"]),
  duration_months: z.string().optional(),
  tuition_fee: z.string().optional(),
  hostel_fee: z.string().optional(),
  currency: z.string().max(3).optional(),
  teaching_language: z.string().max(60).optional(),
  apply_link: z.string().max(255).optional(),
})

type Values = z.infer<typeof schema>

function toValues(p?: Program): Values {
  return {
    name: p?.name ?? "",
    level: (p?.level as Values["level"]) ?? "bachelor",
    duration_months: p?.duration_months != null ? String(p.duration_months) : "",
    tuition_fee: p?.tuition_fee != null ? String(p.tuition_fee) : "",
    hostel_fee: p?.hostel_fee != null ? String(p.hostel_fee) : "",
    currency: p?.currency ?? "CNY",
    teaching_language: p?.teaching_language ?? "",
    apply_link: p?.apply_link ?? "",
  }
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
  const [reqFields, setReqFields] = useState<EditableField[]>([])
  const [chargeCurrency, setChargeCurrency] = useState("USD")
  const [selfCharge, setSelfCharge] = useState<ChargeTier>(emptyTier())
  const [schCharges, setSchCharges] = useState<Record<number, ChargeTier>>({})
  const [linkedSchIds, setLinkedSchIds] = useState<number[]>([])
  const [visibility, setVisibility] = useState<VisibilityConfig>({})

  const docTypes = useQuery({ queryKey: ["document-types"], queryFn: listDocumentTypes, enabled: open })
  const scholarships = useQuery({
    queryKey: ["university-scholarships", universityId],
    queryFn: () => listScholarships(universityId),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    reset(toValues(program))
    const req = program?.requirements ?? {}
    setReqDocs((req.documents ?? []).filter((d): d is number => typeof d === "number"))
    setReqSections(req.sections ?? {})
    setReqFields(parseFields(req.fields))

    const sc = program?.service_charges ?? {}
    setChargeCurrency(sc.currency ?? "USD")
    setSelfCharge({ student: tierStr(sc.self, "student"), agent: tierStr(sc.self, "agent") })
    const map: Record<number, ChargeTier> = {}
    for (const entry of sc.scholarships ?? []) {
      map[entry.scholarship_id] = { student: tierStr(entry, "student"), agent: tierStr(entry, "agent") }
    }
    setSchCharges(map)
    setLinkedSchIds(program?.scholarship_ids ?? [])
    setVisibility(program?.visibility ?? {})
  }, [open, program, reset])

  const toggleDoc = (id: number) =>
    setReqDocs((docs) => (docs.includes(id) ? docs.filter((x) => x !== id) : [...docs, id]))
  const toggleSection = (key: keyof ProgramSections) =>
    setReqSections((s) => ({ ...s, [key]: !s[key] }))
  const setSelf = (key: keyof ChargeTier, v: string) => setSelfCharge((t) => ({ ...t, [key]: v }))
  const setSch = (id: number, key: keyof ChargeTier, v: string) =>
    setSchCharges((m) => ({ ...m, [id]: { ...(m[id] ?? emptyTier()), [key]: v } }))
  const toggleLinkedSch = (id: number) =>
    setLinkedSchIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const level = watch("level")
  const scholarshipList = scholarships.data?.data ?? []
  const linkedScholarships = scholarshipList.filter((s) => linkedSchIds.includes(s.id))

  const mutation = useMutation({
    mutationFn: (v: Values) => {
      const payload: Record<string, unknown> = {
        university_id: universityId,
        name: v.name,
        level: v.level,
        duration_months: v.duration_months ? Number(v.duration_months) : null,
        tuition_fee: v.tuition_fee ? Number(v.tuition_fee) : null,
        hostel_fee: v.hostel_fee ? Number(v.hostel_fee) : null,
        currency: v.currency || "CNY",
        teaching_language: v.teaching_language || null,
        apply_link: v.apply_link || null,
        requirements: buildRequirements(program?.requirements, reqDocs, reqSections, buildFields(reqFields)),
        service_charges: buildServiceCharges(
          chargeCurrency,
          selfCharge,
          Object.fromEntries(Object.entries(schCharges).filter(([id]) => linkedSchIds.includes(Number(id)))),
        ),
        scholarship_ids: linkedSchIds,
        visibility,
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

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="program-fee">Tuition / year</Label>
              <Input id="program-fee" type="number" placeholder="30000" {...register("tuition_fee")} />
              {errors.tuition_fee && <p role="alert" className="text-sm text-destructive">{errors.tuition_fee.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-hostel">Hostel / year</Label>
              <Input id="program-hostel" type="number" placeholder="6000" {...register("hostel_fee")} />
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
                  <Input aria-label="Service charge currency" maxLength={3} className="h-8 w-16 uppercase" value={chargeCurrency} onChange={(e) => setChargeCurrency(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Pick which scholarships support this course, then set what CAS charges.</p>

              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Supported scholarships</p>
                {scholarshipList.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No scholarships on this university yet — add scholarships first.</p>
                ) : (
                  <div className="space-y-1">
                    {scholarshipList.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 accent-cas-navy"
                          aria-label={`Support ${s.name}`}
                          checked={linkedSchIds.includes(s.id)}
                          onChange={() => toggleLinkedSch(s.id)}
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-[1fr_4.5rem_4.5rem] items-center gap-2 text-xs">
                <span aria-hidden="true" />
                <span className="text-center font-medium text-muted-foreground">Student</span>
                <span className="text-center font-medium text-muted-foreground">Agent</span>

                <span className="text-muted-foreground">Self-funded</span>
                <Input type="number" className="h-8 px-2" aria-label="Self-funded student charge" value={selfCharge.student} onChange={(e) => setSelf("student", e.target.value)} />
                <Input type="number" className="h-8 px-2" aria-label="Self-funded agent charge" value={selfCharge.agent} onChange={(e) => setSelf("agent", e.target.value)} />

                {linkedScholarships.map((s) => (
                  <Fragment key={s.id}>
                    <span className="truncate text-muted-foreground" title={s.name}>{s.name}</span>
                    <Input type="number" className="h-8 px-2" aria-label={`${s.name} student charge`} value={schCharges[s.id]?.student ?? ""} onChange={(e) => setSch(s.id, "student", e.target.value)} />
                    <Input type="number" className="h-8 px-2" aria-label={`${s.name} agent charge`} value={schCharges[s.id]?.agent ?? ""} onChange={(e) => setSch(s.id, "agent", e.target.value)} />
                  </Fragment>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <Label>Application requirements</Label>
              <p className="text-xs text-muted-foreground">What applicants must provide for this course — reflected in the apply form.</p>

              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Required documents</p>
                <DocumentPicker docTypes={docTypes.data?.data ?? []} selected={reqDocs} onToggle={toggleDoc} />
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

              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Custom fields</p>
                <p className="mb-2 text-xs text-muted-foreground">Extra questions the applicant answers for this course.</p>
                <CustomFieldsBuilder value={reqFields} onChange={setReqFields} />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Public visibility</p>
                <p className="mb-2 text-xs text-muted-foreground">Who sees the fee on the public site.</p>
                <VisibilityMatrix
                  sections={[
                    { key: "tuition_fee", label: "Tuition fee" },
                    { key: "service_charge", label: "CAS service charge" },
                    { key: "apply_link", label: "Apply link" },
                  ]}
                  value={visibility}
                  onChange={setVisibility}
                />
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
