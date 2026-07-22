import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Check, Download, FileText, FileUp, Plus, UserCog } from "lucide-react"
import { useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useCan } from "@/features/auth/useCan"
import {
  downloadDocument,
  getApplication,
  getOfferLetter,
  listApplicationDocuments,
  listDocumentTypes,
  rejectDocument,
  respondToOffer,
  storeOffer,
  transitionApplication,
  updateApplication,
  uploadDocument,
  verifyDocument,
  type ApplicantProfile,
  type DocumentItem,
} from "@/features/admissions/api"
import { listStaff } from "@/features/crm/api"
import {
  APPLICATION_LADDER,
  APPLICATION_STATUS_BADGE,
  APPLICATION_TRANSITIONS,
  DOCUMENT_STATUS_BADGE,
  OFFER_STATUS_BADGE,
  statusLabel,
} from "@/features/admissions/status"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

type FieldPair = [label: string, value: string | number | null | undefined]

function InfoGroup({ title, fields }: { title: string; fields: FieldPair[] }) {
  const shown = fields.filter(([, v]) => v !== null && v !== undefined && v !== "")
  if (shown.length === 0) return null

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {shown.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function humanizeKey(key: string) {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function ApplicantDetails({ applicant }: { applicant: ApplicantProfile }) {
  const { personal, passport, contact, guardians, education } = applicant
  const custom = Object.entries(applicant.custom ?? {})
  const years = (from: number | null, to: number | null) =>
    from || to ? ` (${from ?? "—"}–${to ?? "—"})` : ""

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <header className="border-b px-5 py-3">
        <h3 className="text-[15px] font-semibold">Applicant details</h3>
      </header>
      <div className="space-y-5 px-5 py-4">
        <InfoGroup
          title="Personal"
          fields={[
            ["Given name", personal.first_name],
            ["Surname", personal.last_name],
            ["Chinese name", personal.chinese_name],
            ["Date of birth", personal.dob],
            ["Gender", personal.gender],
            ["Marital status", personal.marital_status],
            ["Religion", personal.religion],
            ["Nationality", personal.nationality],
            ["Native language", personal.native_language],
            ["Place of birth", personal.place_of_birth],
            ["City", personal.city],
          ]}
        />
        <InfoGroup
          title="Passport"
          fields={[
            ["Passport no.", passport.passport_no],
            ["Issued", passport.issue_date],
            ["Expires", passport.expiry_date],
          ]}
        />
        <InfoGroup
          title="Contact"
          fields={[
            ["Email", contact.email],
            ["Alternate email", contact.alternate_email],
            ["Phone", contact.phone],
            ["WeChat", contact.wechat_id],
            ["Skype", contact.skype_id],
            ["Present address", contact.current_address],
            ["Permanent address", contact.permanent_address],
          ]}
        />

        {guardians.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Guardians &amp; contacts
            </h4>
            <ul className="mt-2 space-y-2">
              {guardians.map((g, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium text-ink">{g.name ?? "—"}</span>
                  {g.relation && <span className="text-muted-foreground"> · {g.relation}</span>}
                  <div className="text-xs text-muted-foreground">
                    {[g.phone, g.email, g.address].filter(Boolean).join(" · ") || "—"}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {education.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Education</h4>
            <ul className="mt-2 space-y-2">
              {education.map((e, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium text-ink">
                    {[e.level, e.major ?? e.degree_name].filter(Boolean).join(" — ") || "—"}
                  </span>
                  <span className="text-muted-foreground">
                    {e.institution ? ` at ${e.institution}` : ""}
                    {years(e.start_year, e.end_year)}
                    {e.grade ? ` · ${e.grade}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {custom.length > 0 && (
          <InfoGroup
            title="Additional information"
            fields={custom.map(([key, value]) => [humanizeKey(key), value])}
          />
        )}
      </div>
    </section>
  )
}

function Stepper({ current }: { current: string }) {
  const terminalIndex = APPLICATION_LADDER.indexOf(current as (typeof APPLICATION_LADDER)[number])
  const isOffLadder = terminalIndex === -1

  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {APPLICATION_LADDER.map((step, index) => {
        const reached = !isOffLadder && index <= terminalIndex
        const isCurrent = step === current

        return (
          <li key={step} className="flex items-center gap-1.5">
            {index > 0 && <span className="h-px w-4 bg-border" aria-hidden="true" />}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                isCurrent
                  ? "bg-cas-navy text-white"
                  : reached
                    ? "bg-cas-navy-50 text-cas-navy"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {reached && !isCurrent && <Check className="size-3" aria-hidden="true" />}
              {statusLabel(step)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default function ApplicationDetailPage() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const can = useCan()

  const canUpdate = can("applications.update.global") || can("applications.update.assigned")
  const canUpload = can("documents.upload.global") || can("documents.upload.assigned")
  const canVerify = can("documents.verify.global")

  const [actionError, setActionError] = useState<string | null>(null)
  const [missing, setMissing] = useState<string[]>([])
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerType, setOfferType] = useState("conditional")
  const [offerRef, setOfferRef] = useState("")
  const [uploadTypeId, setUploadTypeId] = useState<number | null>(null)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [selectedOfficer, setSelectedOfficer] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const application = useQuery({ queryKey: ["application", id], queryFn: () => getApplication(id) })
  const documents = useQuery({ queryKey: ["application-documents", id], queryFn: () => listApplicationDocuments(id) })
  const types = useQuery({ queryKey: ["document-types"], queryFn: listDocumentTypes })
  const officers = useQuery({
    queryKey: ["staff-directory", "Admissions"],
    queryFn: () => listStaff("Admissions"),
    enabled: reassignOpen,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["application", id] })
    queryClient.invalidateQueries({ queryKey: ["application-documents", id] })
    queryClient.invalidateQueries({ queryKey: ["applications"] })
  }

  const transitionMutation = useMutation({
    mutationFn: (status: string) => transitionApplication(id, status),
    onSuccess: () => {
      setActionError(null)
      setMissing([])
      invalidate()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "CHECKLIST_INCOMPLETE") {
        setMissing((error.payload.missing as string[] | undefined) ?? [])
        setActionError("Cannot submit yet — required documents are missing:")
        return
      }
      setMissing([])
      setActionError(error instanceof ApiError ? error.message : "Transition failed.")
    },
  })

  const reassignMutation = useMutation({
    mutationFn: () =>
      updateApplication(id, {
        assigned_admissions_id:
          selectedOfficer && selectedOfficer !== "0" ? Number(selectedOfficer) : null,
      }),
    onSuccess: () => {
      setActionError(null)
      setReassignOpen(false)
      invalidate()
    },
    onError: (error) =>
      setActionError(error instanceof ApiError ? error.message : "Reassignment failed."),
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, typeId }: { file: File; typeId: number }) =>
      uploadDocument(
        {
          documentable_type: "application",
          documentable_id: Number(id),
          document_type_id: typeId,
          file_name: file.name,
          mime: file.type || "application/pdf",
          size: file.size,
        },
        file,
      ),
    onSuccess: () => {
      setActionError(null)
      invalidate()
    },
    onError: (error) =>
      setActionError(error instanceof ApiError ? error.message : String(error)),
  })

  const offerMutation = useMutation({
    mutationFn: () => storeOffer(id, { offer_type: offerType, reference_no: offerRef || null }),
    onSuccess: () => {
      setOfferOpen(false)
      setOfferRef("")
      invalidate()
    },
    onError: (error) =>
      setActionError(error instanceof ApiError ? error.message : "Could not record the offer."),
  })

  const offerLetter = useMutation({
    mutationFn: (offerId: number) => getOfferLetter(id, offerId),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener")
      // Release the object URL once the tab has had a chance to load it.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
    onError: (error) =>
      setActionError(error instanceof ApiError ? error.message : "Could not generate the offer letter."),
  })

  const offerRespond = useMutation({
    mutationFn: ({ offerId, decision }: { offerId: number; decision: "accepted" | "declined" }) =>
      respondToOffer(id, offerId, decision),
    onSuccess: () => {
      setActionError(null)
      invalidate()
    },
    onError: (error) =>
      setActionError(error instanceof ApiError ? error.message : "Could not record the response."),
  })

  const documentAction = useMutation({
    mutationFn: async ({ action, docId }: { action: "download" | "verify" | "reject"; docId: number }) => {
      if (action === "download") {
        const { url } = await downloadDocument(docId)
        window.open(url, "_blank", "noopener")
        return
      }
      if (action === "verify") await verifyDocument(docId)
      if (action === "reject") await rejectDocument(docId)
    },
    onSuccess: invalidate,
    onError: (error) =>
      setActionError(error instanceof ApiError ? error.message : "Document action failed."),
  })

  if (application.isPending) return <Skeleton className="h-72 w-full rounded-xl" />

  if (application.isError || !application.data) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-destructive">Application not found or access denied.</p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link to="/applications"><ArrowLeft className="size-4" /> Back to applications</Link>
        </Button>
      </div>
    )
  }

  const app = application.data.data
  const checklistMissing = missing.length > 0 ? missing : application.data.checklist?.missing ?? []
  const docs = documents.data?.data ?? []

  const latestByType = new Map<number, DocumentItem>()
  for (const doc of docs) {
    if (doc.type && (latestByType.get(doc.type.id)?.version ?? 0) < doc.version) {
      latestByType.set(doc.type.id, doc)
    }
  }

  // The resolved required set for THIS application (baseline + course extras),
  // matching exactly what the applicant was asked for; enriched with sensitivity.
  const typesById = new Map((types.data?.data ?? []).map((t) => [t.id, t]))
  const requiredTypes = (application.data.checklist?.required ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    is_sensitive: typesById.get(r.id)?.is_sensitive ?? false,
  }))
  const requiredIds = new Set(requiredTypes.map((t) => t.id))
  // Anything the applicant uploaded that isn't one of the required types.
  const otherDocs = [...latestByType.values()].filter((d) => d.type && !requiredIds.has(d.type.id))

  const nextMoves = (APPLICATION_TRANSITIONS[app.status] ?? []).filter((s) => s !== "withdrawn")
  const canWithdraw = (APPLICATION_TRANSITIONS[app.status] ?? []).includes("withdrawn")

  const triggerUpload = (typeId: number) => {
    setUploadTypeId(typeId)
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {/* hidden file input for the checklist uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        className="hidden"
        aria-label="Upload document file"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file && uploadTypeId) uploadMutation.mutate({ file, typeId: uploadTypeId })
          event.target.value = ""
        }}
      />

      {/* Header */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              to="/applications"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Applications
            </Link>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-cas-navy">{app.application_code}</h2>
              {app.review && (
                <Badge variant="outline" className="border-transparent bg-amber-50 text-amber-700">
                  To verify
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {app.student && (
                <Link to={`/students/${app.student.id}`} className="text-cas-navy hover:underline">
                  {app.student.full_name}
                </Link>
              )}
              {app.kind === "scholarship" ? (
                <span className="capitalize"> · Government scholarship: {app.scholarship?.name ?? "—"}{app.level ? ` · ${app.level}` : ""}</span>
              ) : (
                <>{" · "}{app.program?.name} at {app.university?.name}{app.intake ? ` · ${app.intake.name}` : ""}</>
              )}
              {app.source && <> · <span>received via <span className="font-medium text-foreground">{app.source.name}</span></span></>}
            </p>
          </div>

          <Badge
            variant="outline"
            className={cn("border-transparent capitalize", APPLICATION_STATUS_BADGE[app.status])}
          >
            {statusLabel(app.status)}
          </Badge>
        </div>

        <div className="mt-5 border-t pt-5">
          <Stepper current={app.status} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-muted-foreground">Admissions officer:</span>
          <span className="font-medium">{app.admissions_officer?.name ?? "Unassigned"}</span>
          {canUpdate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-cas-navy hover:text-cas-navy"
              onClick={() => {
                setSelectedOfficer(app.admissions_officer ? String(app.admissions_officer.id) : "")
                setActionError(null)
                setReassignOpen(true)
              }}
            >
              <UserCog className="size-3.5" /> Reassign
            </Button>
          )}
        </div>

        {actionError && (
          <div role="alert" className="mt-4 rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">
            {actionError}
            {checklistMissing.length > 0 && (
              <ul className="mt-1 list-inside list-disc">
                {checklistMissing.map((name) => <li key={name}>{name}</li>)}
              </ul>
            )}
          </div>
        )}

        {canUpdate && (nextMoves.length > 0 || canWithdraw) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {nextMoves.map((move) => (
              <Button
                key={move}
                size="sm"
                variant={["rejected"].includes(move) ? "destructive" : "default"}
                disabled={transitionMutation.isPending}
                onClick={() => transitionMutation.mutate(move)}
                className="capitalize"
              >
                {statusLabel(move)}
              </Button>
            ))}
            {app.status === "submitted" && (
              <Button size="sm" variant="secondary" onClick={() => setOfferOpen(true)}>
                <Plus className="size-4" /> Record offer
              </Button>
            )}
            {canWithdraw && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                disabled={transitionMutation.isPending}
                onClick={() => transitionMutation.mutate("withdrawn")}
              >
                Withdraw
              </Button>
            )}
          </div>
        )}
      </div>

      {app.applicant && <ApplicantDetails applicant={app.applicant} />}

      {app.kind === "scholarship" && app.preferences.length > 0 && (
        <section className="rounded-xl border bg-card shadow-sm">
          <header className="border-b px-5 py-3">
            <h3 className="text-[15px] font-semibold">Major / university preferences</h3>
          </header>
          <ol className="divide-y">
            {app.preferences.map((p, i) => (
              <li key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium">{i + 1}. {p.major ?? "—"}</span>
                <span className="text-muted-foreground">{p.university ?? "Any university"}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Checklist */}
        <section className="rounded-xl border bg-card shadow-sm">
          <header className="border-b px-5 py-3">
            <h3 className="text-[15px] font-semibold">Document checklist</h3>
          </header>
          <div className="divide-y px-5">
            {requiredTypes.map((type) => {
              const doc = latestByType.get(type.id)
              const status = doc?.status ?? "missing"

              return (
                <div key={type.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {type.name}
                      {type.is_sensitive && (
                        <span className="ml-2 text-xs text-cas-red">sensitive</span>
                      )}
                    </p>
                    {doc && <p className="text-xs text-muted-foreground">{doc.file_name} · v{doc.version}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={cn("border-transparent capitalize", DOCUMENT_STATUS_BADGE[status])}>
                      {status}
                    </Badge>
                    {doc && (
                      <Button
                        size="sm" variant="ghost" aria-label={`Download ${type.name}`}
                        onClick={() => documentAction.mutate({ action: "download", docId: doc.id })}
                      >
                        <Download className="size-4" />
                      </Button>
                    )}
                    {doc && canVerify && doc.status === "pending" && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => documentAction.mutate({ action: "verify", docId: doc.id })}>
                          Verify
                        </Button>
                        <Button size="sm" variant="ghost" className="text-cas-red" onClick={() => documentAction.mutate({ action: "reject", docId: doc.id })}>
                          Reject
                        </Button>
                      </>
                    )}
                    {canUpload && (
                      <Button
                        size="sm" variant="secondary"
                        disabled={uploadMutation.isPending}
                        onClick={() => triggerUpload(type.id)}
                      >
                        <FileUp className="size-4" />
                        {uploadMutation.isPending && uploadTypeId === type.id ? "Uploading…" : doc ? "Replace" : "Upload"}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
            {requiredTypes.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">No required document types configured.</p>
            )}

            {otherDocs.length > 0 && (
              <div className="py-3">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Other uploaded documents</p>
                <div className="divide-y">
                  {otherDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{doc.type?.name ?? "Document"}</p>
                        <p className="text-xs text-muted-foreground">{doc.file_name} · v{doc.version}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={cn("border-transparent capitalize", DOCUMENT_STATUS_BADGE[doc.status])}>
                          {doc.status}
                        </Badge>
                        <Button
                          size="sm" variant="ghost" aria-label={`Download ${doc.type?.name ?? doc.file_name}`}
                          onClick={() => documentAction.mutate({ action: "download", docId: doc.id })}
                        >
                          <Download className="size-4" />
                        </Button>
                        {canVerify && doc.status === "pending" && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => documentAction.mutate({ action: "verify", docId: doc.id })}>Verify</Button>
                            <Button size="sm" variant="ghost" className="text-cas-red" onClick={() => documentAction.mutate({ action: "reject", docId: doc.id })}>Reject</Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Offers + history */}
        <div className="space-y-4">
          <section className="rounded-xl border bg-card shadow-sm">
            <header className="border-b px-5 py-3">
              <h3 className="text-[15px] font-semibold">Offers</h3>
            </header>
            <div className="px-5 py-4">
              {(app.offers?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">No offers recorded yet.</p>
              )}
              {app.offers?.map((offer) => (
                <div key={offer.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium capitalize">{offer.offer_type}</span>
                    <Badge
                      variant="outline"
                      className={cn("ml-2 border-transparent capitalize", OFFER_STATUS_BADGE[offer.status] ?? "bg-muted text-muted-foreground")}
                    >
                      {offer.status}
                    </Badge>
                    <span className="ml-2 text-muted-foreground">
                      {offer.reference_no ?? "—"}{offer.expiry_date ? ` · expires ${offer.expiry_date}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {canUpdate && offer.status === "issued" && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={offerRespond.isPending}
                          onClick={() => offerRespond.mutate({ offerId: offer.id, decision: "accepted" })}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-cas-red"
                          disabled={offerRespond.isPending}
                          onClick={() => offerRespond.mutate({ offerId: offer.id, decision: "declined" })}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={offerLetter.isPending}
                      onClick={() => offerLetter.mutate(offer.id)}
                    >
                      <FileText className="size-4" />
                      {offerLetter.isPending && offerLetter.variables === offer.id ? "Preparing…" : "Letter"}
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card shadow-sm">
            <header className="border-b px-5 py-3">
              <h3 className="text-[15px] font-semibold">History</h3>
            </header>
            <ol className="divide-y px-5">
              {app.status_history?.map((entry, index) => (
                <li key={index} className="py-2.5 text-sm">
                  <p className="capitalize">
                    {entry.from_status ? `${statusLabel(entry.from_status)} → ` : ""}
                    <span className="font-medium">{statusLabel(entry.to_status)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.changed_by ?? "System"}
                    {entry.created_at ? ` · ${new Date(entry.created_at).toLocaleString()}` : ""}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {/* Record offer dialog */}
      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Offer type</Label>
              <Select value={offerType} onValueChange={setOfferType}>
                <SelectTrigger aria-label="Offer type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conditional">Conditional</SelectItem>
                  <SelectItem value="unconditional">Unconditional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offer-ref">Reference no.</Label>
              <Input id="offer-ref" value={offerRef} onChange={(e) => setOfferRef(e.target.value)} placeholder="OFR-2026-…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOfferOpen(false)}>Cancel</Button>
            <Button disabled={offerMutation.isPending} onClick={() => offerMutation.mutate()}>
              {offerMutation.isPending ? "Saving…" : "Record offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign admissions officer */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reassign admissions officer</DialogTitle>
          </DialogHeader>

          <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
            <SelectTrigger aria-label="Select admissions officer">
              <SelectValue placeholder={officers.isPending ? "Loading officers…" : "Select an officer"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Unassigned</SelectItem>
              {(officers.data?.data ?? []).map((officer) => (
                <SelectItem key={officer.id} value={String(officer.id)}>
                  {officer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button disabled={reassignMutation.isPending} onClick={() => reassignMutation.mutate()}>
              {reassignMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
