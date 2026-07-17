import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Check, Download, FileUp, Plus } from "lucide-react"
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
  listApplicationDocuments,
  listDocumentTypes,
  rejectDocument,
  storeOffer,
  transitionApplication,
  uploadDocument,
  verifyDocument,
  type DocumentItem,
} from "@/features/admissions/api"
import {
  APPLICATION_LADDER,
  APPLICATION_STATUS_BADGE,
  APPLICATION_TRANSITIONS,
  DOCUMENT_STATUS_BADGE,
  statusLabel,
} from "@/features/admissions/status"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const application = useQuery({ queryKey: ["application", id], queryFn: () => getApplication(id) })
  const documents = useQuery({ queryKey: ["application-documents", id], queryFn: () => listApplicationDocuments(id) })
  const types = useQuery({ queryKey: ["document-types"], queryFn: listDocumentTypes })

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
  const requiredTypes = (types.data?.data ?? []).filter((type) =>
    type.required_for?.includes("application"),
  )

  const latestByType = new Map<number, DocumentItem>()
  for (const doc of docs) {
    if (doc.type && (latestByType.get(doc.type.id)?.version ?? 0) < doc.version) {
      latestByType.set(doc.type.id, doc)
    }
  }

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
            <h2 className="mt-1 text-2xl font-semibold text-cas-navy">{app.application_code}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {app.student && (
                <Link to={`/students/${app.student.id}`} className="text-cas-navy hover:underline">
                  {app.student.full_name}
                </Link>
              )}
              {" · "}{app.program?.name} at {app.university?.name}
              {app.intake ? ` · ${app.intake.name}` : ""}
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
                <div key={offer.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="font-medium capitalize">{offer.offer_type}</span>
                  <span className="text-muted-foreground">
                    {offer.reference_no ?? "—"}{offer.expiry_date ? ` · expires ${offer.expiry_date}` : ""}
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
    </div>
  )
}
