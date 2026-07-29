import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Clock, Info, Loader2, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getProcessingFee, uploadFeeReceipt, type ProcessingFeeInvoice } from "@/features/portal/api"
import { PortalCard } from "@/features/portal/components"
import { money } from "@/features/portal/status"
import { ApiError } from "@/lib/api"

/**
 * Told up front, before any work is done: funded study carries a one-time,
 * non-refundable CAS processing fee, and it is NOT the university's own
 * application fee. Acknowledgement is explicit — the student cannot drift past
 * it — and the notice is shown once per wizard run.
 */
export function ProcessingFeeNotice({ open, onAcknowledge, onCancel }: {
  open: boolean
  onAcknowledge: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const { data } = useQuery({ queryKey: ["student", "processing-fee"], queryFn: getProcessingFee })

  const fee = data?.data.fee
  const settled = data?.data.settled ?? false
  const amount = fee ? money(fee.amount, fee.currency) : "—"

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cas-navy">
            {settled ? t("fee.noticeTitleSettled") : t("fee.noticeTitle", { amount })}
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2 text-start">
            {settled ? (
              <span className="block">{t("fee.noticeSettledBody")}</span>
            ) : (
              <>
                <span className="block">{t("fee.noticeBody", { amount })}</span>
                <span className="flex items-start gap-2 rounded-lg bg-cas-navy-50 px-3 py-2 text-cas-navy">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{t("fee.noticeSeparate")}</span>
                </span>
                <span className="block">{t("fee.noticeWhen")}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>{t("fee.noticeCancel")}</Button>
          <Button type="button" onClick={onAcknowledge}>
            {settled ? t("fee.noticeContinue") : t("fee.noticeAcknowledge")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Shown when submit came back with PROCESSING_FEE_DUE: what is owed, how to
 * pay it, and where to file the proof. Uploading does not submit — Finance
 * confirms the payment and the application is then released automatically,
 * which the waiting state says plainly rather than leaving the student
 * wondering whether anything happened.
 */
export function ProcessingFeeStep({ invoice }: { invoice: ProcessingFeeInvoice }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const state = useQuery({ queryKey: ["student", "processing-fee"], queryFn: getProcessingFee })
  const live = state.data?.data.invoice ?? invoice
  const instructions = state.data?.data.instructions ?? null
  const receipts = live.receipts ?? []

  const upload = useMutation({
    mutationFn: (file: File) => uploadFeeReceipt(live.id, file),
    onSuccess: () => {
      setError(null)
      if (fileRef.current) fileRef.current.value = ""
      queryClient.invalidateQueries({ queryKey: ["student", "processing-fee"] })
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : t("fee.uploadFailed")),
  })

  if (state.data?.data.settled) {
    return (
      <PortalCard className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">{t("fee.settledTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("fee.settledBody")}</p>
        </div>
      </PortalCard>
    )
  }

  return (
    <div className="space-y-3">
      <PortalCard className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            {t("fee.invoiceLabel")}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{live.invoice_no}</p>
        </div>

        <p className="text-2xl font-semibold tabular-nums text-cas-navy">
          {money(live.total, live.currency)}
        </p>
        <p className="text-sm text-muted-foreground">{t("fee.stepBody")}</p>

        {instructions ? (
          <div className="rounded-lg bg-subtle p-3">
            <p className="mb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              {t("fee.howToPay")}
            </p>
            <p className="text-sm whitespace-pre-line">{instructions}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t("fee.quoteReference", { reference: live.invoice_no })}</p>
          </div>
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-warning">{t("fee.noInstructions")}</p>
        )}
      </PortalCard>

      {receipts.length > 0 && (
        <PortalCard className="space-y-2">
          <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{t("fee.receiptsLabel")}</p>
          {receipts.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-sm">
              <Clock className="size-4 shrink-0 text-warning" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{r.file_name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{t("fee.awaitingConfirmation")}</span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{t("fee.awaitingBody")}</p>
        </PortalCard>
      )}

      {error && <p role="alert" className="rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload.mutate(file)
        }}
      />
      <Button
        type="button"
        className="h-11 w-full"
        disabled={upload.isPending}
        onClick={() => fileRef.current?.click()}
      >
        {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {upload.isPending
          ? t("fee.uploading")
          : receipts.length > 0 ? t("fee.uploadAnother") : t("fee.uploadReceipt")}
      </Button>
    </div>
  )
}
